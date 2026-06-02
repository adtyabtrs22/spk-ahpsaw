import { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('spk_token');
    const savedUser = localStorage.getItem('spk_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify token is still valid
      client.get('/auth/me').then(res => {
        setUser(res.data);
        localStorage.setItem('spk_user', JSON.stringify(res.data));
      }).catch(() => {
        localStorage.removeItem('spk_token');
        localStorage.removeItem('spk_user');
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await client.post('/auth/login', { username, password });
    localStorage.setItem('spk_token', res.data.access_token);
    const meRes = await client.get('/auth/me');
    setUser(meRes.data);
    localStorage.setItem('spk_user', JSON.stringify(meRes.data));
    return meRes.data;
  };

  const logout = () => {
    localStorage.removeItem('spk_token');
    localStorage.removeItem('spk_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isOperator = user?.role === 'operator';
  const isPimpinan = user?.role === 'pimpinan';
  const canEdit = isAdmin || isOperator;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isOperator, isPimpinan, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
