import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import CriteriaPage from './pages/CriteriaPage';
import AlternativesPage from './pages/AlternativesPage';
import CalculationPage from './pages/CalculationPage';
import RankingPage from './pages/RankingPage';
import UsersPage from './pages/UsersPage';

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--slate-50)',
      }}>
        <p style={{ color: 'var(--slate-500)' }}>Memuat...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function PublicRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/criteria" element={<CriteriaPage />} />
            <Route path="/alternatives" element={<AlternativesPage />} />
            <Route path="/calculation" element={<CalculationPage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
