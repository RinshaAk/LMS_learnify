import React, { useEffect, useState } from 'react';
import {
  Users,
  ShieldCheck,
  Loader2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { watchLiveSession } from '../../services/liveService';

const LiveRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Choose a live class before opening the live room.');
      return;
    }

    const loadSession = async () => {
      try {
        setLoading(true);
        const data = await watchLiveSession(id);
        setSession(data.session);
        setError(null);
      } catch (err) {
        console.error('Error loading live room:', err);
        setError(err.response?.data?.message || 'This live session is not available yet.');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [id]);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center bg-white rounded-[2.5rem] border border-slate-200">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">Opening live room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[60vh] flex items-center justify-center bg-white rounded-[2.5rem] border border-slate-200">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h3 className="text-xl font-bold text-slate-900">Live room unavailable</h3>
          <p className="text-slate-500 max-w-md">{error}</p>
          <button
            onClick={() => navigate('/student/live-classes')}
            className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
          >
            Back to Live Classes
          </button>
        </div>
      </div>
    );
  }

  const playbackUrl = session?.playbackUrl;

  return (
    <div className="min-h-[calc(100vh-140px)]">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 leading-tight">{session?.title || 'Live Class'}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><Users size={16} /> {session?.course?.title || 'Course'}</span>
            <span className="flex items-center gap-1.5"><Users size={16} /> {session?.viewerCount || 0} Watching</span>
            <span className="flex items-center gap-1.5 text-blue-600 font-bold uppercase tracking-widest text-[10px]">{session?.status || 'Live'}</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-green-500" /> Secure Session</span>
          </div>
        </div>
        {playbackUrl ? (
          <a
            href={playbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-4 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg shadow-red-100"
          >
            <ExternalLink size={18} />
            Open Stream
          </a>
        ) : (
          <span className="px-5 py-3 bg-slate-100 text-slate-400 rounded-xl font-bold text-sm">
            Stream not ready
          </span>
        )}
      </div>
    </div>
  );
};

export default LiveRoom;
