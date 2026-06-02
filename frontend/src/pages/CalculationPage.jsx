import { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { RiPlayCircleLine, RiCheckboxCircleLine } from 'react-icons/ri';

export default function CalculationPage() {
  const { canEdit } = useAuth();
  const [projectId, setProjectId] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [activeSection, setActiveSection] = useState('weights');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const pRes = await client.get('/projects/');
      if (pRes.data.length > 0) {
        const pid = pRes.data[0].id;
        setProjectId(pid);
        try {
          const rRes = await client.get(`/projects/${pid}/calculate/results`);
          setResults(rRes.data);
        } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runCalculation = async () => {
    setCalculating(true);
    try {
      const res = await client.post(`/projects/${projectId}/calculate/`);
      setResults(res.data);
    } catch (err) {
      alert('Gagal menghitung: ' + (err.response?.data?.detail || err.message));
    } finally {
      setCalculating(false);
    }
  };

  if (loading) return <div className="page-body text-center text-muted">Memuat data...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Hasil Perhitungan AHP-SAW</h1>
          <p>Lihat detail bobot, normalisasi, dan nilai preferensi</p>
        </div>
        <div className="page-header-actions">
          {canEdit && (
            <button className="btn btn-gold btn-sm" onClick={runCalculation} disabled={calculating}>
              <RiPlayCircleLine /> {calculating ? 'Menghitung...' : 'Jalankan Perhitungan'}
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {!results ? (
          <div className="card">
            <div className="card-body text-center" style={{ padding: 'var(--space-16)' }}>
              <RiPlayCircleLine style={{ fontSize: '3rem', color: 'var(--slate-300)', marginBottom: 'var(--space-4)' }} />
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Belum Ada Hasil</h3>
              <p className="text-muted">Klik "Jalankan Perhitungan" untuk memulai kalkulasi AHP-SAW</p>
            </div>
          </div>
        ) : (
          <>
            {/* Section Tabs */}
            <div className="tabs" style={{ maxWidth: '600px' }}>
              <button className={`tab ${activeSection === 'weights' ? 'active' : ''}`} onClick={() => setActiveSection('weights')}>
                Bobot AHP
              </button>
              <button className={`tab ${activeSection === 'consistency' ? 'active' : ''}`} onClick={() => setActiveSection('consistency')}>
                Konsistensi
              </button>
              <button className={`tab ${activeSection === 'normalized' ? 'active' : ''}`} onClick={() => setActiveSection('normalized')}>
                Normalisasi SAW
              </button>
              <button className={`tab ${activeSection === 'preference' ? 'active' : ''}`} onClick={() => setActiveSection('preference')}>
                Nilai Preferensi
              </button>
            </div>

            {/* Weights Section */}
            {activeSection === 'weights' && (
              <div className="grid-2 animate-in">
                <div className="card">
                  <div className="card-header"><h3>Bobot Kriteria</h3></div>
                  <div className="card-body">
                    <div className="bar-chart">
                      {Object.entries(results.criteria_weights || {}).map(([id, c]) => (
                        <div key={id} className="bar-item">
                          <div className="bar-label">{c.name?.replace('Faktor ', '')}</div>
                          <div className="bar-track">
                            <div className="bar-fill navy" style={{ width: `${(c.weight || 0) * 100}%` }}>
                              {((c.weight || 0) * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div className="bar-value">{(c.weight || 0).toFixed(4)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header"><h3>Bobot Global Sub-Kriteria</h3></div>
                  <div className="card-body">
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Sub-Kriteria</th>
                            <th>Bobot Lokal</th>
                            <th>Bobot Global</th>
                            <th>Tipe</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(results.subcriteria_weights || {}).map(([id, s]) => (
                            <tr key={id}>
                              <td style={{ fontWeight: 600 }}>{s.name}</td>
                              <td>{(s.weight_local || 0).toFixed(4)}</td>
                              <td style={{ fontWeight: 700, color: 'var(--navy-700)' }}>
                                {(s.weight_global || 0).toFixed(6)}
                              </td>
                              <td><span className="badge badge-success">{s.criteria_type}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Consistency Section */}
            {activeSection === 'consistency' && (
              <div className="card animate-in">
                <div className="card-header"><h3>Uji Konsistensi Semua Matriks</h3></div>
                <div className="card-body">
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Matriks</th>
                          <th>λ max</th>
                          <th>CI</th>
                          <th>RI</th>
                          <th>CR</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(results.consistency_results || {}).map(([key, c]) => (
                          <tr key={key}>
                            <td style={{ fontWeight: 600 }}>
                              {key === 'criteria' ? 'Kriteria Utama' : key.replace('subcriteria_', 'Sub-Kriteria #')}
                            </td>
                            <td>{c.lambda_max?.toFixed(4)}</td>
                            <td>{c.ci?.toFixed(6)}</td>
                            <td>{c.ri}</td>
                            <td style={{ fontWeight: 700 }}>{c.cr?.toFixed(6)}</td>
                            <td>
                              <span className={`badge ${c.is_consistent ? 'badge-success' : 'badge-danger'}`}>
                                {c.is_consistent ? '✔ Konsisten' : '✘ Tidak Konsisten'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Normalized Matrix Section */}
            {activeSection === 'normalized' && (
              <div className="card animate-in">
                <div className="card-header"><h3>Matriks Ternormalisasi (R)</h3></div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ position: 'sticky', left: 0, background: 'var(--navy-800)', zIndex: 2 }}>Alternatif</th>
                          {Object.entries(results.subcriteria_weights || {}).map(([id, s]) => (
                            <th key={id} style={{ textAlign: 'center' }}>{s.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(results.rankings || []).map(r => (
                          <tr key={r.alternative_id}>
                            <td style={{
                              position: 'sticky', left: 0, background: '#fff',
                              fontWeight: 600, zIndex: 1, borderRight: '2px solid var(--slate-200)',
                            }}>
                              {r.alternative_name}
                            </td>
                            {Object.keys(results.subcriteria_weights || {}).map(subId => (
                              <td key={subId} style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                {(r.normalized_scores?.[subId] || 0).toFixed(4)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Preference Values Section */}
            {activeSection === 'preference' && (
              <div className="card animate-in">
                <div className="card-header"><h3>Nilai Preferensi (Vi) = Σ (Wj × Rij)</h3></div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ position: 'sticky', left: 0, background: 'var(--navy-800)', zIndex: 2 }}>Alternatif</th>
                          {Object.entries(results.subcriteria_weights || {}).map(([id, s]) => (
                            <th key={id} style={{ textAlign: 'center', fontSize: '0.7rem' }}>W×R ({s.name})</th>
                          ))}
                          <th style={{ textAlign: 'center' }}>Vi</th>
                          <th style={{ textAlign: 'center' }}>Rank</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(results.rankings || []).map(r => (
                          <tr key={r.alternative_id}>
                            <td style={{
                              position: 'sticky', left: 0, background: '#fff',
                              fontWeight: 600, zIndex: 1, borderRight: '2px solid var(--slate-200)',
                            }}>
                              {r.alternative_name}
                            </td>
                            {Object.keys(results.subcriteria_weights || {}).map(subId => (
                              <td key={subId} style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                                {(r.weighted_scores?.[subId] || 0).toFixed(6)}
                              </td>
                            ))}
                            <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--navy-700)', fontSize: '1rem' }}>
                              {r.preference_value?.toFixed(6)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`rank-badge rank-${r.rank <= 3 ? r.rank : 'other'}`}>
                                {r.rank}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
