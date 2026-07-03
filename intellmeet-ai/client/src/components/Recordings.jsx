
import { useEffect, useState } from 'react';
import { Video, Clock, Calendar, FileText, Search } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatDur(s) {
  if (!s) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export default function Recordings() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/recordings`)
      .then(res => res.json())
      .then(data => { setRecordings(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const filtered = recordings.filter(r =>
    (r.meetingTitle || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f9ff', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0c4a6e' }}>Recordings</h1>
            <p style={{ color: '#64748b', marginTop: 4 }}>{recordings.length} recording{recordings.length !== 1 ? 's' : ''} saved</p>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search recordings..."
              style={{ background: 'white', border: '1.5px solid #bae6fd', borderRadius: 12, padding: '10px 14px 10px 38px', fontSize: '0.87rem', color: '#334155', outline: 'none', fontFamily: 'Inter, sans-serif', width: 240 }}
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
            <p>Loading recordings...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎥</div>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#64748b' }}>
              {search ? 'No recordings match your search' : 'No recordings yet'}
            </p>
            <p style={{ fontSize: '0.85rem', marginTop: 6 }}>
              {search ? 'Try a different keyword' : 'Start a meeting and hit Record to save recordings here.'}
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
            {filtered.map(rec => (
              <RecordingCard
                key={rec._id}
                rec={rec}
                isPlaying={playingId === rec._id}
                onPlay={() => setPlayingId(playingId === rec._id ? null : rec._id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function RecordingCard({ rec, isPlaying, onPlay }) {
  return (
    <div style={{
      background: 'white',
      border: '1.5px solid #bae6fd',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 2px 16px rgba(14,165,233,0.07)',
      transition: 'all 0.2s',
    }}>
      {/* Video preview / player */}
      <div style={{ position: 'relative', background: '#0c4a6e', aspectRatio: '16/9' }}>
        {isPlaying ? (
          <video
            src={rec.videoUrl}
            controls
            autoPlay
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            onClick={onPlay}
            style={{
              width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', gap: 8,
              background: 'linear-gradient(135deg, #075985, #0c4a6e)',
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(14,165,233,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem',
              boxShadow: '0 4px 20px rgba(14,165,233,0.4)',
              transition: 'transform 0.2s',
            }}>
              ▶
            </div>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem' }}>Click to play</span>

            {/* Duration badge */}
            {rec.duration > 0 && (
              <div style={{ position: 'absolute', bottom: 10, right: 12, background: 'rgba(12,74,110,0.85)', color: 'white', fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                {formatDur(rec.duration)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '18px 20px' }}>

        {/* Title */}
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#0c4a6e', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Video size={16} color="#0ea5e9" />
          {rec.meetingTitle || 'Untitled Recording'}
        </h2>

        {/* Meta info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

          {/* Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={13} color="#94a3b8" />
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {new Date(rec.createdAt).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={13} color="#94a3b8" />
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {new Date(rec.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              {rec.duration > 0 && <span style={{ color: '#0ea5e9', fontWeight: 600 }}> · {formatDur(rec.duration)}</span>}
            </span>
          </div>

          {/* Description */}
          {rec.description && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 2 }}>
              <FileText size={13} color="#94a3b8" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>{rec.description}</span>
            </div>
          )}

          {/* Summary */}
          {rec.summary && (
            <div style={{ marginTop: 6, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#0369a1', marginBottom: 4 }}>📋 Summary</p>
              <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {rec.summary}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            onClick={onPlay}
            style={{
              flex: 1,
              background: isPlaying ? '#fee2e2' : 'linear-gradient(135deg,#0ea5e9,#0284c7)',
              color: isPlaying ? '#ef4444' : 'white',
              border: isPlaying ? '1.5px solid #fca5a5' : 'none',
              borderRadius: 12, padding: '10px',
              fontWeight: 600, fontSize: '0.85rem',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'all 0.18s',
            }}
          >
            {isPlaying ? '⏹ Close' : '▶ Play Recording'}
          </button>
          <a
            href={rec.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#f0f9ff', border: '1.5px solid #bae6fd',
              borderRadius: 12, padding: '10px 14px',
              color: '#0369a1', fontWeight: 600, fontSize: '0.85rem',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.18s',
            }}
          >
            ↗ Open
          </a>
        </div>
      </div>
    </div>
  );
}