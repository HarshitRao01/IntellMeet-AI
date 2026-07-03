import { useRef, useState } from 'react';

export default function ScreenRecorder({ meetingTitle, description, meetingId, onRecordingComplete }) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);

  const startRecording = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const finalStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...screenStream.getAudioTracks(),
        ...micStream.getAudioTracks(),
      ]);

      chunksRef.current = [];
      startTimeRef.current = Date.now();

      const mediaRecorder = new MediaRecorder(finalStream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        await uploadRecording(blob, duration);
        finalStream.getTracks().forEach(t => t.stop());
      };

      screenStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setRecording(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error(error);
      alert('Screen recording permission denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadRecording = async (blob, duration) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('video', blob, `${meetingTitle || 'meeting'}.webm`);
      formData.append('meetingTitle', meetingTitle || 'Untitled Meeting');
      formData.append('description', description || 'Meeting recording');
      formData.append('meetingId', meetingId || '');
      formData.append('duration', duration || 0);

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/recordings/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (onRecordingComplete) onRecordingComplete(data.recording);
      alert('Recording saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Recording upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <button
      onClick={recording ? stopRecording : startRecording}
      disabled={uploading}
      className={`px-4 py-2 rounded-xl text-white font-semibold transition-all ${
        uploading ? 'bg-gray-600 cursor-not-allowed'
        : recording ? 'bg-red-600 animate-pulse hover:bg-red-700'
        : 'bg-blue-600 hover:bg-blue-700'
      }`}
    >
      {uploading ? '⏳ Uploading...' : recording ? '⏹ Stop Recording' : '⏺ Start Recording'}
    </button>
  );
}