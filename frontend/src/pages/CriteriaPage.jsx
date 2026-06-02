import { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const SAATY_SCALE = [
  { value: 9, label: '9 — Mutlak lebih penting' },
  { value: 8, label: '8' },
  { value: 7, label: '7 — Sangat jelas lebih penting' },
  { value: 6, label: '6' },
  { value: 5, label: '5 — Jelas lebih penting' },
  { value: 4, label: '4' },
  { value: 3, label: '3 — Sedikit lebih penting' },
  { value: 2, label: '2' },
  { value: 1, label: '1 — Sama penting' },
  { value: 0.5, label: '1/2' },
  { value: 1/3, label: '1/3 — Sedikit kurang penting' },
  { value: 0.25, label: '1/4' },
  { value: 0.2, label: '1/5 — Jelas kurang penting' },
  { value: 1/6, label: '1/6' },
  { value: 1/7, label: '1/7 — Sangat jelas kurang penting' },
  { value: 0.125, label: '1/8' },
  { value: 1/9, label: '1/9 — Mutlak kurang penting' },
];

function findClosestScale(v) {
  let closest = SAATY_SCALE[0];
  let minDiff = Math.abs(SAATY_SCALE[0].value - v);
  for (const s of SAATY_SCALE) {
    const diff = Math.abs(s.value - v);
    if (diff < minDiff) { minDiff = diff; closest = s; }
  }
  return closest.value;
}

function formatValue(v) {
  if (v === 1) return '1';
  if (v >= 1) return String(Math.round(v * 100) / 100);
  const denom = Math.round(1 / v);
  return `1/${denom}`;
}

export default function CriteriaPage() {
  const { canEdit } = useAuth();
  const [criteria, setCriteria] = useState([]);
  const [activeTab, setActiveTab] = useState('criteria');
  const [activeCriteria, setActiveCriteria] = useState(null);
  const [pairwiseValues, setPairwiseValues] = useState({});
  const [consistency, setConsistency] = useState(null);
  const [weights, setWeights] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState(null);

  useEffect(() => { loadProject(); }, []);

  const loadProject = async () => {
    try {
      const pRes = await client.get('/projects/');
      if (pRes.data.length > 0) {
        const pid = pRes.data[0].id;
        setProjectId(pid);
        const cRes = await client.get(`/projects/${pid}/criteria/`);
        setCriteria(cRes.data);
        loadPairwiseCriteria(pid);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPairwiseCriteria = async (pid) => {
    try {
      const res = await client.get(`/projects/${pid}/pairwise/criteria`);
      const vals = {};
      res.data.entries.forEach(e => { vals[`${e.row_id}_${e.col_id}`] = e.value; });
      setPairwiseValues(vals);
    } catch {}
  };

  const loadPairwiseSubCriteria = async (critId) => {
    try {
      const res = await client.get(`/projects/${projectId}/pairwise/subcriteria/${critId}`);
      const vals = {};
      res.data.entries.forEach(e => { vals[`${e.row_id}_${e.col_id}`] = e.value; });
      setPairwiseValues(vals);
      setConsistency(null);
      setWeights({});
    } catch {}
  };

  const handleTabChange = (tab, critObj) => {
    setActiveTab(tab);
    setPairwiseValues({});
    setConsistency(null);
    setWeights({});
    if (tab === 'criteria') {
      loadPairwiseCriteria(projectId);
      setActiveCriteria(null);
    } else {
      setActiveCriteria(critObj);
      loadPairwiseSubCriteria(critObj.id);
    }
  };

  const getItems = () => {
    if (activeTab === 'criteria') return criteria.map(c => ({ id: c.id, name: c.name }));
    if (activeCriteria) return (activeCriteria.sub_criteria || []).map(s => ({ id: s.id, name: s.name }));
    return [];
  };

  const handleValueChange = (rowId, colId, value) => {
    setPairwiseValues(prev => ({ ...prev, [`${rowId}_${colId}`]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = getItems();
      const entries = [];
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const key = `${items[i].id}_${items[j].id}`;
          entries.push({
            row_id: items[i].id,
            col_id: items[j].id,
            value: pairwiseValues[key] || 1,
          });
        }
      }

      let url;
      if (activeTab === 'criteria') {
        url = `/projects/${projectId}/pairwise/criteria`;
      } else {
        url = `/projects/${projectId}/pairwise/subcriteria/${activeCriteria.id}`;
      }
      const res = await client.post(url, { entries });
      setConsistency(res.data);
      setWeights(res.data.weights || {});

      // Reload criteria to get updated weights
      const cRes = await client.get(`/projects/${projectId}/criteria/`);
      setCriteria(cRes.data);
    } catch (err) {
      alert('Gagal menyimpan: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const items = getItems();

  if (loading) return <div className="page-body text-center text-muted">Memuat data...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Matriks Perbandingan Berpasangan</h1>
          <p>Isi perbandingan antar elemen menggunakan skala Saaty (1–9)</p>
        </div>
      </div>
      <div className="page-body">
        {/* Tabs */}
        <div className="tabs" style={{ maxWidth: '100%', overflowX: 'auto' }}>
          <button
            className={`tab ${activeTab === 'criteria' ? 'active' : ''}`}
            onClick={() => handleTabChange('criteria')}
          >
            Kriteria Utama
          </button>
          {criteria.map(c => (
            <button
              key={c.id}
              className={`tab ${activeTab === `sub_${c.id}` ? 'active' : ''}`}
              onClick={() => handleTabChange(`sub_${c.id}`, c)}
            >
              {c.name.replace('Faktor ', '')}
            </button>
          ))}
        </div>

        {/* Matrix */}
        <div className="card mb-6">
          <div className="card-header">
            <h3>
              {activeTab === 'criteria'
                ? 'Matriks Perbandingan Kriteria'
                : `Matriks Sub-Kriteria: ${activeCriteria?.name}`
              }
            </h3>
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan & Hitung'}
              </button>
            )}
          </div>
          <div className="card-body" style={{ overflowX: 'auto' }}>
            {items.length < 2 ? (
              <p className="text-muted text-center">Minimal 2 elemen untuk perbandingan</p>
            ) : (
              <div
                className="matrix-grid"
                style={{ gridTemplateColumns: `180px repeat(${items.length}, 1fr)` }}
              >
                {/* Header row */}
                <div className="matrix-cell header"></div>
                {items.map(item => (
                  <div key={`h_${item.id}`} className="matrix-cell header">{item.name}</div>
                ))}

                {/* Data rows */}
                {items.map((rowItem, i) => (
                  <>
                    <div key={`rh_${rowItem.id}`} className="matrix-cell row-header">{rowItem.name}</div>
                    {items.map((colItem, j) => {
                      if (i === j) {
                        return <div key={`d_${rowItem.id}_${colItem.id}`} className="matrix-cell diagonal">1</div>;
                      }
                      if (i < j) {
                        const key = `${rowItem.id}_${colItem.id}`;
                        const val = pairwiseValues[key] || 1;
                        return (
                          <div key={`e_${rowItem.id}_${colItem.id}`} className="matrix-cell">
                            {canEdit ? (
                              <select
                                className="matrix-input"
                                value={findClosestScale(val)}
                                onChange={(e) => handleValueChange(rowItem.id, colItem.id, parseFloat(e.target.value))}
                                style={{ width: '100%', padding: '4px' }}
                              >
                                {SAATY_SCALE.map((s, idx) => (
                                  <option key={idx} value={s.value}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              formatValue(val)
                            )}
                          </div>
                        );
                      }
                      // Reciprocal (i > j)
                      const key = `${colItem.id}_${rowItem.id}`;
                      const val = pairwiseValues[key] || 1;
                      return (
                        <div key={`r_${rowItem.id}_${colItem.id}`} className="matrix-cell reciprocal">
                          {formatValue(1 / val)}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Consistency Result */}
        {consistency && (
          <div className="card mb-6 animate-in">
            <div className="card-header">
              <h3>Uji Konsistensi</h3>
              <span className={`badge ${consistency.is_consistent ? 'badge-success' : 'badge-danger'}`}>
                {consistency.is_consistent ? '✔ KONSISTEN' : '✘ TIDAK KONSISTEN'}
              </span>
            </div>
            <div className="card-body">
              <div className={`consistency-panel ${consistency.is_consistent ? 'consistent' : 'inconsistent'}`}>
                <div className="consistency-metric">
                  <div className="consistency-metric-label">λ max</div>
                  <div className="consistency-metric-value">{consistency.lambda_max?.toFixed(4)}</div>
                </div>
                <div className="consistency-metric">
                  <div className="consistency-metric-label">CI</div>
                  <div className="consistency-metric-value">{consistency.ci?.toFixed(6)}</div>
                </div>
                <div className="consistency-metric">
                  <div className="consistency-metric-label">RI</div>
                  <div className="consistency-metric-value">{consistency.ri}</div>
                </div>
                <div className="consistency-metric">
                  <div className="consistency-metric-label">CR</div>
                  <div className="consistency-metric-value" style={{
                    color: consistency.is_consistent ? 'var(--success-700)' : 'var(--danger-700)'
                  }}>
                    {consistency.cr?.toFixed(6)}
                  </div>
                </div>
              </div>
              {!consistency.is_consistent && (
                <p style={{ color: 'var(--danger-700)', marginTop: 'var(--space-4)', fontSize: '0.88rem' }}>
                  ⚠ CR &gt; 0.1 — Matriks tidak konsisten. Perbaiki nilai perbandingan agar lebih logis.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Weights */}
        {Object.keys(weights).length > 0 && (
          <div className="card animate-in">
            <div className="card-header">
              <h3>Bobot Prioritas (Eigen Vektor)</h3>
            </div>
            <div className="card-body">
              <div className="bar-chart">
                {items.map(item => {
                  const w = weights[String(item.id)] || 0;
                  return (
                    <div key={item.id} className="bar-item">
                      <div className="bar-label">{item.name}</div>
                      <div className="bar-track">
                        <div className="bar-fill navy" style={{ width: `${w * 100}%` }}>
                          {(w * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="bar-value">{w.toFixed(4)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
