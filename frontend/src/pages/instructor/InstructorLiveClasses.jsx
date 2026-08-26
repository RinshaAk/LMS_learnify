import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Square,
  Trash2,
  Video,
  XCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { fetchInstructorDashboard } from '../../features/instructor/instructorThunk';
import {
  cancelLiveSession,
  createLiveSession,
  deleteLiveSession,
  endLiveSession,
  getInstructorLiveSessions,
  getLiveSessionStatus,
  startLiveSession,
} from '../../services/liveService';
import { useSocket } from '../../context/SocketContext';

const STATUS_META = {
  scheduled: {
    label: 'Scheduled',
    className: 'bg-blue-50 text-blue-700 border-blue-100',
    dot: 'bg-blue-500',
  },
  starting: {
    label: 'Waiting for OBS',
    className: 'bg-amber-50 text-amber-700 border-amber-100',
    dot: 'bg-amber-500 animate-pulse',
  },
  live: {
    label: 'LIVE',
    className: 'bg-red-600 text-white border-red-600',
    dot: 'bg-white animate-pulse',
  },
  ended: {
    label: 'Ended',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-rose-50 text-rose-700 border-rose-100',
    dot: 'bg-rose-500',
  },
  failed: {
    label: 'Failed',
    className: 'bg-orange-50 text-orange-700 border-orange-100',
    dot: 'bg-orange-500',
  },
};

const POLLABLE_STATUSES = new Set(['starting', 'live']);

const getSessionId = (session) => session?._id || session?.id;
const getSessionDate = (session) => session?.scheduledAt || session?.startTime;
const getSessionStatus = (session) => session?.status || (session?.isLive ? 'live' : 'scheduled');

const toSessionArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.sessions)) return data.sessions;
  return [];
};

