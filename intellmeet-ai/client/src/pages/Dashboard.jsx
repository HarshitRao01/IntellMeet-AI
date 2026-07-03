import { useEffect, useState } from 'react';
import { Video, FileText, CheckSquare, Clock, Smile, Download, Trash2, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Sidebar from '../components/Sidebar';

export default function Dashboard() {
  const [meetings, setMeetings] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [tasks, setTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('intellmeet_tasks') || '[]'); } catch { return []; }
  });
  
  const [summaryModal, setSummaryModal] = useState(null);
  const [newTask, setNewTask] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/meetings').then(({ data }) => setMeetings(data)).catch(err => console.error(err));
    api.get('/recordings').then(({ data }) => setRecordings(data)).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (location.state?.summary) {
      setSummaryModal({
        title: location.state.meetingTitle,
        summary: location.state.summary,
        actionItems: location.state.actionItems || [],
        sentiment: location.state.sentiment || 'Neutral',
        meetingId: location.state.meetingId,
      });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  function syncTaskRepository(updatedList) {
    setTasks(updatedList);
    localStorage.setItem('intellmeet_tasks', JSON.stringify(updatedList));
  }

  function handleTaskCreation() {
    if (!newTask.trim()) return;
    const freshNode = { id: Date.now(), text: newTask.trim(), done: false, createdAt: new Date().toISOString() };
    syncTaskRepository([...tasks, freshNode]);
    setNewTask('');
  }

  function toggleTaskState(id) {
    syncTaskRepository(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function handleTaskRemoval(id) {
    syncTaskRepository(tasks.filter(t => t.id !== id));
  }

  async function purgeMeetingHistoryTrack(meetingId) {
    if (!window.confirm("Do you really want to delete this meeting record from the server?")) return;
    try {
      await api.delete(`/meetings/${meetingId}`);
      setMeetings(prev => prev.filter(m => m.meetingId !== meetingId));
    } catch (err) {
      alert("The meeting failed to reach a conclusion..");
    }
  }

  async function handleRoomSecureVerification(meetingId) {
    try {
      const response = await api.get(`/meetings/${meetingId}`);
      const currentData = response.data;

      if (currentData.status === 'scheduled' && currentData.scheduledAt) {
        const deltaOffset = new Date(currentData.scheduledAt).getTime() - new Date().getTime();
        if (deltaOffset > 300000) {
          alert(`Early Access Blocked! This meeting will start at its scheduled time: ${new Date(currentData.scheduledAt).toLocaleString()}`);
          return;
        }
      }
      navigate(`/meeting/${meetingId}`);
    } catch (err) {
      if (err.response && err.response.status === 400) {
        alert(err.response.data.message);
      } else {
        navigate(`/meeting/${meetingId}`);
      }
    }
  }

  function triggersDataReportDownload() {
    const rawTargetSet = searchQuery.trim() ? localizedFilteredArray : meetings;
    if (!rawTargetSet || rawTargetSet.length === 0) {
      alert("No records are accessible on the screen for export..");
      return;
    }

    const csvBuffer = [];
    csvBuffer.push("Meeting Title,Meeting ID,Date Scheduled,Status,AI Extraction Metrics");

    rawTargetSet.forEach(m => {
      const mTitle = (m.title || 'Untitled').replace(/"/g, '""');
      const mId = m.meetingId || '';
      const mDate = new Date(m.scheduledAt || m.createdAt).toLocaleString();
      const mStatus = m.status || '';
      const mSummary = (m.summary || 'No analytics captured').replace(/"/g, '""').replace(/\n/g, ' ');
      csvBuffer.push(`"${mTitle}","${mId}","${mDate}","${mStatus}","${mSummary}"`);
    });

    const fileBlobUri = "data:text/csv;charset=utf-8,\uFEFF" + csvBuffer.join("\n");
    const structuralAnchor = document.createElement("a");
    structuralAnchor.setAttribute("href", encodeURI(fileBlobUri));
    structuralAnchor.setAttribute("download", `IntellMeet_Metrics_${Date.now()}.csv`);
    document.body.appendChild(structuralAnchor);
    structuralAnchor.click();
    document.body.removeChild(structuralAnchor);
  }

  const localizedFilteredArray = meetings.filter(m => 
    (m.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDuration = recordings.reduce((sum, rec) => sum + (rec.duration || 0), 0);
  const pendingCount = tasks.filter(t => !t.done).length;

  return (
    <div className="flex min-h-screen bg-sky-50 text-slate-700 w-full overflow-x-hidden">
      
      {summaryModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-sky-100 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-sky-900">✨ AI Insights Dialogue</h2>
              <button onClick={() => setSummaryModal(null)} className="bg-sky-50 text-slate-400 hover:bg-sky-100 rounded-lg h-8 w-8 text-sm">✕</button>
            </div>
            <p className="text-sm font-semibold text-sky-600 mb-4">{summaryModal.title}</p>
            <div className="max-h-[350px] overflow-y-auto space-y-4 pr-1">
              <div className="flex items-center gap-2 bg-slate-50 border p-3 rounded-xl">
                <Smile size={16} className="text-slate-400" />
                <span className="text-xs">Meeting Mood Tracker:</span>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{summaryModal.sentiment}</span>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Processed Narrative</h3>
                <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-3.5 text-sm leading-relaxed text-slate-600 white-space-pre-wrap">{summaryModal.summary}</div>
              </div>
            </div>
            <button onClick={() => setSummaryModal(null)} className="mt-5 w-full bg-sky-500 hover:bg-sky-600 text-white rounded-xl py-3 font-semibold text-sm transition-all shadow-md">Close Matrix View</button>
          </div>
        </div>
      )}

      <Sidebar />

      <main className="flex-1 p-6 lg:p-10 max-w-full overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-sky-950">Dashboard System</h1>
            <p className="text-slate-400 text-xs mt-0.5">MERN Enterprise central control interface</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={triggersDataReportDownload} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-4 py-2.5 flex items-center gap-2 font-semibold text-xs tracking-wide shadow-sm transition-all"><Download size={15} /> Export CSV Report</button>
            <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="bg-white border border-sky-200 hover:bg-slate-50 rounded-xl px-4 py-2.5 text-slate-500 flex items-center gap-1.5 font-medium text-xs tracking-wide shadow-sm transition-all"><LogOut size={14} /> Logout</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsBlock icon={<Video size={18} className="text-sky-500" />} label="Total Meetings" value={meetings.length} bg="bg-sky-100/70" />
          <StatsBlock icon={<Video size={18} className="text-red-500" />} label="Recordings Pool" value={recordings.length} bg="bg-red-100/70" />
          <StatsBlock icon={<Clock size={18} className="text-violet-500" />} label="Recorded Stream Time" value={`${Math.floor(totalDuration / 60)}m`} bg="bg-violet-100/70" />
          <StatsBlock icon={<CheckSquare size={18} className="text-emerald-500" />} label="Pending Tasks" value={pendingCount} bg="bg-emerald-100/70" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-sm flex flex-col">
            <h2 className="font-bold text-sm text-sky-950 flex items-center gap-2 mb-4"><FileText size={16} className="text-sky-500" /> Meeting Logs Trace</h2>
            <input type="text" placeholder="Search logs by keyword title..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border border-sky-100 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:border-sky-400 mb-4 transition-all" />
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 flex-1">
              {localizedFilteredArray.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10">No matching system records logged.</p>
              ) : (
                localizedFilteredArray.map(item => (
                  <div key={item._id} className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-4 hover:border-sky-200 transition-all">
                    <div onClick={() => handleRoomSecureVerification(item.meetingId)} className="flex-1 min-w-0 cursor-pointer">
                      <p className="text-xs font-bold text-sky-900 truncate">{item.title}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(item.createdAt).toLocaleDateString()}{item.summary ? ' · Click to open AI metrics block' : ' · Click to join stream'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* 🔒 FIXED HERE: m.summary was replaced with item.summary */}
                      <span onClick={() => item.summary ? setSummaryModal({ title: item.title, summary: item.summary, actionItems: item.actionItems || [], sentiment: item.sentiment || 'Neutral', meetingId: item.meetingId }) : handleRoomSecureVerification(item.meetingId)} className="text-[11px] font-bold text-sky-500 hover:text-sky-600 cursor-pointer transition-all">{item.summary ? 'View Insights →' : 'Join Room →'}</span>
                      <button onClick={() => purgeMeetingHistoryTrack(item.meetingId)} className="text-slate-300 hover:text-red-500 transition-all p-1"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-sm flex flex-col">
            <h2 className="font-bold text-sm text-sky-950 flex items-center gap-2 mb-4"><CheckSquare size={16} className="text-emerald-500" /> Personal Target Tasks</h2>
            <div className="flex gap-2 mb-4">
              <input type="text" placeholder="Type an item checkpoint..." value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTaskCreation()} className="w-full bg-slate-50 border border-sky-100 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:border-sky-400 transition-all" />
              <button onClick={handleTaskCreation} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-4 text-xs font-bold transition-all">Append</button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 flex-1">
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10">All checkpoints completely clean.</p>
              ) : (
                tasks.map(t => (
                  <div key={t.id} className={`flex items-center gap-3 p-2.5 bg-slate-50 border rounded-xl border-slate-100 transition-all ${t.done ? 'opacity-50' : ''}`}>
                    <button onClick={() => toggleTaskState(t.id)} className={`h-4 w-4 rounded-full border flex items-center justify-center text-[10px] text-white font-bold transition-all ${t.done ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>{t.done && '✓'}</button>
                    <span className={`text-xs flex-1 text-slate-600 ${t.done ? 'line-through text-slate-400' : ''}`}>{t.text}</span>
                    <button onClick={() => handleTaskRemoval(t.id)} className="text-slate-300 hover:text-red-500 transition-all text-xs px-1">✕</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatsBlock({ icon, label, value, bg }) {
  return (
    <div className="bg-white border border-sky-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${bg}`}>{icon}</div>
      <div>
        <p className="text-xl font-black text-sky-950 tracking-tight">{value}</p>
        <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">{label}</p>
      </div>
    </div>
  );
}