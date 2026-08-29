import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudentDashboard } from '../../features/student/studentThunk';
import {
  Calendar,
  Clock,
  Video,
  History,
  CheckCircle2,
  Loader2,
  Info,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import VideoCall from '../../components/live/VideoCall';
import axiosInstance from '../../features/axiosInstance';

const StudentReviews = () => {
  const dispatch = useDispatch();
  const { dashboardData, loading } = useSelector((state) => state.student);

  const [upcomingReviews, setUpcomingReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState(null);

  const getRoomIdFromLink = (link) => {
    if (!link) return 'stackversehub-room';
    try {
      if (link.startsWith('http://') || link.startsWith('https://')) {
        const url = new URL(link);
        return url.pathname.replace(/^\//, '') || 'stackversehub-room';
      }
      return link;
    } catch (e) {
      return link;
    }
  };

  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const response = await axiosInstance.get("/users/scheduled-reviews");
      if (response.data.success) {
        setUpcomingReviews(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching scheduled reviews:", error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm("Are you sure you want to cancel/delete this scheduled review?")) {
      return;
    }
    try {
      const response = await axiosInstance.delete(`/users/scheduled-reviews/${id}`);
      if (response.data.success) {
        toast.success("Review session canceled successfully");
        fetchReviews();
      }
    } catch (error) {
      console.error("Error canceling review session:", error);
      toast.error(error.response?.data?.message || "Failed to cancel review session");
    }
  };

  useEffect(() => {
    if (!dashboardData) {
      dispatch(fetchStudentDashboard());
    }
    fetchReviews();
  }, [dispatch, dashboardData]);

  const activeReviews = upcomingReviews.filter(r => r.status === 'Scheduled' || r.status === 'Pending');
  const pastReviews = upcomingReviews.filter(r => r.status !== 'Scheduled' && r.status !== 'Pending');

  if (activeRoomId) {
    return <VideoCall roomId={activeRoomId} onEndCall={() => setActiveRoomId(null)} />;
  }

  if (loading && !dashboardData) {
    return (
      <div className="h-[60vh] flex items-center justify-center bg-white rounded-[2.5rem] border border-slate-200">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">Loading review dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">1-on-1 Reviews</h2>
          <p className="text-slate-500 mt-1 font-medium">Track and attend scheduled evaluation reviews with your course instructors.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Calendar size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheduled Reviews</p>
            <p className="text-2xl font-black text-slate-900">{activeReviews.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed / Passed</p>
            <p className="text-2xl font-black text-slate-900">{pastReviews.filter(h => h.status === 'Pass' || h.status === 'Completed').length}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-10">

          {/* Upcoming Review Sessions */}
          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900">Upcoming Review Sessions</h3>

            <div className="space-y-4">
              {loadingReviews ? (
                <div className="py-16 text-center bg-white rounded-[2.5rem] border border-slate-200">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                  <p className="text-slate-500 font-bold">Loading scheduled reviews...</p>
                </div>
              ) : activeReviews.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 p-8">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Calendar size={32} />
                  </div>
                  <p className="text-slate-500 font-bold">No review sessions scheduled yet.</p>
                </div>
              ) : (
                activeReviews.map((item) => (
                  <div key={item._id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:border-blue-300 transition-all group p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">

                      <div className="flex items-center gap-5 w-full md:w-auto">
                        <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 border-slate-100 text-slate-500 bg-slate-50 shrink-0">
                          <Calendar size={20} />
                          <span className="text-[9px] font-black uppercase tracking-widest mt-1">
                            {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                              item.status === 'Pass' || item.status === 'Completed' ? 'bg-green-55 bg-green-50 text-green-600' :
                              item.status === 'Failed' || item.status === 'Cancelled' ? 'bg-rose-50 text-rose-600' :
                              'bg-blue-50 text-blue-600'
                            }`}>
                              {item.status || 'Scheduled'}
                            </span>
                            <span className="text-xs font-bold text-slate-400">Course Review</span>
                          </div>
                          <h4 className="text-lg font-black text-slate-900 mt-1 line-clamp-1">{item.course?.title}</h4>
                          <p className="text-xs font-bold text-blue-600 mt-0.5">Instructor: {item.instructor?.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                        <div className="text-left md:text-right">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Meeting Time</p>
                          <p className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                            <Clock size={14} className="text-blue-600" /> {item.time}
                          </p>
                        </div>

                        {item.status === 'Scheduled' || item.status === 'Pending' ? (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                const room = getRoomIdFromLink(item.meetingLink);
                                setActiveRoomId(room);
                              }}
                              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-100 flex items-center gap-2 active:scale-95 transition-all"
                            >
                              <Video size={16} />
                              Join Call
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReview(item._id)}
                              className="p-3 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl active:scale-95 transition-all border border-transparent hover:border-rose-100"
                              title="Cancel Review"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="px-6 py-3 bg-slate-100 text-slate-400 rounded-xl font-bold text-xs cursor-default">
                            {item.status}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Sidebar Guidelines & History */}
        <div className="space-y-10">

          {/* Rules Card */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl"></div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                  <Info size={20} className="text-blue-400" />
                </div>
                <h3 className="font-bold text-lg">Evaluation Policy</h3>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">Review sessions are 1-on-1 live screenings conducted by your instructor to evaluate your conceptual understanding of the course.</p>
              <ul className="space-y-3.5 text-xs text-slate-400 font-semibold">
                <li className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  Max 3 attempts per course.
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  Must achieve 80% progress to request.
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  Passing unlocks course certificate.
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  Meeting recordings are archived.
                </li>
              </ul>
            </div>
          </div>

          {/* Past Results */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-900">Review History</h3>
              <History size={18} className="text-slate-300" />
            </div>
            <div className="divide-y divide-slate-50">
              {pastReviews.length > 0 ? (
                pastReviews.map((item) => (
                  <div key={item._id} className="p-6 space-y-3 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 leading-snug">{item.course?.title || 'Course Review'}</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          {new Date(item.date).toLocaleDateString()} • Attempt {item.attempt || 1}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                        item.status === 'Pass' || item.status === 'Completed'
                          ? 'bg-green-50 text-green-600 border border-green-200'
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    {item.notes && <p className="text-xs text-slate-500 italic font-medium leading-relaxed">"{item.notes}"</p>}
                    {(item.status === 'Pass' || item.status === 'Completed') && (
                      <div className="text-[10px] text-slate-400 font-black tracking-wider uppercase mt-1">
                        Score: <span className="text-green-600 font-extrabold">{item.mark || 0}%</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                  No history found
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default StudentReviews;