const formatDate = (value) => {
  if (!value) return 'Not scheduled';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (value) => {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const copyText = async (value) => {
  await navigator.clipboard.writeText(value);
};

const InstructorLiveClasses = () => {
  const dispatch = useDispatch();
  const { dashboardData } = useSelector((state) => state.instructor);
  const { socket } = useSocket();

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [preparingIds, setPreparingIds] = useState(() => new Set());
  const [endingIds, setEndingIds] = useState(() => new Set());
  const [deletingIds, setDeletingIds] = useState(() => new Set());
  const [cancellingIds, setCancellingIds] = useState(() => new Set());
  const [broadcastCredentials, setBroadcastCredentials] = useState(null);
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  const sessionsRef = useRef([]);
  const pollingInFlightRef = useRef(new Set());
  const pollingTimerRef = useRef(null);
  const preparingIdsRef = useRef(new Set());

  const courses = dashboardData?.courses || [];

  const clearBroadcastCredentials = useCallback(() => {
    setBroadcastCredentials(null);
    setShowStreamKey(false);
    setCopiedField('');
  }, []);

  useEffect(() => {
    return () => {
      clearBroadcastCredentials();
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
      pollingInFlightRef.current.clear();
      preparingIdsRef.current.clear();
    };
  }, [clearBroadcastCredentials]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    if (!dashboardData) {
      dispatch(fetchInstructorDashboard());
    }
  }, [dispatch, dashboardData]);

  useEffect(() => {
    if (courses.length > 0 && !courseId) {
      setCourseId(courses[0]._id);
    }
  }, [courses, courseId]);

  const fetchSessions = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const data = await getInstructorLiveSessions();
      setSessions(toSessionArray(data));
      setPageError('');
    } catch (error) {
      setPageError(error.response?.data?.message || 'Failed to load live sessions.');
      if (!silent) {
        toast.error(error.response?.data?.message || 'Failed to load live sessions.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleRefresh = () => {
      fetchSessions({ silent: true });
    };

    socket.on('liveClassCreated', handleRefresh);
    socket.on('liveClassUpdated', handleRefresh);
    socket.on('liveClassDeleted', handleRefresh);
    socket.on('live-session-ended', handleRefresh);

    return () => {
      socket.off('liveClassCreated', handleRefresh);
      socket.off('liveClassUpdated', handleRefresh);
      socket.off('liveClassDeleted', handleRefresh);
      socket.off('live-session-ended', handleRefresh);
    };
  }, [fetchSessions, socket]);

  const updateSession = useCallback((id, patch) => {
    setSessions((current) =>
      current.map((session) =>
        getSessionId(session) === id ? { ...session, ...patch } : session
      )
    );
  }, []);

  const pollSessionStatus = useCallback(async (session) => {
    const id = getSessionId(session);
    if (!id || pollingInFlightRef.current.has(id)) return;

    pollingInFlightRef.current.add(id);
    try {
      const data = await getLiveSessionStatus(id);
      updateSession(id, {
        status: data.status,
        viewerCount: data.viewerCount ?? session.viewerCount ?? 0,
        startedAt: data.startedAt || session.startedAt,
      });
    } catch {
      updateSession(id, {
        lastStatusErrorAt: new Date().toISOString(),
      });
    } finally {
      pollingInFlightRef.current.delete(id);
    }
  }, [updateSession]);

  useEffect(() => {
    const pollableSessions = sessions.filter((session) =>
      POLLABLE_STATUSES.has(getSessionStatus(session))
    );

    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    if (pollableSessions.length === 0) return undefined;

    pollingTimerRef.current = setInterval(() => {
      sessionsRef.current
        .filter((session) => POLLABLE_STATUSES.has(getSessionStatus(session)))
        .forEach((session) => {
          pollSessionStatus(session);
        });
    }, 5000);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [pollSessionStatus, sessions]);

  const resetScheduleForm = () => {
    setTitle('');
    setDescription('');
    setScheduledDate('');
    setScheduledTime('');
  };

  const closeScheduleForm = () => {
    setShowScheduleForm(false);
    resetScheduleForm();
  };

  const closeCredentialsModal = () => {
    if (broadcastCredentials?.streamKey) {
      const confirmed = window.confirm(
        'The one-time stream key will be hidden and cannot be recovered from this screen. Close this OBS setup window?'
      );

      if (!confirmed) return;
    }

    clearBroadcastCredentials();
  };

  const handleScheduleSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim()) return toast.error('Please enter a class title');
    if (!courseId) return toast.error('Please select a course');
    if (!scheduledDate) return toast.error('Please select a date');
    if (!scheduledTime) return toast.error('Please select a time');

    try {
      setSubmitting(true);
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
      const data = await createLiveSession({
        courseId,
        title: title.trim(),
        description: description.trim(),
        scheduledAt: scheduledAt.toISOString(),
      });

      if (data?.session) {
        setSessions((current) => [data.session, ...current]);
      }

      toast.success('Live class scheduled successfully');
      closeScheduleForm();
      fetchSessions({ silent: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to schedule live class');
    } finally {
      setSubmitting(false);
    }
  };

  const setIdLoading = (setter, id, isLoading) => {
    setter((current) => {
      const next = new Set(current);
      if (isLoading) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handlePrepareStream = async (session) => {
    const id = getSessionId(session);
    const status = getSessionStatus(session);

    if (!id || preparingIdsRef.current.has(id) || preparingIds.has(id)) return;
    if (status === 'ended' || status === 'cancelled' || status === 'live') return;

    preparingIdsRef.current.add(id);
    setIdLoading(setPreparingIds, id, true);

    try {
      const data = await startLiveSession(id);
      const serverUrl = data?.broadcast?.serverUrl;
      const streamKey = data?.broadcast?.streamKey;

      if (!serverUrl || !streamKey) {
        toast.error('OBS credentials were not returned by the server.');
        return;
      }

      updateSession(id, {
        ...(data.session || {}),
        status: data.session?.status || 'starting',
      });
      setBroadcastCredentials({
        sessionId: id,
        sessionTitle: session.title,
        serverUrl,
        streamKey,
      });
      setShowStreamKey(false);
      setCopiedField('');
      toast.success('Stream prepared. Copy the OBS details before closing.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to prepare stream');
    } finally {
      preparingIdsRef.current.delete(id);
      setIdLoading(setPreparingIds, id, false);
    }
  };

  const handleCopy = async (field, value) => {
    try {
      await copyText(value);
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField((current) => (current === field ? '' : current));
      }, 2000);
    } catch {
      toast.error('Copy failed. Select the value and copy it manually.');
    }
  };

  const handleEndStream = async (session) => {
    const id = getSessionId(session);
    if (!id || endingIds.has(id)) return;

    const confirmed = window.confirm('End this live stream for all viewers?');
    if (!confirmed) return;

    setIdLoading(setEndingIds, id, true);
    try {
      const data = await endLiveSession(id);
      updateSession(id, {
        ...(data.session || {}),
        status: data.session?.status || 'ended',
        viewerCount: 0,
      });
      if (broadcastCredentials?.sessionId === id) {
        clearBroadcastCredentials();
      }
      toast.success('Live session ended');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to end live session');
    } finally {
      setIdLoading(setEndingIds, id, false);
    }
  };

  const handleCancelSession = async (session) => {
    const id = getSessionId(session);
    const status = getSessionStatus(session);
    if (!id || status === 'live' || status === 'ended' || status === 'cancelled') return;

    const reason = window.prompt('Cancellation reason (optional):', '');
    if (reason === null) return;

    setIdLoading(setCancellingIds, id, true);
    try {
      const data = await cancelLiveSession(id, reason);
      updateSession(id, {
        ...(data.session || {}),
        status: data.session?.status || 'cancelled',
        viewerCount: 0,
      });
      if (broadcastCredentials?.sessionId === id) {
        clearBroadcastCredentials();
      }
      toast.success('Live session cancelled');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel live session');
    } finally {
      setIdLoading(setCancellingIds, id, false);
    }
  };

  const handleDeleteSession = async (session) => {
    const id = getSessionId(session);
    const status = getSessionStatus(session);
    if (!id || status === 'live' || status === 'starting') return;

    const confirmed = window.confirm('Delete this live class session permanently?');
    if (!confirmed) return;

    setIdLoading(setDeletingIds, id, true);
    try {
      await deleteLiveSession(id);
      setSessions((current) => current.filter((item) => getSessionId(item) !== id));
      toast.success('Live session deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete live session');
    } finally {
      setIdLoading(setDeletingIds, id, false);
    }
  };

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return sessions.filter((session) => {
      const status = getSessionStatus(session);
      const isPast = status === 'ended' || status === 'cancelled' || status === 'failed';
      const tabMatch = activeTab === 'upcoming' ? !isPast : isPast;
      const searchMatch =
        !query ||
        session.title?.toLowerCase().includes(query) ||
        session.course?.title?.toLowerCase().includes(query);

      return tabMatch && searchMatch;
    });
  }, [activeTab, searchQuery, sessions]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Live Classes</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Prepare Amazon IVS streams for OBS and monitor broadcast status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowScheduleForm(true)}
          className="flex items-center justify-center gap-3 rounded-2xl bg-primary-600 px-7 py-4 text-sm font-bold text-white shadow-xl shadow-primary-100 transition-all hover:bg-primary-700 active:scale-95"
        >
          <Plus size={20} />
          Schedule Live Class
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`rounded-xl px-6 py-3 text-sm font-bold transition-all ${
            activeTab === 'upcoming'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          Upcoming / Active
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`rounded-xl px-6 py-3 text-sm font-bold transition-all ${
            activeTab === 'completed'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          Ended / Cancelled
        </button>
        <div className="flex-1" />
        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            aria-label="Search live classes"
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          type="button"
          onClick={() => fetchSessions()}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {pageError && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          <AlertTriangle size={18} />
          {pageError}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
          <p className="text-sm font-medium text-slate-500">Loading sessions...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <Video size={46} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No live classes found.</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {filteredSessions.map((session) => {
            const id = getSessionId(session);
            const status = getSessionStatus(session);
            const meta = STATUS_META[status] || STATUS_META.scheduled;
            const sessionDate = getSessionDate(session);
            const isPreparing = preparingIds.has(id);
            const isEnding = endingIds.has(id);
            const isDeleting = deletingIds.has(id);
            const isCancelling = cancellingIds.has(id);
            const canPrepare = ['scheduled', 'failed'].includes(status);
            const canEnd = ['starting', 'live'].includes(status);
            const canCancel = ['scheduled', 'starting', 'failed'].includes(status);
            const canDelete = !['starting', 'live'].includes(status);

            return (
              <article
                key={id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:border-primary-300"
              >
                <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8">
                  <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-500">
                    <Calendar size={24} />
                    <span className="mt-1 text-center text-[10px] font-bold uppercase tracking-widest">
                      {formatDate(sessionDate).replace(',', '')}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-3 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
                      <span className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${meta.className}`}>
                        <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold uppercase tracking-widest text-slate-900">
                        {session.course?.title || 'Course'}
                      </span>
                      {status === 'live' && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-red-700">
                          <Radio size={13} />
                          {session.viewerCount || 0} viewers
                        </span>
                      )}
                    </div>
                    <h4 className="truncate text-xl font-bold text-slate-900">{session.title}</h4>
                    {session.description && (
                      <p className="line-clamp-2 text-sm font-medium text-slate-500">
                        {session.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-slate-500 md:justify-start">
                      <span className="flex items-center gap-1.5">
                        <Clock size={16} />
                        {formatTime(sessionDate)}
                      </span>
                      {status === 'starting' && (
                        <span className="flex items-center gap-1.5 text-amber-700">
                          <Loader2 size={16} className="animate-spin" />
                          Waiting for OBS
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 md:justify-end">
                    {canPrepare && (
                      <button
                        type="button"
                        onClick={() => handlePrepareStream(session)}
                        disabled={isPreparing}
                        className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-100 transition-all hover:bg-primary-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-primary-300"
                      >
                        {isPreparing ? <Loader2 size={18} className="animate-spin" /> : <Radio size={18} />}
                        Prepare Stream
                      </button>
                    )}

                    {canEnd && (
                      <button
                        type="button"
                        onClick={() => handleEndStream(session)}
                        disabled={isEnding}
                        className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-100 transition-all hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-red-300"
                      >
                        {isEnding ? <Loader2 size={18} className="animate-spin" /> : <Square size={16} />}
                        End Stream
                      </button>
                    )}

                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => handleCancelSession(session)}
                        disabled={isCancelling}
                        className="flex items-center justify-center rounded-xl border border-rose-100 bg-rose-50 p-3 text-rose-600 transition-all hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Cancel ${session.title}`}
                        title="Cancel session"
                      >
                        {isCancelling ? <Loader2 size={18} className="animate-spin" /> : <Ban size={18} />}
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSession(session)}
                        disabled={isDeleting}
                        className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 p-3 text-slate-500 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Delete ${session.title}`}
                        title="Delete session"
                      >
                        {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showScheduleForm && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm md:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-live-title"
            className="my-auto w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl md:rounded-[3rem]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-6 md:p-8">
              <div>
                <h3 id="schedule-live-title" className="text-xl font-black text-slate-900 md:text-2xl">
                  Schedule Live Class
                </h3>
                <p className="mt-1 text-xs font-medium text-slate-500 md:text-sm">
                  Create the class time first, then prepare OBS when you are ready.
                </p>
              </div>
              <button
                type="button"
                onClick={closeScheduleForm}
                className="rounded-2xl p-2.5 text-slate-400 shadow-sm transition-colors hover:bg-white"
                aria-label="Close schedule form"
              >
                <XCircle size={22} />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-6 p-6 md:p-8">
              <div className="space-y-2">
                <label htmlFor="live-title" className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Class Title
                </label>
                <input
                  id="live-title"
                  type="text"
                  placeholder="e.g. Advanced State Management Workshop"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border-none bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="live-description" className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Description
                </label>
                <textarea
                  id="live-description"
                  rows="3"
                  placeholder="Optional class notes for students"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full resize-none rounded-xl border-none bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="live-course" className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Select Course
                  </label>
                  <select
                    id="live-course"
                    value={courseId}
                    onChange={(event) => setCourseId(event.target.value)}
                    className="w-full cursor-pointer rounded-xl border-none bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-primary-500"
                  >
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.title}
                      </option>
                    ))}
                    {courses.length === 0 && <option disabled>No courses available</option>}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Audience
                  </label>
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-700">
                    <ShieldCheck size={18} className="text-primary-600" />
                    All enrolled students
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="live-date" className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Date
                  </label>
                  <input
                    id="live-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(event) => setScheduledDate(event.target.value)}
                    className="w-full cursor-pointer rounded-xl border-none bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="live-time" className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Time
                  </label>
                  <input
                    id="live-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(event) => setScheduledTime(event.target.value)}
                    className="w-full cursor-pointer rounded-xl border-none bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-primary-600 py-4 text-sm font-black text-white shadow-xl shadow-primary-100 transition-all hover:bg-primary-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-primary-400"
              >
                {submitting ? 'Scheduling...' : 'Schedule Live Class'}
              </button>
            </form>
          </div>
        </div>
      )}

      {broadcastCredentials && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm md:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="obs-setup-title"
            className="my-auto w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl md:rounded-[3rem]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 p-6 md:p-8">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-800">
                  <AlertTriangle size={14} />
                  One-time credentials
                </p>
                <h3 id="obs-setup-title" className="text-xl font-black text-slate-900 md:text-2xl">
                  OBS Setup
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {broadcastCredentials.sessionTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCredentialsModal}
                className="rounded-2xl p-2.5 text-slate-400 transition-colors hover:bg-white"
                aria-label="Close OBS setup"
              >
                <XCircle size={22} />
              </button>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
              <div className="space-y-5">
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                  Anyone with this stream key can broadcast to this class. The key is displayed only once, and it will be cleared when this window closes.
                </div>

                <div className="space-y-2">
                  <label htmlFor="obs-server-url" className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    RTMPS Server URL
                  </label>
                  <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
                    <input
                      id="obs-server-url"
                      readOnly
                      value={broadcastCredentials.serverUrl}
                      className="min-w-0 flex-1 bg-transparent px-2 py-2 font-mono text-xs font-bold text-slate-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy('serverUrl', broadcastCredentials.serverUrl)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white transition-all hover:bg-slate-800"
                    >
                      {copiedField === 'serverUrl' ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                      {copiedField === 'serverUrl' ? 'Copied' : 'Copy Server URL'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="obs-stream-key" className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    One-time Stream Key
                  </label>
                  <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
                    <input
                      id="obs-stream-key"
                      readOnly
                      type={showStreamKey ? 'text' : 'password'}
                      value={broadcastCredentials.streamKey}
                      className="min-w-0 flex-1 bg-transparent px-2 py-2 font-mono text-xs font-bold text-slate-700 outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowStreamKey((current) => !current)}
                        className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-slate-600 transition-all hover:bg-slate-100"
                        aria-label={showStreamKey ? 'Hide stream key' : 'Show stream key'}
                      >
                        {showStreamKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy('streamKey', broadcastCredentials.streamKey)}
                        className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-xs font-bold text-white transition-all hover:bg-primary-700"
                      >
                        {copiedField === 'streamKey' ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                        {copiedField === 'streamKey' ? 'Copied' : 'Copy Stream Key'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h4 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-900">
                  OBS Steps
                </h4>
                <ol className="space-y-3 text-sm font-semibold text-slate-600">
                  {[
                    'Open OBS',
                    'Go to Settings -> Stream',
                    'Choose Custom',
                    'Paste Server URL',
                    'Paste Stream Key',
                    'Click Start Streaming',
                  ].map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-black text-white">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorLiveClasses;
