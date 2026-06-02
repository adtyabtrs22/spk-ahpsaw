import { useState, useEffect } from 'react';
import client from '../api/client';
import { RiTrophyLine } from 'react-icons/ri';

export default function RankingPage() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadResults(); }, []);

  const loadResults = async () => {
    try {
      const pRes = await client.get('/projects/');
      if (pRes.data.length > 0) {
        const rRes = await client.get(`/projects/${pRes.data[0].id}/calculate/results`);
        setResults(rRes.data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page-body text-center text-muted">Memuat data...</div>;

  const rankings = results?.rankings || [];
  const maxPref = rankings.length > 0 ? Math.max(...rankings.map(r => r.preference_value)) : 1;

  const statusLabel = (rank) => {
    if (rank === 1) return '🥇 PRIORITAS UTAMA';
    if (rank === 2) return '🥈 PRIORITAS KEDUA';
    if (rank === 3) return '🥉 PRIORITAS KETIGA';
    return `Prioritas ${rank}`;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Perangkingan Prioritas</h1>
          <p>Hasil akhir prioritas lokasi perbaikan jalan berdasarkan metode AHP-SAW</p>
        </div>
      </div>

      <div className="page-body">
        {!results || rankings.length === 0 ? (
          <div className="card">
            <div className="card-body text-center" style={{ padding: 'var(--space-16)' }}>
              <RiTrophyLine style={{ fontSize: '3rem', color: 'var(--slate-300)', marginBottom: 'var(--space-4)' }} />
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Belum Ada Hasil Ranking</h3>
              <p className="text-muted">Jalankan perhitungan terlebih dahulu di halaman Hasil Perhitungan</p>
            </div>
          </div>
        ) : (
          <>
            {/* Ranking Cards */}
            <div className="stat-grid mb-8">
              {rankings.slice(0, 3).map((r, idx) => (
                <div
                  key={r.alternative_id}
                  className="stat-card animate-in"
                  style={{
                    border: idx === 0 ? '2px solid var(--gold-500)' : '1px solid var(--slate-200)',
                    background: idx === 0 ? 'linear-gradient(135deg, rgba(212, 168, 67, 0.04), rgba(212, 168, 67, 0.01))' : '#fff',
                  }}
                >
                  <span className={`rank-badge rank-${r.rank}`}>{r.rank}</span>
                  <div style={{ flex: 1 }}>
                    <h4 style={{
                      fontSize: idx === 0 ? '1.1rem' : '1rem',
                      marginBottom: '4px',
                    }}>
                      {r.alternative_name}
                    </h4>
                    <p className="text-sm text-muted">{statusLabel(r.rank)}</p>
                    <p style={{
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      color: 'var(--navy-700)',
                      marginTop: '4px',
                    }}>
                      {r.preference_value?.toFixed(6)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Full Ranking Bar Chart */}
            <div className="card mb-6 animate-in">
              <div className="card-header">
                <h3>Visualisasi Nilai Preferensi</h3>
              </div>
              <div className="card-body">
                <div className="bar-chart">
                  {rankings.map((r, idx) => {
                    const pct = (r.preference_value / maxPref) * 100;
                    const colors = ['gold', 'navy', 'navy', 'navy', 'navy'];
                    return (
                      <div key={r.alternative_id} className="bar-item">
                        <div className="bar-label">
                          <span className={`rank-badge rank-${r.rank <= 3 ? r.rank : 'other'}`} style={{
                            width: '28px', height: '28px', fontSize: '0.78rem', marginRight: '8px',
                            display: 'inline-flex',
                          }}>
                            {r.rank}
                          </span>
                          {r.alternative_name}
                        </div>
                        <div className="bar-track">
                          <div
                            className={`bar-fill ${colors[idx] || 'navy'}`}
                            style={{ width: `${pct}%` }}
                          >
                            {r.preference_value?.toFixed(4)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Full Ranking Table */}
            <div className="card animate-in">
              <div className="card-header">
                <h3>Tabel Ranking Lengkap</h3>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'center', width: '80px' }}>Ranking</th>
                        <th>Ruas Jalan</th>
                        <th style={{ textAlign: 'center' }}>Nilai Preferensi (Vi)</th>
                        <th style={{ textAlign: 'center' }}>Status Prioritas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map(r => (
                        <tr key={r.alternative_id} style={{
                          background: r.rank === 1 ? 'rgba(212, 168, 67, 0.04)' : undefined,
                        }}>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`rank-badge rank-${r.rank <= 3 ? r.rank : 'other'}`}>
                              {r.rank}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.alternative_name}</td>
                          <td style={{
                            textAlign: 'center',
                            fontWeight: 800,
                            color: 'var(--navy-700)',
                            fontFamily: 'monospace',
                            fontSize: '1rem',
                          }}>
                            {r.preference_value?.toFixed(10)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${r.rank === 1 ? 'badge-gold' : r.rank <= 3 ? 'badge-navy' : 'badge-warning'}`}>
                              {statusLabel(r.rank)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Hierarchy Diagram */}
            <div className="card mt-6 animate-in">
              <div className="card-header">
                <h3>Struktur Hierarki AHP</h3>
              </div>
              <div className="card-body">
                <div className="hierarchy">
                  <div className="hierarchy-level">
                    <div className="hierarchy-node goal">Prioritas Perbaikan Jalan</div>
                  </div>
                  <div className="hierarchy-connector"></div>
                  <div className="hierarchy-level">
                    {Object.entries(results.criteria_weights || {}).map(([id, c]) => (
                      <div key={id} className="hierarchy-node criteria">
                        {c.name?.replace('Faktor ', '')}
                        <br />
                        <small>({((c.weight || 0) * 100).toFixed(1)}%)</small>
                      </div>
                    ))}
                  </div>
                  <div className="hierarchy-connector"></div>
                  <div className="hierarchy-level">
                    {rankings.map(r => (
                      <div key={r.alternative_id} className="hierarchy-node alternative">
                        {r.alternative_name}
                        <br />
                        <small>Vi: {r.preference_value?.toFixed(4)}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
