import { useEffect, useState } from "react";
import { Trash2, Share2, Copy, Check, Play, X } from "lucide-react";
import Sidebar from "../components/Sidebar";
import api from "../lib/api";

export default function Recordings() {
  const [recordings, setRecordings]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [playingId, setPlayingId]     = useState(null);
  const [copiedId, setCopiedId]       = useState(null);
  const [toast, setToast]             = useState("");
  const [confirmId, setConfirmId]     = useState(null);

  useEffect(() => { loadRecordings(); }, []);

  function loadRecordings() {
    setLoading(true);
    api.get("/recordings")
      .then(res => setRecordings(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleShare(rec) {
    const url   = rec.videoUrl;
    const title = rec.meetingTitle || "Meeting Recording";

    if (navigator.share) {
      try {
        await navigator.share({ title, text: `Watch: ${title}`, url });
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
        
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(rec._id);
      showToast("✅ Link copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      showToast("❌ Copy failed.");
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/recordings/${id}`);
      setRecordings(prev => prev.filter(r => r._id !== id));
      setConfirmId(null);
      showToast("🗑️ Recording deleted!");
    } catch (err) {
      console.error(err);
      showToast("❌ Delete failed. Try again.");
    }
  }

  function formatDur(s) {
    if (!s) return "";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)] font-sans">
      <Sidebar />

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-6 z-[9999] bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-5 py-3 font-semibold text-sm text-[var(--text-primary)] shadow-xl animate-slide-in">
          {toast}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmId && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="text-5xl mb-4">🗑️</div>

            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
              Delete Recording?
            </h3>

            <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
             Do you really want to delete this recording?
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-muted)] font-semibold text-sm hover:opacity-80 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmId)}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold text-sm hover:opacity-90 transition-all cursor-pointer"
              >
                Yes, delete it.
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-8 overflow-y-auto">

        {/* Header */}
        <div className="mb-7">
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
            Recordings
          </h1>
          <p className="text-[var(--text-muted)] mt-1 text-sm">
            {recordings.length} recording{recordings.length !== 1 ? "s" : ""} saved
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-[var(--text-muted)]">
            <div className="text-4xl mb-3 animate-spin">⏳</div>
            <p>Loading recordings...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && recordings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-28 text-[var(--text-faint)]">
            <div className="text-6xl mb-4">🎥</div>
            <p className="text-lg font-semibold text-[var(--text-muted)]">
              There are no recordings yet.
            </p>
            <p className="text-sm mt-2">
              Press the record button during the meeting to save the recording.
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && recordings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {recordings.map(rec => (
              <div
                key={rec._id}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
              >
                {/* Video area */}
                <div className="relative bg-slate-900 aspect-video">
                  {playingId === rec._id ? (
                    <>
                      <video
                        src={rec.videoUrl}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                      />
                      <button
                        onClick={() => setPlayingId(null)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black transition-all cursor-pointer border-0"
                      >
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <div
                      onClick={() => setPlayingId(rec._id)}
                      className="w-full h-full flex flex-col items-center justify-center cursor-pointer gap-2"
                      style={{ background: "linear-gradient(135deg, #075985, #0c4a6e)" }}
                    >
                      <div className="w-12 h-12 rounded-full bg-sky-500/90 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                        <Play size={20} color="white" fill="white" />
                      </div>
                      <span className="text-white/70 text-xs">Click to play</span>

                      {/* Duration badge */}
                      {rec.duration > 0 && (
                        <div className="absolute bottom-2 right-3 bg-sky-900/80 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                          {formatDur(rec.duration)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h2 className="font-bold text-[var(--text-primary)] text-base mb-1 truncate">
                    {rec.meetingTitle || "Untitled Recording"}
                  </h2>

                  <p className="text-xs text-[var(--text-muted)] mb-3">
                    {new Date(rec.createdAt).toLocaleString("en-IN", {
                      weekday: "short", year: "numeric",
                      month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                    {rec.duration > 0 && (
                      <span className="text-sky-500 font-semibold">
                        {" "}· {formatDur(rec.duration)}
                      </span>
                    )}
                  </p>

                  {rec.description && (
                    <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed line-clamp-2">
                      {rec.description}
                    </p>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2 mt-1">

                    {/* Play / Close */}
                    <button
                      onClick={() => setPlayingId(playingId === rec._id ? null : rec._id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border-0 ${
                        playingId === rec._id
                          ? "bg-[var(--bg-main)] text-[var(--text-muted)]"
                          : "bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:opacity-90"
                      }`}
                    >
                      {playingId === rec._id
                        ? <><X size={13} /> Close</>
                        : <><Play size={13} fill="white" /> Play</>
                      }
                    </button>

                    {/* Share */}
                    <button
                      onClick={() => handleShare(rec)}
                      title="Share recording"
                      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        copiedId === rec._id
                          ? "bg-green-50 border-green-300 text-green-600"
                          : "bg-[var(--bg-main)] border-[var(--border)] text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30"
                      }`}
                    >
                      {copiedId === rec._id
                        ? <><Check size={13} /> Copied!</>
                        : <><Share2 size={13} /> Share</>
                      }
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setConfirmId(rec._id)}
                      title="Delete recording"
                      className="flex items-center justify-center px-3 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.2s ease; }
      `}</style>
    </div>
  );
}