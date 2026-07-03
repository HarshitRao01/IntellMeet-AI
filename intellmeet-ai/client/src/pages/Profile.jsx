import { useState, useEffect } from 'react';
import { User, Mail } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import api from '../lib/api';

export default function Profile() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user.name || '', email: user.email || '' });
  const [toast, setToast] = useState('');
  const [stats, setStats] = useState({ meetings: 0, recordings: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/meetings').catch(() => ({ data: [] })),
      api.get('/recordings').catch(() => ({ data: [] })),
    ]).then(([m, r]) => setStats({ meetings: m.data.length, recordings: r.data.length }));
  }, []);

  function showToast(t) {
    setToast(t);
    setTimeout(() => setToast(''), 2000);
  }

  function saveProfile() {
    const updated = { ...user, name: form.name, email: form.email };
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
    setEditing(false);
    showToast('✅ Profile updated!');
  }

  const initials = (user.name || user.email || 'U').slice(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f9ff', fontFamily: 'Inter, sans-serif', color: '#334155' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          right: 24,
          top: 24,
          zIndex: 100,
          background: 'white',
          border: '1.5px solid #7dd3fc',
          borderRadius: 14,
          padding: '14px 22px',
          fontWeight: 600,
          color: '#0369a1',
          boxShadow: '0 8px 30px rgba(14,165,233,0.18)',
        }}>
          {toast}
        </div>
      )}

      <Sidebar />

      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', maxWidth: 760 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0c4a6e' }}>Profile</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>Your account information</p>
        </div>

        <div style={{
          background: 'white',
          border: '1.5px solid #bae6fd',
          borderRadius: 20,
          padding: 32,
          marginBottom: 24,
          boxShadow: '0 2px 12px rgba(14,165,233,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28 }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: 18,
              background: 'linear-gradient(135deg,#0ea5e9,#0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              fontWeight: 800,
              color: 'white',
              boxShadow: '0 8px 24px rgba(14,165,233,0.25)',
            }}>
              {initials}
            </div>

            <div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0c4a6e' }}>
                {user.name || 'No name set'}
              </h2>
              <p style={{ color: '#64748b', marginTop: 3 }}>{user.email || 'No email set'}</p>
              <span style={{
                display: 'inline-block',
                marginTop: 8,
                background: '#e0f2fe',
                color: '#0369a1',
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: 999,
                border: '1px solid #bae6fd',
                fontWeight: 600,
              }}>
                {user.role || 'Member'}
              </span>
            </div>
          </div>

          {!editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#f0f9ff',
                border: '1.5px solid #e0f2fe',
                borderRadius: 14,
                padding: '14px 16px',
              }}>
                <User size={18} color="#64748b" />
                <div>
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Full Name</p>
                  <p style={{ fontWeight: 600, color: '#334155' }}>{user.name || '—'}</p>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#f0f9ff',
                border: '1.5px solid #e0f2fe',
                borderRadius: 14,
                padding: '14px 16px',
              }}>
                <Mail size={18} color="#64748b" />
                <div>
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Email</p>
                  <p style={{ fontWeight: 600, color: '#334155' }}>{user.email || '—'}</p>
                </div>
              </div>

              <button onClick={() => setEditing(true)} className="btn-primary" style={{ width: '100%', marginTop: 8 }}>
                Edit Profile
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                className="input"
                placeholder="Full name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="input"
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={saveProfile} className="btn-primary" style={{ flex: 1 }}>Save</button>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    flex: 1,
                    background: '#f0f9ff',
                    border: '1.5px solid #bae6fd',
                    borderRadius: 12,
                    color: '#64748b',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{
            background: 'white',
            border: '1.5px solid #bae6fd',
            borderRadius: 18,
            padding: 22,
            textAlign: 'center',
            boxShadow: '0 2px 10px rgba(14,165,233,0.06)',
          }}>
            <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0ea5e9' }}>{stats.meetings}</p>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>Total Meetings</p>
          </div>

          <div style={{
            background: 'white',
            border: '1.5px solid #bae6fd',
            borderRadius: 18,
            padding: 22,
            textAlign: 'center',
            boxShadow: '0 2px 10px rgba(14,165,233,0.06)',
          }}>
            <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>{stats.recordings}</p>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>Recordings Saved</p>
          </div>
        </div>
      </main>
    </div>
  );
}