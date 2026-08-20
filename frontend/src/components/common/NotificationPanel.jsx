import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, CheckCheck, Trash2, MessageCircle, Calendar, Award, BookOpen, Video, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../features/axiosInstance';
import { useSocket } from '../../context/SocketContext';

const TYPE_ICON = {
  new_message: { icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
  review_scheduled: { icon: Calendar, color: 'text-violet-500', bg: 'bg-violet-50' },
  review_evaluated: { icon: ClipboardCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  exam_result: { icon: ClipboardCheck, color: 'text-amber-500', bg: 'bg-amber-50' },
  certificate_issued: { icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  course_enrolled: { icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  live_session: { icon: Video, color: 'text-red-500', bg: 'bg-red-50' },
  general: { icon: Bell, color: 'text-slate-400', bg: 'bg-slate-50' },
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const NotificationPanel = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const { socket } = useSocket();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time push
  useEffect(() => {
    if (!socket) return;
    const handler = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((c) => c + 1);
    };
    socket.on('new_notification', handler);
    return () => socket.off('new_notification', handler);
  }, [socket]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markRead = async (id) => {
    try {
      await axiosInstance.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllRead = async () => {
    try {
      await axiosInstance.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const deleteNotif = async (e, id) => {
    e.stopPropagation();
    try {
      await axiosInstance.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setUnreadCount((c) => {
        const wasUnread = notifications.find((n) => n._id === id && !n.isRead);
        return wasUnread ? Math.max(0, c - 1) : c;
      });
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const handleNotifClick = (notif) => {
    if (!notif.isRead) markRead(notif._id);
    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl relative transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-violet-600 rounded-full flex items-center justify-center text-[9px] font-black text-white leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[200] overflow-hidden animate-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-slate-700" />
              <span className="font-black text-sm text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-md text-[10px] font-black">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-2 text-slate-400">
                <Bell size={28} className="opacity-30" />
                <p className="text-xs font-bold">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const cfg = TYPE_ICON[notif.type] || TYPE_ICON.general;
                const IconComp = cfg.icon;
                return (
                  <div
                    key={notif._id}
                    onClick={() => handleNotifClick(notif)}
                    className={`flex items-start gap-3 px-5 py-4 cursor-pointer group transition-colors ${
                      notif.isRead
                        ? 'bg-white hover:bg-slate-50'
                        : 'bg-violet-50/40 hover:bg-violet-50/70'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <IconComp size={15} className={cfg.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-bold leading-tight ${notif.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                          {notif.title}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notif.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-600 shrink-0" />
                          )}
                          <button
                            onClick={(e) => deleteNotif(e, notif._id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/50">
              <p className="text-[10px] text-center text-slate-400 font-semibold">
                Showing latest {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
