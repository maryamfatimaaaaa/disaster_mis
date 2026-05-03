import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, FileWarning, Users, Package,
  Hospital, DollarSign, CheckSquare, ScrollText,
  LogOut, Menu, X, AlertTriangle
} from 'lucide-react';

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard',     roles: null },
  { to: '/reports',    icon: FileWarning,      label: 'Reports',       roles: null },
  { to: '/teams',      icon: Users,            label: 'Rescue Teams',  roles: null },
  { to: '/resources',  icon: Package,          label: 'Resources',     roles: null },
  { to: '/hospitals',  icon: Hospital,         label: 'Hospitals',     roles: null },
  { to: '/financial',  icon: DollarSign,       label: 'Financial',     roles: ['Administrator','Finance Officer'] },
  { to: '/approvals',  icon: CheckSquare,      label: 'Approvals',     roles: null },
  { to: '/audit',      icon: ScrollText,       label: 'Audit Logs',    roles: ['Administrator'] },
];

const ROLE_COLORS = {
  'Administrator':     '#2563eb',
  'Emergency Operator':'#f97316',
  'Field Officer':     '#22c55e',
  'Warehouse Manager': '#a855f7',
  'Finance Officer':   '#06b6d4',
};

export default function Layout() {
  const { user, logout, isRole } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const visibleNav = NAV.filter(n => !n.roles || n.roles.includes(user?.role_name));
  const roleColor  = ROLE_COLORS[user?.role_name] || '#8b949e';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: open ? 220 : 60, minWidth: open ? 220 : 60,
        background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s, min-width 0.2s', overflow: 'hidden'
      }}>

        {/* Logo */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={16} color="#fff" />
          </div>
          {open && <span style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Disaster MIS</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                padding: '0.55rem 0.75rem', borderRadius: 'var(--radius)',
                textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
                whiteSpace: 'nowrap', transition: 'all 0.15s',
                color: isActive ? '#fff' : 'var(--text2)',
                background: isActive ? 'var(--primary)' : 'transparent',
              })}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {open && label}
            </NavLink>
          ))}
        </nav>

        {/* User + collapse */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 0.5rem' }}>
          {open && (
            <div style={{ padding: '0.5rem 0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{user?.username}</div>
              <div style={{ fontSize: '0.72rem', color: roleColor, marginTop: 2 }}>{user?.role_name}</div>
            </div>
          )}
          <button onClick={handleLogout} className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: open ? 'flex-start' : 'center' }}>
            <LogOut size={14} />
            {open && 'Logout'}
          </button>
          <button onClick={() => setOpen(o => !o)} className="btn btn-ghost btn-sm"
            style={{ width: '100%', marginTop: 4, justifyContent: open ? 'flex-start' : 'center' }}>
            {open ? <X size={14} /> : <Menu size={14} />}
            {open && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
