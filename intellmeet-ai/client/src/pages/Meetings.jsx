import { useEffect, useState } from 'react';
import { Copy, Plus, Trash2, Video, Calendar, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Sidebar from '../components/Sidebar';

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [form, setForm] = useState({ title: '', scheduledAt: '', description: '' });
  const [joinId, setJoinId] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const getMinDateTimeString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  async function load() {
    try {
      const { data } = await api.get('/meetings');
      const activeMeetings = data.filter(m => m.status !== 'ended');
      setMeetings(activeMeetings);
    } catch (e) {
      console.error('Load meetings error:', e);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function showToast(text) {
    setToast(text);
    setTimeout(() => setToast(''), 2500);
  }

  async function copyLink(id) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/meeting/${id}`);
      showToast('✅ Meeting link copied!');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }

  async function createMeeting() {
    if (!form.title.trim()) {
      showToast('⚠️ Please enter a meeting title');
      return;
    }

    if (form.scheduledAt) {
      const selectedTime = new Date(form.scheduledAt).getTime();
      const currentTime = new Date().getTime();
      if (selectedTime < currentTime - 60000) {
        showToast('❌ You cannot select a past date/time!');
        return;
      }
    }

    setLoading(true);
    try {
      const submitData = {
        title: form.title.trim(),
        description: form.description.trim(),
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined
      };

      const { data } = await api.post('/meetings', submitData);
      showToast('✅ Meeting created!');
      
      setForm({ title: '', scheduledAt: '', description: '' });
      await load();
      
      const targetMeetId = data?.meetingId || data?.meeting?.meetingId;
      if (targetMeetId) {
        await copyLink(targetMeetId);
      }
    } catch (e) {
      console.error('Create meeting error:', e);
      showToast('❌ Failed to create meeting.');
    } finally {
      setLoading(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this meeting?')) return;
    try {
      await api.delete(`/meetings/${id}`);
      await load();
      showToast('🗑️ Meeting deleted');
    } catch (e) {
      console.error('Delete meeting error:', e);
      showToast('❌ Failed to delete meeting');
    }
  }

  async function joinMeeting(explicitId) {
    const id = explicitId && typeof explicitId === 'string' ? explicitId.trim() : joinId.trim();
    
    if (!id) {
      showToast('⚠️ Please enter or select a meeting ID');
      return;
    }
    
    const meetId = id.startsWith('meet-') ? id : `meet-${id}`;

    try {
      const response = await api.get(`/meetings/${meetId}`);
      const dataRoom = response.data;

      if (dataRoom && dataRoom.status === 'scheduled' && dataRoom.scheduledAt) {
        const deltaOffset = new Date(dataRoom.scheduledAt).getTime() - new Date().getTime();
        if (deltaOffset > 300000) {
          alert(`Early access blocked! This meeting will start at its scheduled time: ${new Date(dataRoom.scheduledAt).toLocaleString()}`);
          return;
        }
      }
      navigate(`/meeting/${meetId}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Room code validation entry missing or invalid.');
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-sky-50 font-sans text-slate-700 w-screen overflow-x-hidden">
      
      {toast && (
        <div className="fixed right-6 top-6 z-[100] bg-white border-2 border-sky-300 rounded-xl px-5 py-3.5 font-semibold text-base text-sky-700 shadow-xl max-w-sm transition-all duration-300">
          {toast}
        </div>
      )}

      <Sidebar />

      <main className="flex-1 p-6 md:p-10 overflow-y-auto w-full box-border">
        
        <div className="mb-8">
          <h1 className="text-3xl font-black text-sky-950">Meetings</h1>
          <p className="text-slate-500 text-sm mt-1">Create, schedule, and join meetings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Create Form Block */}
          <div className="bg-white border border-sky-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-lg text-sky-950 flex items-center gap-2 mb-5">
              <Plus size={20} className="text-sky-500" /> Create / Schedule Meeting
            </h2>

            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Meeting title *"
                className="w-full bg-slate-50 border border-sky-100 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-sky-400 transition-all text-slate-800"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && createMeeting()}
              />
              <input
                type="datetime-local"
                min={getMinDateTimeString()} 
                className="w-full bg-slate-50 border border-sky-100 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-sky-400 transition-all text-slate-700"
                value={form.scheduledAt}
                onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
              />
              <textarea
                className="w-full bg-slate-50 border border-sky-100 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-sky-400 transition-all h-28 resize-none text-slate-800"
                placeholder="Description (optional)"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
              <button
                onClick={createMeeting}
                disabled={loading}
                className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white rounded-xl py-3 font-bold text-sm tracking-wide shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {loading ? '⏳ Creating...' : (
                  <>
                    <Plus size={18} /> Create New Meeting
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Join System Block */}
          <div className="bg-white border border-sky-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="font-bold text-lg text-sky-950 flex items-center gap-2 mb-4">
                <Link2 size={20} className="text-sky-500" /> Join a Meeting
              </h2>
              <p className="text-slate-500 text-sm mb-4 leading-relaxed">
                Enter a meeting ID to join instantly. Example:{' '}
                <span className="font-mono text-sky-600 font-bold bg-sky-50 px-2 py-1 rounded text-sm">meet-ab12cd34</span>
              </p>
              <input
                type="text"
                placeholder="Enter meeting ID e.g. meet-ab12cd34"
                className="w-full bg-slate-50 border border-sky-100 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-sky-400 transition-all text-slate-800"
                value={joinId}
                onChange={e => setJoinId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && joinMeeting()}
              />
              <button
                onClick={() => joinMeeting()}
                className="mt-4 w-full bg-white border border-sky-200 hover:bg-slate-50 text-sky-700 rounded-xl py-3 font-bold text-sm transition-all tracking-wide shadow-sm"
              >
                🚀 Join Meeting Room
              </button>
            </div>
            
            <div className="mt-5 bg-sky-50/50 border border-sky-100 rounded-xl p-4 flex flex-col gap-1">
              <p className="text-xs font-bold tracking-wider text-sky-700 uppercase">💡 Pro Tip</p>
              <p className="text-xs text-slate-500 leading-normal">Copy a verified meeting token link from the dashboard list logs to invite external nodes instantly.</p>
            </div>
          </div>
        </div>

        <h2 className="font-bold text-lg text-sky-950 mb-5">
          Your Meetings Logs
        </h2>

        {meetings.length === 0 ? (
          <div className="text-center py-16 bg-white border border-sky-200 rounded-2xl p-6">
            <p className="text-5xl mb-3">📅</p>
            <p className="text-base font-bold text-slate-500">No active meetings yet.</p>
            <p className="text-sm text-slate-400 mt-1">Create an enterprise container room session above to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {meetings.map(m => (
              <div
                key={m._id}
                className="bg-white border border-sky-200 rounded-2xl p-5 shadow-sm hover:border-sky-400 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base text-sky-950 truncate" title={m.title}>
                        {m.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-1 tracking-wide">
                        {m.meetingId}
                      </p>
                    </div>
                    <div className="bg-sky-100/70 border border-sky-200 rounded-xl p-2.5 flex-shrink-0">
                      <Video size={18} className="text-sky-500" />
                    </div>
                  </div>

                  {m.description && (
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                      {m.description}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4 text-slate-500">
                    <Calendar size={15} />
                    <span className="text-xs font-medium">
                      {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : 'Instant meeting'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button 
                      onClick={() => joinMeeting(m.meetingId)} 
                      className="flex-1 bg-sky-500 hover:bg-sky-600 text-white rounded-xl py-2.5 font-bold text-sm shadow-sm transition-all text-center"
                    >
                      Join
                    </button>
                    <button 
                      onClick={() => copyLink(m.meetingId)} 
                      className="bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl p-2.5 text-slate-600 transition-all" 
                      title="Copy link"
                    >
                      <Copy size={16} />
                    </button>
                    <button 
                      onClick={() => remove(m._id)} 
                      className="bg-red-50 border border-red-100 hover:bg-red-100 rounded-xl p-2.5 text-red-500 transition-all" 
                      title="Delete meeting"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}