import { useState, useEffect } from 'react';
import { Plus, Users, Trash2, CheckSquare, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../lib/api';
import Sidebar from '../components/Sidebar';

export default function Workspaces() {
  const [workspaces, setWorkspaces] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [expanded, setExpanded] = useState(null);
  
  const [taskInputs, setTaskInputs] = useState({});
  const [memberInputs, setMemberInputs] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedAssignees, setSelectedAssignees] = useState({});

  async function fetchWorkspacesFromServer() {
    try {
      setLoading(true);
      const { data } = await api.get('/workspaces');
      setWorkspaces(data);
    } catch (err) {
      console.error("Failed to load workspaces:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWorkspacesFromServer();
  }, []);

  async function createWorkspace() {
    if (!wsName.trim()) return;
    try {
      const payload = { name: wsName.trim(), description: wsDesc.trim(), members: [], tasks: [] };
      const { data } = await api.post('/workspaces', payload);
      setWorkspaces([...workspaces, data]);
      setWsName(''); setWsDesc('');
      setShowCreate(false);
    } catch (err) {
      alert("An error occurred while creating the workspace.");
    }
  }

  async function deleteWorkspace(id) {
    if (!window.confirm('Do you want to delete this workspace?')) return;
    try {
      await api.delete(`/workspaces/${id}`);
      setWorkspaces(workspaces.filter(w => w._id !== id));
    } catch (err) {
      alert("Delete failed");
    }
  }

  async function addMember(wsId) {
    const name = memberInputs[wsId]?.trim();
    if (!name) return;
    try {
      const { data } = await api.post(`/workspaces/${wsId}/members`, { name });
      setWorkspaces(workspaces.map(w => w._id === wsId ? data : w));
      setMemberInputs(p => ({ ...p, [wsId]: '' }));
    } catch (err) {
      alert("The member could not be added.");
    }
  }

  async function addTask(wsId) {
    const text = taskInputs[wsId]?.trim();
    if (!text) return;
    
    try {
      const assignedTo = selectedAssignees[wsId] || 'Unassigned';
      const payload = { text, assignedTo, status: 'todo' };

      const { data } = await api.post(`/workspaces/${wsId}/tasks`, payload);
      setWorkspaces(workspaces.map(w => w._id === wsId ? data : w));
      setTaskInputs(p => ({ ...p, [wsId]: '' }));
      
      setSelectedAssignees(p => ({ ...p, [wsId]: 'Unassigned' }));
    } catch (err) {
      alert("The task could not be added.");
    }
  }

  async function handleStatusChange(wsId, taskId, newStatus) {
    try {
      const { data } = await api.patch(`/workspaces/${wsId}/tasks/${taskId}`, { status: newStatus });
      setWorkspaces(workspaces.map(w => w._id === wsId ? data : w));
    } catch (err) {
      alert("Status update failed.");
    }
  }

  async function deleteTask(wsId, taskId) {
    try {
      const { data } = await api.delete(`/workspaces/${wsId}/tasks/${taskId}`);
      setWorkspaces(workspaces.map(w => w._id === wsId ? data : w));
    } catch (err) {
      alert("The Task could not be deleted.");
    }
  }

  function renderKanbanColumn(wsId, taskList, columnStatus, columnTitle) {
    const filteredTasks = taskList.filter(t => t.status === columnStatus || (!t.status && columnStatus === 'todo'));
    
    return (
      <div style={{ flex: 1, background: '#f8fafc', borderRadius: 12, padding: 14, border: '1px dashed #bae6fd', minWidth: '200px' }}>
        <h5 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: 12, textTransform: 'uppercase' }}>
          {columnTitle} ({filteredTasks.length})
        </h5>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredTasks.map(t => (
            <div key={t._id} style={{ background: 'white', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', flex: 1, wordBreak: 'break-word' }}>{t.text}</p>
                <button onClick={() => deleteTask(wsId, t._id)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </div>
              
              <p style={{ fontSize: '0.72rem', color: '#0ea5e9', fontWeight: 500, marginTop: 6 }}>👤 Assigned: {t.assignedTo}</p>
              
              <select
                value={t.status || 'todo'}
                onChange={(e) => handleStatusChange(wsId, t._id, e.target.value)}
                style={{ width: '100%', marginTop: 8, fontSize: '0.72rem', background: 'white', border: '1px solid #bae6fd', borderRadius: 6, padding: '4px', color: '#475569' }}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          ))}
          {filteredTasks.length === 0 && (
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>No tasks</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f9ff', fontFamily: 'Inter, sans-serif', color: '#334155' }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyStyle: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0c4a6e' }}>Workspaces</h1>
            <p style={{ color: '#64748b', marginTop: 4 }}>Manage teams and track automated AI Kanban operations [MERN Base]</p>
          </div>
          <button onClick={() => setShowCreate(s => !s)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <Plus size={17} /> New Workspace
          </button>
        </div>

        {showCreate && (
          <div style={{ background: 'white', border: '1.5px solid #bae6fd', borderRadius: 20, padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#0c4a6e', marginBottom: 16 }}>Create Workspace</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input" placeholder="Workspace name *" value={wsName} onChange={e => setWsName(e.target.value)} />
              <textarea className="input" style={{ minHeight: 80, resize: 'none' }} placeholder="Description" value={wsDesc} onChange={e => setWsDesc(e.target.value)} />
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={createWorkspace} className="btn-primary" style={{ flex: 1 }}>Create</button>
                <button onClick={() => setShowCreate(false)} style={{ flex: 1, background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 12, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>⏳ Fetching database boards...</div>
        ) : workspaces.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}><p style={{ fontSize: '3.5rem', marginBottom: 16 }}>🏢</p><p style={{ fontSize: '1.05rem', fontWeight: 600 }}>No active boards found.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {workspaces.map(ws => (
              <div key={ws._id} style={{ background: 'white', border: '1.5px solid #bae6fd', borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyStyle: 'space-between', padding: '20px 24px', cursor: 'pointer' }} onClick={() => setExpanded(expanded === ws._id ? null : ws._id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ background: '#e0f2fe', borderRadius: 12, padding: 10 }}><Users size={20} color="#0ea5e9" /></div>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#0c4a6e' }}>{ws.name}</h3>
                      {ws.description && <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>{ws.description}</p>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                    <button onClick={e => { e.stopPropagation(); deleteWorkspace(ws._id); }} style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '6px 10px', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={15} /></button>
                    {expanded === ws._id ? <ChevronUp size={20} color="#94a3b8" /> : <ChevronDown size={20} color="#94a3b8" />}
                  </div>
                </div>

                {expanded === ws._id && (
                  <div style={{ borderTop: '1.5px solid #e0f2fe', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                    
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0369a1', marginBottom: 12 }}>👥 Team Members</h4>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12, maxWidth: '400px' }}>
                        <input className="input" style={{ flex: 1, fontSize: '0.85rem' }} placeholder="Add member name..." value={memberInputs[ws._id] || ''} onChange={e => setMemberInputs(p => ({ ...p, [ws._id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addMember(ws._id)} />
                        <button onClick={() => addMember(ws._id)} className="btn-primary">Add</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {ws.members.length === 0 ? <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No members added yet</p> : 
                          ws.members.map(m => (
                            <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600 }}>
                              <span>{m.name}</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0369a1', marginBottom: 14 }}>📋 Kanban Sprint Board</h4>
                      
                      {/* 📋 DYNAMIC DROP-DOWN TASK CREATION PANEL INJECTED */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 16, maxWidth: '550px', flexWrap: 'wrap' }}>
                        <input className="input" style={{ flex: 2, fontSize: '0.85rem', minWidth: '200px' }} placeholder="Create new action task..." value={taskInputs[ws._id] || ''} onChange={e => setTaskInputs(p => ({ ...p, [ws._id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addTask(ws._id)} />
                        
                        <select
                          value={selectedAssignees[ws._id] || 'Unassigned'}
                          onChange={e => setSelectedAssignees(p => ({ ...p, [ws._id]: e.target.value }))}
                          style={{ flex: 1, padding: '8px 12px', borderRadius: '12px', border: '1px solid #bae6fd', fontSize: '0.85rem', outline: 'none', background: 'white', minWidth: '130px', cursor: 'pointer' }}
                        >
                          <option value="Unassigned">Assign Member</option>
                          {ws.members.map(mem => (
                            <option key={mem._id} value={mem.name}>{mem.name}</option>
                          ))}
                        </select>

                        <button onClick={() => addTask(ws._id)} className="btn-primary">Add Task</button>
                      </div>

                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {renderKanbanColumn(ws._id, ws.tasks, 'todo', 'To Do')}
                        {renderKanbanColumn(ws._id, ws.tasks, 'in-progress', 'In Progress')}
                        {renderKanbanColumn(ws._id, ws.tasks, 'done', 'Done')}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}