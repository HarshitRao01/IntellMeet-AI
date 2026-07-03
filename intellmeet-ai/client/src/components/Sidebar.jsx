import { LayoutDashboard, Calendar, Briefcase, Video, User, Sun, Moon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Sidebar() {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const links = [
    ['Dashboard',  '/dashboard',  LayoutDashboard],
    ['Meetings',   '/meetings',   Calendar],
    ['Workspaces', '/workspaces', Briefcase],
    ['Recordings', '/recordings', Video],
    ['Profile',    '/profile',    User],
  ];

  return (
    <aside
      style={{
        width: 240,
        minHeight: '100vh',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: 20,
        background: 'var(--bg-sidebar)',
        borderRight: '1.5px solid var(--border)',
        boxShadow: '2px 0 12px rgba(14,165,233,0.07)',
        transition: 'background 0.3s, border-color 0.3s',
      }}
    >
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 36, fontWeight: 800,
        fontSize: '1.1rem', color: 'var(--text-primary)',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: 'linear-gradient(135deg, #0ea5e9, #0369a1)',
          display: 'grid', placeItems: 'center', fontSize: '1.1rem',
          boxShadow: '0 2px 8px rgba(14,165,233,0.3)',
        }}>
          👥
        </div>
        IntellMeet
      </div>

      {/* Nav links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {links.map(([label, href, Icon]) => {
          const active = pathname === href;
          return (
            <Link
              key={label}
              to={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 16px', borderRadius: 12,
                fontWeight: 500, fontSize: '0.88rem',
                textDecoration: 'none', transition: 'all 0.18s',
                background: active
                  ? 'linear-gradient(135deg, #0ea5e9, #0284c7)'
                  : 'transparent',
                color: active ? 'white' : 'var(--text-muted)',
                boxShadow: active ? '0 2px 8px rgba(14,165,233,0.25)' : 'none',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--accent-bg)';
                  e.currentTarget.style.color = 'var(--accent)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom — theme toggle + version */}
      <div style={{
        marginTop: 'auto', paddingTop: 16,
        borderTop: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Light Mode pe switch karo' : 'Dark Mode pe switch karo'}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '11px 14px',
            borderRadius: 12, cursor: 'pointer',
            border: '1.5px solid var(--border)',
            background: 'var(--accent-bg)',
            color: 'var(--text-primary)',
            fontWeight: 600, fontSize: '0.87rem',
            fontFamily: 'Inter, sans-serif',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = isDark ? '#1e3a5f' : '#bae6fd';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--accent-bg)';
          }}
        >
          {/* Toggle track */}
          <div style={{
            width: 38, height: 21, borderRadius: 999,
            background: isDark ? '#0ea5e9' : '#cbd5e1',
            position: 'relative', flexShrink: 0,
            transition: 'background 0.3s',
          }}>
            {/* Knob */}
            <div style={{
              position: 'absolute',
              top: 2.5,
              left: isDark ? 19 : 2,
              width: 16, height: 16,
              borderRadius: '50%',
              background: 'white',
              transition: 'left 0.25s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isDark
                ? <Moon size={9} color="#0ea5e9" />
                : <Sun  size={9} color="#f59e0b" />
              }
            </div>
          </div>

          <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
        </button>

        <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textAlign: 'center' }}>
          IntellMeet v1.0
        </p>
      </div>
    </aside>
  );
}