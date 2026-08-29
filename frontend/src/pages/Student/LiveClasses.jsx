import React, { useState, useEffect } from 'react';
import {
  PlayCircle,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Video,
  Info,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMyLiveSessions } from '../../services/liveService';
import { useSocket } from '../../context/SocketContext';

const toSessionArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.sessions)) return data.sessions;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getSessionId = (session) => session?._id || session?.id;
const getSessionDate = (session) => session?.scheduledAt || session?.startTime;
const isSessionLive = (session) => session?.status === 'live' || session?.isLive === true;
const isSessionJoinable = (session) => isSessionLive(session) || session?.status === 'starting';

const formatSessionDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'TBA';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const formatSessionTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Time TBA';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const LiveClasses = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLiveSessions();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleSessionStarted = (data) => {
      setSessions((prev) =>
        prev.map((s) =>
          getSessionId(s) === data.sessionId
            ? { ...s, status: 'live', isLive: true }
            : s
        )
      );
    };

    const handleSessionEnded = (data) => {
      setSessions((prev) =>
        prev.map((s) =>
          getSessionId(s) === data.sessionId
            ? { ...s, status: 'ended', isLive: false }
            : s
        )
      );
    };

    const handleClassCreated = () => {
      fetchLiveSessions();
    };

    const handleClassUpdated = (updatedSession) => {
      setSessions((prev) =>
        prev.map((s) =>
          getSessionId(s) === getSessionId(updatedSession)
            ? { ...s, ...updatedSession }
            : s
        )
      );
    };

    const handleClassDeleted = (data) => {
      setSessions((prev) =>
        prev.filter((s) => getSessionId(s) !== data.sessionId)
      );
    };

    socket.on("live-session-started", handleSessionStarted);
    socket.on("live-session-ended", handleSessionEnded);
    socket.on("liveClassCreated", handleClassCreated);
    socket.on("liveClassUpdated", handleClassUpdated);
    socket.on("liveClassDeleted", handleClassDeleted);

    return () => {
      socket.off("live-session-started", handleSessionStarted);
      socket.off("live-session-ended", handleSessionEnded);
      socket.off("liveClassCreated", handleClassCreated);
      socket.off("liveClassUpdated", handleClassUpdated);
      socket.off("liveClassDeleted", handleClassDeleted);
    };
  }, [socket]);

  const fetchLiveSessions = async () => {
    try {
      setLoading(true);
      const data = await getMyLiveSessions();
      setSessions(toSessionArray(data));
      setError(null);
    } catch (err) {
      console.error("Error fetching live sessions:", err);
      setError("Failed to load live sessions. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const attendanceHistory = [];

  const stats = [
    { label: 'Attended Classes', value: '0', icon: <CheckCircle2 className="text-green-600" />, bg: 'bg-green-50' },
    { label: 'Missed Classes', value: '0', icon: <XCircle className="text-red-600" />, bg: 'bg-red-50' },
    { label: 'Total Live Hours', value: '0h', icon: <Clock className="text-blue-600" />, bg: 'bg-blue-50' },
  ];

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center bg-white rounded-[2.5rem] border border-slate-200">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">Loading your live classes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[60vh] flex items-center justify-center bg-white rounded-[2.5rem] border border-slate-200">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h3 className="text-xl font-bold text-slate-900">Oops! Something went wrong</h3>
          <p className="text-slate-500 max-w-md">{error}</p>
          <button
            onClick={fetchLiveSessions}
            className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Live Learning Portal</h2>
        <p className="text-slate-500">Access your live sessions and track your attendance history.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Upcoming Classes */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Video size={20} className="text-blue-600" />
            Upcoming Live Classes
          </h3>

          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center gap-4">
                <Video size={48} className="text-slate-300" />
                <p className="text-slate-500 font-medium">No live classes scheduled for your enrolled courses yet.</p>
              </div>
            ) : (
              sessions.map((item) => {
                const sessionDate = getSessionDate(item);
                const live = isSessionLive(item);
                const joinable = isSessionJoinable(item);

                return (
                  <div key={getSessionId(item)} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:border-blue-300 transition-all group">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
                      <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center border-2 ${
                        live ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}>
                        <Calendar size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-widest mt-1">
                          {formatSessionDate(sessionDate)}
                        </span>
                      </div>

                      <div className="flex-1 space-y-3 text-center md:text-left">
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            live ? 'bg-red-600 text-white animate-pulse' : 'bg-blue-600 text-white'
                          }`}>
                            {live ? 'Live Now' : item.status === 'starting' ? 'Starting' : 'Upcoming'}
                          </span>
                          <span className="text-xs font-bold text-slate-900 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">
                            {item.course?.title || 'Course'}
                          </span>
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 line-clamp-1">{item.title}</h4>
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-sm font-medium text-slate-500">
                          <span className="flex items-center gap-1.5"><Clock size={16} /> {formatSessionTime(sessionDate)}</span>
                          <span className="flex items-center gap-1.5 font-bold text-blue-600">Instructor: {item.instructor?.name || 'Instructor'}</span>
                          {joinable ? (
                            <span className="text-red-600 font-bold text-xs">Live room is open</span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Link will be available when session starts</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => joinable && navigate(`/student/live-chat/${getSessionId(item)}`)}
                        disabled={!joinable}
                        className={`px-8 py-4 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 ${
                        joinable
                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-100 active:scale-95'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                      }`}>
                        {joinable ? (
                          <>
                            <PlayCircle size={20} />
                            Join Now
                          </>
                        ) : (
                          'Locked'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-6 bg-blue-50 rounded-2xl border border-dashed border-blue-200 flex items-start gap-4">
            <Info size={20} className="text-blue-600 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-blue-900">Live Class Availability</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Live classes are only available for purchased courses. Recordings will be available in the "My Courses" section within 24 hours of the session.
              </p>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar size={20} className="text-blue-600" />
            Attendance History
          </h3>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {attendanceHistory.length === 0 ? (
                <div className="p-10 text-center text-slate-400 italic text-xs">No attendance history found.</div>
              ) : (
                attendanceHistory.map((h) => (
                  <div key={h.id} className="p-5 hover:bg-slate-50 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{h.topic}</h5>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                        h.status === 'Attended' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {h.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-medium text-slate-400">
                      <span>{h.date}</span>
                      <span>{h.duration}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button className="w-full py-4 bg-slate-50 text-slate-500 font-bold text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
              Load More <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveClasses;
