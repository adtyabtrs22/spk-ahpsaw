import { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { RiAddLine, RiDeleteBinLine, RiSaveLine } from 'react-icons/ri';

export default function AlternativesPage() {
  const { canEdit } = useAuth();
  const [projectId, setProjectId] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [alternatives, setAlternatives] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newAlt, setNewAlt] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
                      <th key={sc.id} title={sc.criteriaName} style={{ textAlign: 'center' }}>
                        {sc.name}
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
                              min="0"
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
    </div>
  );
}
