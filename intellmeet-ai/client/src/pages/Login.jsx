import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // Navigation ke liye hook

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await api.post('/auth/signup', form);
        setMode('login');
        setLoading(false);
        return;
      }
      
      const { data } = await api.post('/auth/login', form);
      
      const cleanToken = data.token.replace(/['"]/g, '').trim();
      localStorage.setItem('token', cleanToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-main)] transition-colors duration-300">
      <section className="w-full max-w-md text-center">

        {/* Logo */}
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-sky-500 to-blue-700 text-4xl shadow-2xl">
          👥
        </div>

        <h1 className="text-4xl font-extrabold text-[var(--text-primary)]">
          IntellMeet AI
        </h1>
        <p className="mt-2 text-[var(--text-muted)] text-sm">
          Professional Video Meetings
        </p>

        {/* Card */}
        <div className="mt-8 bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-7 text-left shadow-xl transition-colors duration-300">

          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-[var(--bg-main)] rounded-xl p-1">
            {['login', 'signup'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize cursor-pointer border-0 ${
                  mode === m
                    ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {m === 'login' ? 'Login' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            {mode === 'signup' && (
              <input
                className="input"
                placeholder="Full name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            )}
            <input
              className="input"
              placeholder="Email address"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              className="input"
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />

            {error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Please wait...' : mode === 'login' ? '🚀 Login' : '✨ Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-faint)] mt-5">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-[var(--accent)] font-semibold hover:underline cursor-pointer bg-transparent border-0"
            >
              {mode === 'login' ? 'Sign up' : 'Login'}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}


