import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RiShieldLine } from 'react-icons/ri';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login gagal. Periksa username dan password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-badge">
            <RiShieldLine style={{ color: 'var(--gold-400)', fontSize: '1rem' }} />
            <span>Kementerian Pekerjaan Umum</span>
          </div>
          <h1>
            Sistem Pendukung<br />
            Keputusan <em>Perbaikan Jalan Balikpapan</em>
          </h1>
          <p>
            Prioritas lokasi perbaikan jalan menggunakan metode
            Analytical Hierarchy Process (AHP) dan Simple Additive
            Weighting (SAW) untuk pengambilan keputusan yang objektif
            dan terstruktur.
          </p>
        </div>
      </div>

      <div className="login-right">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2>Masuk</h2>
          <p className="login-subtitle">Masukkan kredensial Anda untuk melanjutkan</p>

          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              className="form-input"
              type="text"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
          >
            {loading ? 'Memproses...' : 'Masuk ke Sistem'}
          </button>
        </form>
      </div>
    </div>
  );
}
