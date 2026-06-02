import { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { RiAddLine, RiUserSettingsLine } from 'react-icons/ri';

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', full_name: '', email: '', password: '', role: 'operator' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const res = await client.get('/auth/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      await client.post('/auth/register', newUser);
      setNewUser({ username: '', full_name: '', email: '', password: '', role: 'operator' });
      setShowModal(false);
      loadUsers();
    } catch (err) {
      alert('Gagal: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggle = async (userId) => {
    try {
      await client.put(`/auth/users/${userId}/toggle`);
      loadUsers();
    } catch (err) {
      alert('Gagal: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (!isAdmin) return <div className="page-body text-center text-muted">Akses ditolak.</div>;

  const roleLabel = { admin: 'Administrator', operator: 'Staff Teknis', pimpinan: 'Pimpinan' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Kelola Pengguna</h1>
          <p>Atur akun pengguna sistem SPK</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <RiAddLine /> Tambah Pengguna
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                      <td>{u.username}</td>
                      <td className="text-muted">{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-danger' : u.role === 'pimpinan' ? 'badge-gold' : 'badge-navy'}`}>
                          {roleLabel[u.role] || u.role}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {u.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => handleToggle(u.id)}>
                          {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Pengguna Baru</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nama Lengkap</label>
                <input className="form-input" value={newUser.full_name}
                  onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input className="form-input" value={newUser.username}
                  onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input className="form-input" type="email" value={newUser.email}
                  onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input className="form-input" type="password" value={newUser.password}
                  onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select className="form-input" value={newUser.role}
                  onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                  <option value="operator">Staff Teknis (Operator)</option>
                  <option value="pimpinan">Pimpinan</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleAdd}>Tambah</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
