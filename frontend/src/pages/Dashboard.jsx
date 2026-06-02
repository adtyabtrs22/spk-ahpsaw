import { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  RiScales3Line, RiRoadMapLine, RiBarChartBoxLine,
  RiTrophyLine, RiArrowRightLine, RiShieldCheckLine,
} from 'react-icons/ri';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ criteria: 0, subcriteria: 0, alternatives: 0, hasResults: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await client.get('/projects/');
      setProjects(res.data);
      if (res.data.length > 0) {
        const p = res.data[0];
        const critRes = await client.get(`/projects/${p.id}/criteria/`);
        const altRes = await client.get(`/projects/${p.id}/alternatives/`);
        let hasResults = false;
        try {
          await client.get(`/projects/${p.id}/calculate/results`);
          hasResults = true;
        } catch {}
        const subCount = critRes.data.reduce((acc, c) => acc + (c.sub_criteria?.length || 0), 0);
        setStats({
          criteria: critRes.data.length,
          subcriteria: subCount,
          alternatives: altRes.data.length,
          hasResults,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const greetingTime = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat Pagi';
    if (h < 17) return 'Selamat Siang';
    return 'Selamat Malam';
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{greetingTime()}, {user?.full_name?.split(' ')[0]}</h1>
          <p>Sistem Pendukung Keputusan — Prioritas Perbaikan Jalan</p>
        </div>
      </div>

      <div className="page-body">
        <div className="red-strip mb-8" style={{ borderRadius: '2px' }}></div>

        <div className="stat-grid animate-in">
          <div className="stat-card stagger-1">
            <div className="stat-icon navy"><RiScales3Line /></div>
            <div className="stat-info">
              <h4>Kriteria</h4>
              <div className="stat-value">{stats.criteria}</div>
            </div>
          </div>
          <div className="stat-card stagger-2">
            <div className="stat-icon gold"><RiBarChartBoxLine /></div>
            <div className="stat-info">
              <h4>Sub-Kriteria</h4>
              <div className="stat-value">{stats.subcriteria}</div>
            </div>
          </div>
          <div className="stat-card stagger-3">
            <div className="stat-icon red"><RiRoadMapLine /></div>
            <div className="stat-info">
              <h4>Alternatif</h4>
              <div className="stat-value">{stats.alternatives}</div>
            </div>
          </div>
          <div className="stat-card stagger-4">
            <div className="stat-icon green"><RiTrophyLine /></div>
            <div className="stat-info">
              <h4>Status</h4>
              <div className="stat-value" style={{ fontSize: '1.1rem' }}>
                {stats.hasResults ? (
                  <span className="badge badge-success">Sudah Dihitung</span>
                ) : (
                  <span className="badge badge-warning">Belum Dihitung</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {projects.length > 0 && (
          <div className="grid-2 animate-in">
            <div className="card">
              <div className="card-header">
                <h3>Proyek Aktif</h3>
              </div>
              <div className="card-body">
                <h4 style={{ marginBottom: 'var(--space-2)' }}>{projects[0].name}</h4>
                <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-4)' }}>
                  {projects[0].description}
                </p>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  <span className="badge badge-navy">{projects[0].criteria_count} Kriteria</span>
                  <span className="badge badge-gold">{projects[0].alternative_count} Alternatif</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>Metode Perhitungan</h3>
              </div>
              <div className="card-body">
                <div className="flex gap-4 mb-4" style={{ alignItems: 'flex-start' }}>
                  <div className="stat-icon navy" style={{ width: '40px', height: '40px', fontSize: '1.1rem' }}>
                    <RiShieldCheckLine />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '4px' }}>AHP — Pembobotan</h4>
                    <p className="text-sm text-muted">Analytical Hierarchy Process untuk menentukan bobot kriteria melalui perbandingan berpasangan.</p>
                  </div>
                </div>
                <div className="gold-divider"></div>
                <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>
                  <div className="stat-icon gold" style={{ width: '40px', height: '40px', fontSize: '1.1rem' }}>
                    <RiBarChartBoxLine />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '4px' }}>SAW — Perangkingan</h4>
                    <p className="text-sm text-muted">Simple Additive Weighting untuk perangkingan alternatif berdasarkan bobot AHP.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card mt-6 animate-in">
          <div className="card-header">
            <h3>Langkah Penggunaan</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-6)' }}>
              {[
                { step: 1, title: 'Atur Kriteria', desc: 'Isi matriks perbandingan berpasangan', to: '/criteria' },
                { step: 2, title: 'Input Alternatif', desc: 'Masukkan data ruas jalan dan skor', to: '/alternatives' },
                { step: 3, title: 'Hitung', desc: 'Jalankan perhitungan AHP-SAW', to: '/calculation' },
                { step: 4, title: 'Lihat Ranking', desc: 'Hasil prioritas perbaikan jalan', to: '/ranking' },
              ].map(item => (
                <div
                  key={item.step}
                  style={{
                    padding: 'var(--space-5)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--slate-200)',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                  onClick={() => navigate(item.to)}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--navy-500)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--slate-200)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: 'var(--radius-full)',
                    background: 'linear-gradient(135deg, var(--navy-700), var(--navy-800))',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.85rem', marginBottom: 'var(--space-3)',
                  }}>{item.step}</div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '4px' }}>{item.title}</h4>
                  <p className="text-sm text-muted">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
