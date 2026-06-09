import { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { RiAddLine, RiDeleteBinLine, RiSaveLine, RiFileExcel2Line, RiInformationLine, RiArrowDownSLine, RiArrowUpSLine, RiUpload2Line } from 'react-icons/ri';

// ─── Panduan Skala Penilaian 1–10 per Sub-Kriteria ──────────────────────
const SCALE_GUIDE = {
  'Lubang-Lubang': {
    group: 'Kondisi Jalan',
    low: 'Sangat sedikit / hampir tidak ada lubang',
    high: 'Sangat parah, lubang dimana-mana',
    desc: 'Semakin tinggi nilai = kondisi lubang semakin parah, berarti semakin perlu diperbaiki.',
  },
  'Lenggokan / Amblas': {
    group: 'Kondisi Jalan',
    low: 'Permukaan rata, tidak ada amblas',
    high: 'Sangat amblas / berlubang dalam',
    desc: 'Semakin tinggi nilai = permukaan jalan semakin amblas/lenggokan parah.',
  },
  'Bahu Jalan': {
    group: 'Kondisi Jalan',
    low: 'Bahu jalan sangat sempit / buruk',
    high: 'Bahu jalan sangat lebar / kondisi baik',
    desc: 'Semakin tinggi nilai = bahu jalan semakin baik (lebar dan layak).',
  },
  'Kemiringan Jalan': {
    group: 'Kondisi Jalan',
    low: 'Datar / tidak miring',
    high: 'Sangat miring / curam',
    desc: 'Semakin tinggi nilai = kemiringan jalan semakin curam.',
  },
  'Truk Ringan': {
    group: 'Volume Lalu Lintas',
    low: 'Sangat sedikit truk ringan lewat',
    high: 'Sangat banyak / padat truk ringan',
    desc: 'Semakin tinggi nilai = frekuensi truk ringan semakin tinggi.',
  },
  'Truk Sedang dan Berat': {
    group: 'Volume Lalu Lintas',
    low: 'Sangat sedikit truk sedang/berat lewat',
    high: 'Sangat banyak / padat truk sedang/berat',
    desc: 'Semakin tinggi nilai = frekuensi truk sedang & berat semakin tinggi.',
  },
  'Mobil Roda 4': {
    group: 'Volume Lalu Lintas',
    low: 'Sangat sedikit mobil roda 4 lewat',
    high: 'Sangat banyak / padat mobil roda 4',
    desc: 'Semakin tinggi nilai = frekuensi mobil roda 4 semakin tinggi.',
  },
  'Sepeda Motor': {
    group: 'Volume Lalu Lintas',
    low: 'Sangat sedikit sepeda motor lewat',
    high: 'Sangat banyak / padat sepeda motor',
    desc: 'Semakin tinggi nilai = frekuensi sepeda motor semakin tinggi.',
  },
  'Bidang Pertanian': {
    group: 'Tata Guna Lahan',
    low: 'Tidak ada / sangat sedikit lahan pertanian',
    high: 'Sangat dominan, mayoritas lahan pertanian',
    desc: 'Semakin tinggi nilai = fungsi pertanian di sekitar jalan semakin dominan.',
  },
  'Bidang Pendidikan': {
    group: 'Tata Guna Lahan',
    low: 'Tidak ada / sangat sedikit fasilitas pendidikan',
    high: 'Sangat dominan, banyak sekolah/kampus',
    desc: 'Semakin tinggi nilai = fungsi pendidikan di sekitar jalan semakin dominan.',
  },
  'Bidang Sosial-Budaya': {
    group: 'Tata Guna Lahan',
    low: 'Tidak ada / sangat sedikit fasilitas sosial-budaya',
    high: 'Sangat dominan, banyak fasilitas sosial/budaya',
    desc: 'Semakin tinggi nilai = fungsi sosial-budaya di sekitar jalan semakin dominan.',
  },
  'Bidang Perdagangan-Jasa': {
    group: 'Tata Guna Lahan',
    low: 'Tidak ada / sangat sedikit aktivitas perdagangan',
    high: 'Sangat dominan, pusat perdagangan/jasa utama',
    desc: 'Semakin tinggi nilai = fungsi perdagangan-jasa di sekitar jalan semakin dominan.',
  },
};

const SCALE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function AlternativesPage() {
  const { canEdit } = useAuth();
  const [projectId, setProjectId] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [alternatives, setAlternatives] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newAlt, setNewAlt] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const pRes = await client.get('/projects/');
      if (pRes.data.length > 0) {
        const pid = pRes.data[0].id;
        setProjectId(pid);
        const [cRes, aRes] = await Promise.all([
          client.get(`/projects/${pid}/criteria/`),
          client.get(`/projects/${pid}/alternatives/`),
        ]);
        setCriteria(cRes.data);
        setAlternatives(aRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const allSubCriteria = criteria.flatMap(c =>
    (c.sub_criteria || []).map(sc => ({ ...sc, criteriaName: c.name }))
  );

  const handleScoreChange = (altIdx, subId, value) => {
    setAlternatives(prev => {
      const updated = [...prev];
      if (!updated[altIdx].scores) updated[altIdx].scores = {};
      updated[altIdx].scores[subId] = parseFloat(value) || 0;
      return updated;
    });
  };

  const handleAddAlternative = async () => {
    if (!newAlt.name.trim()) return;
    try {
      const res = await client.post(`/projects/${projectId}/alternatives/`, newAlt);
      setAlternatives(prev => [...prev, res.data]);
      setNewAlt({ name: '', description: '' });
      setShowModal(false);
    } catch (err) {
      alert('Gagal menambah: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDelete = async (altId) => {
    if (!confirm('Hapus alternatif ini?')) return;
    try {
      await client.delete(`/projects/${projectId}/alternatives/${altId}`);
      setAlternatives(prev => prev.filter(a => a.id !== altId));
    } catch (err) {
      alert('Gagal menghapus: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSaveScores = async () => {
    setSaving(true);
    try {
      const payload = alternatives.map(alt => ({
        alternative_id: alt.id,
        scores: Object.entries(alt.scores || {}).map(([subId, score]) => ({
          subcriteria_id: parseInt(subId),
          score: parseFloat(score) || 0,
        })),
      }));
      await client.post(`/projects/${projectId}/alternatives/scores`, payload);
      alert('Skor berhasil disimpan!');
    } catch (err) {
      alert('Gagal menyimpan: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  // ─── Import ───────────────────────────────────────────────────────────
  const handleImportFile = async () => {
    if (!selectedFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await client.post(`/projects/${projectId}/import/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert(res.data.detail);
      setShowImportModal(false);
      setSelectedFile(null);
      // Reload data
      const aRes = await client.get(`/projects/${projectId}/alternatives/`);
      setAlternatives(aRes.data);
    } catch (err) {
      alert('Gagal import: ' + (err.response?.data?.detail || err.message));
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <div className="page-body text-center text-muted">Memuat data...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Data Alternatif</h1>
          <p>Input dan kelola data ruas jalan beserta skor per sub-kriteria</p>
        </div>
        <div className="page-header-actions">
          {canEdit && (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => setShowImportModal(true)}>
                <RiFileExcel2Line /> Import Data
              </button>
              <button className="btn btn-outline btn-sm" onClick={handleSaveScores} disabled={saving}>
                <RiSaveLine /> {saving ? 'Menyimpan...' : 'Simpan Skor'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                <RiAddLine /> Tambah Alternatif
              </button>
            </>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* ─── Panduan Skala Penilaian ───────────────────────────────── */}
        <div className="card mb-6 animate-in">
          <div
            className="card-header"
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setShowGuide(!showGuide)}
          >
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RiInformationLine style={{ color: 'var(--navy-500)' }} />
              Panduan Skala Penilaian (1–10)
            </h3>
            <button className="btn btn-sm btn-outline" style={{ padding: '4px 8px' }}>
              {showGuide ? <RiArrowUpSLine size={18} /> : <RiArrowDownSLine size={18} />}
            </button>
          </div>
          {showGuide && (
            <div className="card-body animate-in" style={{ padding: 0 }}>
              <div style={{
                padding: 'var(--space-4) var(--space-5)',
                background: 'linear-gradient(135deg, var(--navy-50), var(--slate-50))',
                borderBottom: '1px solid var(--slate-200)',
                fontSize: '0.85rem',
                color: 'var(--slate-600)',
              }}>
                <strong>Cara membaca:</strong> Angka <strong>1</strong> = kondisi paling rendah/sedikit, angka <strong>10</strong> = kondisi paling tinggi/parah.
                Untuk <em>Kondisi Jalan</em>: semakin tinggi berarti kerusakan semakin parah.
                Untuk <em>Volume Lalu Lintas</em>: semakin tinggi berarti semakin padat.
                Untuk <em>Tata Guna Lahan</em>: semakin tinggi berarti peruntukannya semakin dominan.
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, background: 'var(--navy-800)', zIndex: 2, minWidth: '180px' }}>Sub-Kriteria</th>
                      <th style={{ textAlign: 'center', minWidth: '80px' }}>Kelompok</th>
                      <th style={{ textAlign: 'center', minWidth: '220px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <span style={{
                            background: 'var(--success-500)', color: '#fff', borderRadius: '50%',
                            width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700,
                          }}>1</span>
                          Nilai Rendah
                        </span>
                      </th>
                      <th style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', background: 'linear-gradient(90deg, var(--success-400), var(--warning-400), var(--danger-400))',
                          borderRadius: '10px', padding: '2px 12px', fontSize: '0.75rem', color: '#fff',
                        }}>
                          Skala 1 → 10
                        </span>
                      </th>
                      <th style={{ textAlign: 'center', minWidth: '220px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <span style={{
                            background: 'var(--danger-500)', color: '#fff', borderRadius: '50%',
                            width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700,
                          }}>10</span>
                          Nilai Tinggi
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSubCriteria.map(sc => {
                      const guide = SCALE_GUIDE[sc.name] || {};
                      return (
                        <tr key={sc.id}>
                          <td style={{
                            position: 'sticky', left: 0, background: '#fff', fontWeight: 600,
                            zIndex: 1, borderRight: '2px solid var(--slate-200)',
                          }}>
                            {sc.name}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge" style={{
                              fontSize: '0.68rem',
                              background: guide.group === 'Kondisi Jalan' ? 'var(--warning-100)' :
                                guide.group === 'Volume Lalu Lintas' ? 'var(--navy-100)' : 'var(--success-100)',
                              color: guide.group === 'Kondisi Jalan' ? 'var(--warning-700)' :
                                guide.group === 'Volume Lalu Lintas' ? 'var(--navy-700)' : 'var(--success-700)',
                            }}>
                              {guide.group || sc.criteriaName?.replace('Faktor ', '')}
                            </span>
                          </td>
                          <td style={{
                            fontSize: '0.84rem', color: 'var(--success-700)', textAlign: 'center',
                            background: 'var(--success-50)',
                          }}>
                            {guide.low || '-'}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                            {guide.desc || '-'}
                          </td>
                          <td style={{
                            fontSize: '0.84rem', color: 'var(--danger-700)', textAlign: 'center',
                            background: 'var(--danger-50)',
                          }}>
                            {guide.high || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ─── Matriks Keputusan ─────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <h3>Matriks Keputusan (X)</h3>
            <span className="badge badge-navy">{alternatives.length} Alternatif × {allSubCriteria.length} Sub-Kriteria</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', left: 0, background: 'var(--navy-800)', zIndex: 2 }}>Ruas Jalan</th>
                    {allSubCriteria.map(sc => (
                      <th key={sc.id} title={`${sc.criteriaName} — ${sc.name}`} style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span>{sc.name}</span>
                          <span style={{
                            fontSize: '0.6rem', opacity: 0.7, fontWeight: 400,
                          }}>
                            (1-10)
                          </span>
                        </div>
                      </th>
                    ))}
                    {canEdit && <th style={{ textAlign: 'center' }}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {alternatives.map((alt, idx) => (
                    <tr key={alt.id}>
                      <td style={{
                        position: 'sticky', left: 0, background: '#fff',
                        fontWeight: 600, zIndex: 1, borderRight: '2px solid var(--slate-200)',
                      }}>
                        {alt.name}
                      </td>
                      {allSubCriteria.map(sc => (
                        <td key={sc.id} style={{ textAlign: 'center' }}>
                          {canEdit ? (
                            <input
                              type="number"
                              className="matrix-input"
                              style={{ width: '60px' }}
                              min="1"
                              max="10"
                              step="1"
                              value={alt.scores?.[sc.id] ?? ''}
                              onChange={(e) => handleScoreChange(idx, sc.id, e.target.value)}
                            />
                          ) : (
                            <span>{alt.scores?.[sc.id] ?? '-'}</span>
                          )}
                        </td>
                      ))}
                      {canEdit && (
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(alt.id)}
                            title="Hapus"
                            style={{ padding: '4px 8px' }}
                          >
                            <RiDeleteBinLine />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {alternatives.length === 0 && (
                    <tr>
                      <td colSpan={allSubCriteria.length + 2} className="text-center text-muted" style={{ padding: 'var(--space-8)' }}>
                        Belum ada alternatif. Klik "Tambah Alternatif" untuk memulai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Add Alternative */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Alternatif Baru</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nama Ruas Jalan</label>
                <input
                  className="form-input"
                  placeholder="contoh: Jalan Ahmad Yani"
                  value={newAlt.name}
                  onChange={e => setNewAlt(p => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Deskripsi (opsional)</label>
                <input
                  className="form-input"
                  placeholder="Keterangan lokasi atau kondisi jalan"
                  value={newAlt.description}
                  onChange={e => setNewAlt(p => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleAddAlternative}>Tambah</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Data */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => { setShowImportModal(false); setSelectedFile(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>📥 Import Data Alternatif</h3>
              <button className="modal-close" onClick={() => { setShowImportModal(false); setSelectedFile(null); }}>×</button>
            </div>
            <div className="modal-body">
              <div style={{
                background: 'linear-gradient(135deg, var(--navy-50), var(--slate-50))',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-4)',
                fontSize: '0.84rem',
                color: 'var(--slate-600)',
                lineHeight: 1.6,
              }}>
                <strong>Format yang didukung:</strong>
                <ul style={{ margin: 'var(--space-2) 0 0 var(--space-4)', padding: 0 }}>
                  <li><strong>.xlsx</strong> (Excel) — Kolom pertama: nama jalan, kolom lain: nama sub-kriteria</li>
                  <li><strong>.csv</strong> — Format sama dengan Excel, dipisahkan koma</li>
                  <li><strong>.json</strong> — Array of objects: <code style={{ fontSize: '0.75rem' }}>{'[{name, scores: {...}}]'}</code></li>
                </ul>
                <p style={{ margin: 'var(--space-2) 0 0', fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                  💡 Header kolom harus sesuai dengan nama sub-kriteria (misal: "Lubang-Lubang", "Truk Ringan", dll.)
                </p>
              </div>

              <div
                style={{
                  border: `2px dashed ${selectedFile ? 'var(--success-400)' : 'var(--slate-300)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-6)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: selectedFile ? 'var(--success-50)' : 'var(--slate-50)',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files[0];
                  if (file) setSelectedFile(file);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) setSelectedFile(file);
                  }}
                />
                {selectedFile ? (
                  <div>
                    <RiFileExcel2Line size={32} style={{ color: 'var(--success-600)', marginBottom: '8px' }} />
                    <p style={{ fontWeight: 600, color: 'var(--success-700)' }}>{selectedFile.name}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB — Klik untuk ganti file
                    </p>
                  </div>
                ) : (
                  <div>
                    <RiUpload2Line size={32} style={{ color: 'var(--slate-400)', marginBottom: '8px' }} />
                    <p style={{ fontWeight: 600, color: 'var(--slate-600)' }}>Klik atau drag file ke sini</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--slate-400)' }}>
                      Mendukung .xlsx, .csv, .json
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setShowImportModal(false); setSelectedFile(null); }}>
                Batal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImportFile}
                disabled={!selectedFile || importing}
              >
                {importing ? 'Mengimport...' : '📥 Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
