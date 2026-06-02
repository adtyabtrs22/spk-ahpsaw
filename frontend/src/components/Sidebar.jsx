import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  RiDashboardLine, RiScales3Line, RiRoadMapLine,
  RiBarChartBoxLine, RiTrophyLine, RiLogoutBoxRLine,
  RiUserSettingsLine, RiShieldLine,
} from 'react-icons/ri';

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const initials = user?.full_name
    ?.split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const navItems = [
    { to: '/', icon: <RiDashboardLine />, label: 'Dashboard' },
    { to: '/criteria', icon: <RiScales3Line />, label: 'Matriks Perbandingan' },
    { to: '/alternatives', icon: <RiRoadMapLine />, label: 'Data Alternatif' },
    { to: '/calculation', icon: <RiBarChartBoxLine />, label: 'Hasil Perhitungan' },
    { to: '/ranking', icon: <RiTrophyLine />, label: 'Perangkingan' },
  ];

  const adminItems = [
    { to: '/users', icon: <RiUserSettingsLine />, label: 'Kelola Pengguna' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <RiShieldLine />
          </div>
          <div className="sidebar-logo-text">
            <h3>SPK Bina Marga</h3>
            <span>AHP-SAW System</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Menu Utama</div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: '8px' }}>Administrasi</div>
            {adminItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button className="sidebar-logout" onClick={logout} title="Keluar">
            <RiLogoutBoxRLine />
          </button>
        </div>
      </div>
    </aside>
  );
}
