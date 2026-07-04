import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../lib/api';

const SERVER_ENDPOINT = import.meta.env.VITE_API_URL || 'https://intellmeet-ai.onrender.com';
const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export default function MeetingRoom() {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const defaultVideoTrackRef = useRef(null);
  const peersRef = useRef({});
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingStartTimeRef = useRef(null);
  const chatBottomSpacerRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  const [participants, setParticipants] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const [screenSharing, setScreenSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recSaved, setRecSaved] = useState(false);
  const [recError, setRecError] = useState('');
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [ending, setEnding] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [error, setError] = useState('');
  const [fullView, setFullView] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  
  const [remoteCams, setRemoteCams] = useState({});
  const [remoteMics, setRemoteMics] = useState({});

  const sessionUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  })();
  const clientName = sessionUser.name || sessionUser.email || 'You';

  function triggerSystemNotification(notificationString) {
    setToastMessage(notificationString);
    setTimeout(() => setToastMessage(''), 2500);
  }

  useEffect(() => {
    api.get('/meetings').then(({ data }) => {
      const match = data.find(x => x.meetingId === meetingId);
      if (match) setMeetingInfo(match);
    }).catch(err => console.error(err));
  }, [meetingId]);

  useEffect(() => {
    api.patch(`/meetings/${meetingId}/start`).catch(() => {});
  }, [meetingId]);

  useEffect(() => {
    if (recording) {
      setElapsed(0);
      recordingIntervalRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    } else {
      clearInterval(recordingIntervalRef.current);
    }
    return () => clearInterval(recordingIntervalRef.current);
  }, [recording]);

  function getTimerString(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  useEffect(() => {
    let activeSocket;
    const establishConferenceSession = async () => {
      try {
        const streamPayload = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = streamPayload;
        defaultVideoTrackRef.current = streamPayload.getVideoTracks()[0];
        if (localVideoRef.current) localVideoRef.current.srcObject = streamPayload;

        activeSocket = io(SERVER_ENDPOINT, { transports: ['websocket'] });
        socketRef.current = activeSocket;

        activeSocket.on('connect', () => {
          activeSocket.emit('join-room', { roomId: meetingId, user: { name: clientName, id: activeSocket.id } });
        });

        activeSocket.on('existing-participants', async peerList => {
          for (const targetNode of peerList) {
            await initializePeerHandshake(targetNode.socketId, activeSocket, streamPayload);
          }
        });

        activeSocket.on('participants-updated', synchronizedList => setParticipants(synchronizedList));

        activeSocket.on('webrtc-offer', async ({ from, offer }) => {
          const connectionInstance = createPeerConnection(from, activeSocket, localStreamRef.current);
          await connectionInstance.setRemoteDescription(new RTCSessionDescription(offer));
          const responseAnswer = await connectionInstance.createAnswer();
          await connectionInstance.setLocalDescription(responseAnswer);
          activeSocket.emit('webrtc-answer', { to: from, answer: responseAnswer });
        });

        activeSocket.on('webrtc-answer', async ({ from, answer }) => {
          const targetPeer = peersRef.current[from];
          if (targetPeer) await targetPeer.setRemoteDescription(new RTCSessionDescription(answer));
        });

        activeSocket.on('webrtc-ice-candidate', ({ from, candidate }) => {
          const targetPeer = peersRef.current[from];
          if (targetPeer && candidate) targetPeer.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        });

        activeSocket.on('participant-left', ({ socketId }) => {
          if (peersRef.current[socketId]) {
            peersRef.current[socketId].close();
            delete peersRef.current[socketId];
          }
          setRemoteStreams(prev => { const cleanSet = { ...prev }; delete cleanSet[socketId]; return cleanSet; });
          setRemoteCams(prev => { const cleanSet = { ...prev }; delete cleanSet[socketId]; return cleanSet; });
          setRemoteMics(prev => { const cleanSet = { ...prev }; delete cleanSet[socketId]; return cleanSet; });
        });

        activeSocket.on('receive-message', incomingMsg => setMessages(prev => [...prev, incomingMsg]));

        activeSocket.on('peer-media-state-broadcast', ({ socketId, targetMediaType, statusValue }) => {
          if (targetMediaType === 'video') {
            setRemoteCams(prev => ({ ...prev, [socketId]: statusValue }));
          } else if (targetMediaType === 'audio') {
            setRemoteMics(prev => ({ ...prev, [socketId]: statusValue }));
          }
        });

      } catch (mediaCaptureException) {
        console.error(mediaCaptureException);
        setError('Camera/microphone hardware tracking capture failure.');
      }
    };

    establishConferenceSession();

    return () => {
      clearInterval(recordingIntervalRef.current);
      screenStreamRef.current?.getTracks().forEach(track => track.stop());
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      Object.values(peersRef.current).forEach(peerInstance => peerInstance.close());
      if (activeSocket) activeSocket.disconnect();
    };
  }, [meetingId, clientName]);

  useEffect(() => { chatBottomSpacerRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function createPeerConnection(targetSocketId, connectionSocket, liveStream) {
    if (peersRef.current[targetSocketId]) return peersRef.current[targetSocketId];
    const peerConnection = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current[targetSocketId] = peerConnection;

    liveStream.getTracks().forEach(track => peerConnection.addTrack(track, liveStream));

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        connectionSocket.emit('webrtc-ice-candidate', { to: targetSocketId, candidate: event.candidate });
      }
    };

    peerConnection.ontrack = event => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams(prev => ({ ...prev, [targetSocketId]: event.streams[0] }));
        setRemoteCams(prev => ({ ...prev, [targetSocketId]: true }));
        setRemoteMics(prev => ({ ...prev, [targetSocketId]: true }));
      }
    };

    return peerConnection;
  }

  async function initializePeerHandshake(targetSocketId, signalingSocket, streamReference) {
    const peerNode = createPeerConnection(targetSocketId, signalingSocket, streamReference);
    const sessionOffer = await peerNode.createOffer();
    await peerNode.setLocalDescription(sessionOffer);
    signalingSocket.emit('webrtc-offer', { to: targetSocketId, offer: sessionOffer });
  }

  function hotSwapVideoTracks(freshTrack) {
    Object.values(peersRef.current).forEach(connection => {
      const videoSender = connection.getSenders().find(sender => sender.track?.kind === 'video');
      if (videoSender) videoSender.replaceTrack(freshTrack);
    });
  }

  async function initializeDisplayCapture() {
    try {
      const displayStreamInstance = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const displayVideoTrack = displayStreamInstance.getVideoTracks()[0];
      screenStreamRef.current = displayStreamInstance;
      hotSwapVideoTracks(displayVideoTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = new MediaStream([displayVideoTrack]);
      setScreenSharing(true);
      displayVideoTrack.addEventListener('ended', () => fallbackToDefaultCameraSource());
    } catch {
      console.log("Display selection aborted");
    }
  }

  function fallbackToDefaultCameraSource() {
    const fallbackTrack = defaultVideoTrackRef.current;
    if (fallbackTrack) hotSwapVideoTracks(fallbackTrack);
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    setScreenSharing(false);
    setFullView(null);
  }

  function executeAudioMuteToggle() {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      const toggledState = !micOn;
      audioTrack.enabled = toggledState;
      setMicOn(toggledState);
      socketRef.current?.emit('media-state', { roomId: meetingId, targetMediaType: 'audio', statusValue: toggledState });
    }
  }

  function executeVideoFeedToggle() {
    const videoTrack = defaultVideoTrackRef.current;
    if (videoTrack) {
      const toggledState = !camOn;
      videoTrack.enabled = toggledState;
      setCamOn(toggledState);
      socketRef.current?.emit('media-state', { roomId: meetingId, targetMediaType: 'video', statusValue: toggledState });
      if (localVideoRef.current && localStreamRef.current && toggledState) localVideoRef.current.srcObject = localStreamRef.current;
    }
  }

  function processOutboundMessage() {
    if (!chatInput.trim() || !socketRef.current) return;
    const communicationObject = {
      roomId: meetingId,
      sender: clientName,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    socketRef.current.emit('send-message', communicationObject);
    setChatInput('');
  }

  async function triggerStreamRecording() {
    try {
      const targetedStream = screenSharing ? screenStreamRef.current : localStreamRef.current;
      if (!targetedStream) return;
      recordedChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      setRecSaved(false); setRecError('');

      const dynamicMimeCodecString = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
      const executionRecorder = new MediaRecorder(targetedStream, { mimeType: dynamicMimeCodecString });
      mediaRecorderRef.current = executionRecorder;
      executionRecorder.ondataavailable = event => { if (event.data?.size > 0) recordedChunksRef.current.push(event.data); };
      executionRecorder.onstop = () => dispatchBinaryPayloadToCloud();
      executionRecorder.start(1000);
      setRecording(true);
    } catch (err) { setRecError(err.message); }
  }

  function haltStreamRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  async function dispatchBinaryPayloadToCloud() {
    if (recordedChunksRef.current.length === 0) return;
    setUploading(true);
    try {
      const storageBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const computedDuration = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
      const targetHeaderTitle = meetingInfo?.title || meetingId;
      const computationalFormPayload = new FormData();
      computationalFormPayload.append('video', storageBlob, `${targetHeaderTitle}.webm`);
      computationalFormPayload.append('meetingTitle', targetHeaderTitle);
      computationalFormPayload.append('meetingId', meetingId);
      computationalFormPayload.append('duration', String(computedDuration));

      const response = await fetch(`${SERVER_ENDPOINT}/api/recordings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: computationalFormPayload
      });
      if (!response.ok) throw new Error("Upload fail");
      setRecSaved(true);
      triggerSystemNotification("✅ Recording saved successfully!");
      setTimeout(() => setRecSaved(false), 4000);
    } catch { setRecError('Failed to capture and upload recording.'); } finally { setUploading(false); }
  }

  async function terminateMeetingSession() {
    if (ending) return;
    setEnding(true);

    const textChatLog = messages.map(msg => `${msg.sender}: ${msg.text}`).join('\n');
    const compoundPayloadLog = `=== CHAT LOGS ===\n${textChatLog || 'No chat messages exchanged during video session.'}`;

    try {
      if (recording && mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      const response = await api.patch(`/meetings/${meetingId}/end`, { 
        chatLog: compoundPayloadLog, 
        rawChatsOnly: textChatLog || 'No messages found.',
        title: meetingInfo?.title || meetingId 
      });
      
      if (response.data?.workspaceTasks && response.data.workspaceTasks.length > 0) {
        try {
          const activeWorkspaceState = JSON.parse(localStorage.getItem('intellmeet_workspaces') || '[]');
          const autoInjectedWorkspaceNode = {
            id: Date.now(),
            name: `AI Tasks: ${meetingInfo?.title || meetingId}`,
            description: `Auto-generated board mapped on ${new Date().toLocaleDateString()}`,
            members: [], tasks: []
          };
          const trackedNames = new Set();
          response.data.workspaceTasks.forEach(obj => { if (obj.name && obj.name !== 'Unassigned') trackedNames.add(obj.name); });
          autoInjectedWorkspaceNode.members = Array.from(trackedNames).map((str, idx) => ({ id: Date.now() + idx, name: str }));
          autoInjectedWorkspaceNode.tasks = response.data.workspaceTasks.map((obj, idx) => ({
            id: Date.now() + idx + 100,
            text: obj.lastDate ? `${obj.work} [Deadline: ${obj.lastDate}]` : obj.work,
            assignedTo: obj.name || 'Unassigned',
            done: false, createdAt: new Date().toISOString()
          }));
          activeWorkspaceState.push(autoInjectedWorkspaceNode);
          localStorage.setItem('intellmeet_workspaces', JSON.stringify(activeWorkspaceState));
        } catch {}
      }
      navigate('/dashboard', {
        state: {
          summary: response.data.meeting?.summary || response.data.summary,
          actionItems: response.data.meeting?.actionItems || response.data.actionItems || [],
          sentiment: response.data.meeting?.sentiment || response.data.sentiment || 'Neutral',
          meetingTitle: meetingInfo?.title || meetingId,
          meetingId, fromMeeting: true,
        },
      });
    } catch { navigate('/dashboard'); }
  }

  return (
    <div className="flex min-h-screen flex-col bg-sky-50 font-sans relative">
      {fullView && <FullViewModal stream={fullView.stream} title={fullView.title} muted={fullView.muted} camOn={fullView.camOn} onClose={() => setFullView(null)} />}
      
      {toastMessage && <div className="fixed top-6 right-6 bg-sky-600 text-white px-6 py-3 rounded-xl z-[10000] font-semibold shadow-xl">{toastMessage}</div>}

      <header className="flex items-center justify-between border-b border-sky-200 bg-white px-6 py-3 shadow-sm">
        <div>
          <p className="text-base font-bold text-sky-800">{meetingInfo?.title || meetingId}</p>
          <p className="font-mono text-xs text-slate-400">{meetingId}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm text-slate-500">👥 {participants.length + 1} participants</span>
          {recording && <span className="flex items-center gap-2 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-sm text-red-600"><span className="h-2 w-2 animate-ping rounded-full bg-red-500"/>REC {getTimerString(elapsed)}</span>}
          {uploading && <span className="rounded-full bg-amber-100 text-amber-700 border border-amber-300 px-3 py-1 text-xs font-bold animate-pulse">⏳ Syncing Block...</span>}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <div className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(300px,420px))] content-start justify-center gap-5 overflow-y-auto p-5">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-sky-500 bg-slate-900 shadow-lg flex items-center justify-center">
            {camOn ? <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" /> : <div className="h-28 w-28 rounded-full bg-sky-600 flex items-center justify-center text-white text-4xl font-bold uppercase select-none shadow">{clientName.charAt(0)}</div>}
            {!micOn && <div className="absolute top-3 right-3 bg-red-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 z-10 shadow-md"><span>🔇</span> Mic Off</div>}
            <div className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white backdrop-blur-sm">{clientName} (You)</div>
            <button onClick={() => setFullView({ stream: localStreamRef.current, title: `${clientName} (You)`, muted: true, camOn: camOn })} className="absolute right-3 bottom-3 text-xs bg-black/70 text-white px-2 py-1 rounded-lg backdrop-blur-sm">⛶ Full</button>
          </div>

          {Object.entries(remoteStreams).map(([socketId, stream]) => {
            const nodeUser = participants.find(x => x.socketId === socketId);
            const displayedName = nodeUser?.user?.name || 'Participant';
            const statusCam = remoteCams[socketId] !== false;
            const statusMic = remoteMics[socketId] !== false;

            return (
              <div key={socketId} className="relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-lg flex items-center justify-center">
                {statusCam ? <RemoteVideoComponent stream={stream} /> : <div className="h-28 w-28 rounded-full bg-emerald-600 flex items-center justify-center text-white text-4xl font-bold uppercase shadow select-none">{displayedName.charAt(0)}</div>}
                {!statusMic && <div className="absolute top-3 right-3 bg-red-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 z-10 shadow-md"><span>🔇</span> Mic Off</div>}
                <div className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white backdrop-blur-sm">{displayedName}</div>
                <button onClick={() => setFullView({ stream, title: displayedName, muted: false, camOn: statusCam })} className="absolute right-3 bottom-3 text-xs bg-black/70 text-white px-2 py-1 rounded-lg backdrop-blur-sm">⛶ Full</button>
              </div>
            );
          })}
        </div>

        {showChat && (
          <div className="flex w-80 flex-col border-l border-sky-200 bg-white">
            <div className="border-b border-sky-100 px-4 py-3 text-sm font-semibold text-sky-700">💬 Chat</div>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center text-slate-400 font-medium my-auto select-none">
                  <div className="text-3xl mb-1">👋</div>
                  <p className="text-sm tracking-wide">Say Hello</p>
                </div>
              ) : (
                messages.map((m, i) => {
                  const verifiedIdentityMatch = m.sender === clientName;
                  return (
                    <div key={i} className={`flex flex-col w-full ${verifiedIdentityMatch ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] font-bold text-slate-400 mb-0.5 px-1">{verifiedIdentityMatch ? 'You' : m.sender}</span>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm break-words ${verifiedIdentityMatch ? 'bg-sky-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>{m.text}</div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomSpacerRef} />
            </div>
            <div className="flex gap-2 border-t border-sky-100 p-3">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && processOutboundMessage()} placeholder="Type a message..." className="flex-1 rounded-xl border p-2 text-sm outline-none bg-slate-50 focus:bg-white focus:border-sky-400 transition-all" />
              <button onClick={processOutboundMessage} className="rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 px-4 text-white font-bold transition-all">➤</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-sky-200 bg-white px-6 py-4 shadow-sm">
        <ControlBtn onClick={executeAudioMuteToggle} icon={micOn ? '🎤' : '🔇'} label="Mic" active={!micOn} />
        <ControlBtn onClick={executeVideoFeedToggle} icon={camOn ? '📷' : '📹 Video Off'} label="Cam" active={!camOn} />
        <ControlBtn onClick={screenSharing ? fallbackToDefaultCameraSource : initializeDisplayCapture} icon="🖥️" label="Share" active={screenSharing} />
        <ControlBtn onClick={recording ? haltStreamRecording : triggerStreamRecording} icon={uploading ? "⏳" : "⏺"} label={uploading ? "Saving..." : recording ? "Stop Rec" : "Record"} active={recording} />
        <ControlBtn onClick={() => setShowChat(s => !s)} icon="💬" label="Chat" active={showChat} />
        <ControlBtn onClick={() => { navigator.clipboard.writeText(window.location.href); triggerSystemNotification("🔗 Link copied successfully!"); }} icon="🔗" label="Copy Link" />
        <button onClick={terminateMeetingSession} disabled={ending} className="rounded-2xl bg-gradient-to-r from-red-500 to-red-700 px-7 py-3 text-sm font-bold text-white shadow-lg">End Meeting</button>
      </div>
    </div>
  );
}

function FullViewModal({ stream, title, muted, camOn, onClose }) {
  const modalVideoElementRef = useRef(null);
  useEffect(() => { if (modalVideoElementRef.current && stream && camOn) modalVideoElementRef.current.srcObject = stream; }, [stream, camOn]);
  return (
    <div className="fixed inset-0 bg-slate-950 w-screen h-screen flex flex-col z-[99999]">
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-slate-900/90 to-transparent px-6 py-5 text-white flex items-center justify-between z-[100000]">
        <p className="font-bold text-lg drop-shadow">{title}</p>
        <button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow">✕ Exit Full Screen</button>
      </div>
      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        {camOn ? <video ref={modalVideoElementRef} autoPlay muted={muted} playsInline className="w-full h-full object-cover block" /> : <div className="h-48 w-48 rounded-full bg-sky-600 flex items-center justify-center text-white text-7xl font-bold uppercase shadow-2xl animate-pulse select-none">{title.charAt(0)}</div>}
      </div>
    </div>
  );
}

function RemoteVideoComponent({ stream }) {
  const elementRef = useRef(null);
  useEffect(() => { if (elementRef.current && stream) elementRef.current.srcObject = stream; }, [stream]);
  return <video ref={elementRef} autoPlay playsInline className="h-full w-full object-cover" />;
}

function ControlBtn({ onClick, icon, label, active }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 rounded-2xl border px-4 py-2 text-xs transition-all duration-150 active:scale-95 ${active ? 'bg-sky-100 border-sky-500 font-bold' : 'bg-sky-50 hover:bg-sky-100'}`}>
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  );
}