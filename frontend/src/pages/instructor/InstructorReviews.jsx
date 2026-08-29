import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInstructorDashboard, fetchInstructorStudents, fetchReviewHistory } from '../../features/instructor/instructorThunk';
import {
  Calendar,
  Clock,
  User,
  BookOpen,
  Video,
  Plus,
  Search,
  Filter,
  ChevronRight,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import VideoCall from '../../components/live/VideoCall';
import axiosInstance from '../../features/axiosInstance';





const InstructorReviews = () => {
  const dispatch = useDispatch();
  const { dashboardData, students, reviewHistory, loading } = useSelector((state) => state.instructor);

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [activeRoomId, setActiveRoomId] = useState(null);

  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evaluatingSession, setEvaluatingSession] = useState(null);
  const [evalStatus, setEvalStatus] = useState("Pass");
  const [evalMark, setEvalMark] = useState("");
  const [evalNotes, setEvalNotes] = useState("");
  const [submittingEval, setSubmittingEval] = useState(false);

  const [upcomingReviews, setUpcomingReviews] = useState([]);
  const [, setLoadingReviews] = useState(false);

  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const response = await axiosInstance.get("/instructor/scheduled-reviews");
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
      const response = await axiosInstance.delete(`/instructor/scheduled-reviews/${id}`);
      if (response.data.success) {
        toast.success("Review session canceled successfully");
        fetchReviews();
      }
    } catch (error) {
      console.error("Error canceling review session:", error);
      toast.error(error.response?.data?.message || "Failed to cancel review session");
    }
  };

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

  useEffect(() => {
    if (!dashboardData) dispatch(fetchInstructorDashboard());
    if (students.length === 0) dispatch(fetchInstructorStudents());
    dispatch(fetchReviewHistory());
    fetchReviews();
  }, [dispatch, dashboardData, students.length]);

  const courses = dashboardData?.courses || [];

  const activeReviews = upcomingReviews.filter(r => r.status === 'Scheduled' || r.status === 'Pending');

  // Helper to generate a random Room ID
  const generateRoomId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${part1}-${part2}-${part3}`;
  };

  // Pre-generate link when modal is opened
  useEffect(() => {
    if (showScheduleForm) {
      setMeetingLink(generateRoomId());
      if (courses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(courses[0]._id);
      }
      if (students.length > 0 && !selectedStudentId) {
        setSelectedStudentId(students[0].studentId || students[0].id);
      }
    }
  }, [showScheduleForm, courses, students]);

  const handleConfirmSchedule = async (e) => {
    e.preventDefault();

    if (!selectedCourseId) {
      toast.error('Please select a course');
      return;
    }
    if (!selectedStudentId) {
      toast.error('Please select a student');
      return;
    }
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }
    if (!selectedTime) {
      toast.error('Please select a time');
      return;
    }
    if (!meetingLink) {
      toast.error('Please generate or enter a meeting link');
      return;
    }

    const matchedStudent = students.find(s => (s.studentId || s.id) === selectedStudentId);

    try {
      const response = await axiosInstance.post("/instructor/schedule-review", {
        courseId: selectedCourseId,
        studentId: selectedStudentId,
        date: selectedDate,
        time: selectedTime,
        meetingLink,
      });

      if (response.data.success) {
        toast.success(`Successfully scheduled review with ${matchedStudent?.name || 'Student'}!`);
        fetchReviews();
        // Reset Form & Close
        setSelectedDate('');
        setSelectedTime('');
        setShowScheduleForm(false);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to schedule review');
    }
  };

  const handleConfirmEvaluation = async (e) => {
    e.preventDefault();

    if (!evaluatingSession) return;

    const payload = {
      status: evalStatus,
      notes: evalNotes,
    };

    if (evalMark !== "") {
      const markNum = Number(evalMark);
      if (isNaN(markNum) || markNum < 0 || markNum > 100) {
        toast.error("Mark must be a number between 0 and 100");
        return;
      }
      payload.mark = markNum;
    }

    setSubmittingEval(true);
    try {
      const response = await axiosInstance.patch(
        `/instructor/scheduled-reviews/${evaluatingSession._id}/status`,
        payload
      );

      if (response.data.success) {
        toast.success("Review evaluation submitted successfully!");
        setShowEvalModal(false);
        setEvaluatingSession(null);
        fetchReviews();
        dispatch(fetchReviewHistory());
      }
    } catch (error) {
      console.error("Error submitting evaluation:", error);
      toast.error(error.response?.data?.message || "Failed to submit evaluation");
    } finally {
      setSubmittingEval(false);
    }
  };

  if (activeRoomId) {
    return <VideoCall roomId={activeRoomId} onEndCall={() => setActiveRoomId(null)} />;
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Reviews & Schedules</h2>
          <p className="text-slate-500 mt-1 font-medium">Schedule and manage 1-on-1 review sessions with your students.</p>
        </div>
        <button
          onClick={() => setShowScheduleForm(true)}
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-3 active:scale-95"
        >
          <Plus size={20} />
          Schedule New Review
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Active Reviews */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900">Upcoming Reviews</h3>
            <div className="flex gap-2">
              <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 transition-colors">
                <Filter size={18} />
              </button>
              <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 transition-colors">
                <Search size={18} />
              </button>
            </div>
          </div>

          {activeReviews.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
               <p className="text-slate-500 font-bold">No upcoming reviews scheduled.</p>
               <button onClick={() => setShowScheduleForm(true)} className="text-blue-600 text-sm font-black uppercase tracking-widest mt-4 hover:underline">Schedule Now</button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeReviews.map((item) => (
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
                          <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-green-50 text-green-600">
                            {item.status || 'Scheduled'}
                          </span>
                          <span className="text-xs font-bold text-slate-400">1-on-1 Review</span>
                        </div>
                        <h4 className="text-lg font-black text-slate-900 mt-1 line-clamp-1">{item.course?.title}</h4>
                        <p className="text-xs font-bold text-blue-600 mt-0.5">Student: {item.student?.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                      <div className="text-left md:text-right">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Meeting Time</p>
                        <p className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                          <Clock size={14} className="text-blue-600" /> {item.time}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEvaluatingSession(item);
                            setEvalStatus("Pass");
                            setEvalMark("");
                            setEvalNotes("");
                            setShowEvalModal(true);
                          }}
                          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-100 flex items-center gap-2 active:scale-95 transition-all"
                          title="Evaluate Review"
                        >
                          <CheckCircle2 size={16} />
                          Evaluate
                        </button>
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
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar History & Info */}
        <div className="space-y-10">
          {/* Rules Card */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl"></div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                  <AlertCircle size={20} />
                </div>
                <h3 className="font-bold">Review Rules</h3>
              </div>
              <ul className="space-y-3 text-sm text-slate-400 font-medium">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  Max 3 attempts per course
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  Passing score unlocks certificate
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  Sessions are recorded by default
                </li>
              </ul>
            </div>
          </div>

          {/* Past Results */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-900">Recent History</h3>
              <History size={18} className="text-slate-300" />
            </div>
            <div className="divide-y divide-slate-50 min-h-[200px]">
              {loading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : reviewHistory.length > 0 ? (
                reviewHistory.map((item, idx) => (
                  <div key={item._id || idx} className="p-6 space-y-3 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{item.student?.name || 'Student'}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.course?.title || 'Course'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                        item.status === 'Pass' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {item.status || 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      <span>Attempt {item.attempt || 1}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                  No history found
                </div>
              )}
            </div>
            <button className="w-full py-4 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors uppercase tracking-widest">
              View Full History
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-10 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Schedule Review</h3>
                <p className="text-slate-500 font-medium text-sm mt-1">Set up a new evaluation session for a student.</p>
              </div>
              <button onClick={() => setShowScheduleForm(false)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleConfirmSchedule} className="p-10 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label htmlFor="schedule-course-select" className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Select Course</label>
                  <select
                    id="schedule-course-select"
                    name="courseId"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    required
                  >
                    <option value="" disabled>-- Select Course --</option>
                    {courses.map(course => (
                      <option key={course._id} value={course._id}>{course.title}</option>
                    ))}
                    {courses.length === 0 && <option disabled>No courses available</option>}
                  </select>
                </div>

                <div className="space-y-3">
                  <label htmlFor="schedule-student-select" className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Select Student</label>
                  <select
                    id="schedule-student-select"
                    name="studentId"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    required
                  >
                    <option value="" disabled>-- Select Student --</option>
                    {Array.from(
                      new Map(
                        students
                          .filter(s => s.studentId || s.id)
                          .map(s => [s.studentId || s.id, s])
                      ).values()
                    ).map(student => (
                      <option key={student.studentId || student.id} value={student.studentId || student.id}>{student.name}</option>
                    ))}
                    {students.length === 0 && <option disabled>No students found</option>}
                  </select>
                </div>

                <div className="space-y-3">
                  <label htmlFor="schedule-date-input" className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Date</label>
                  <input
                    id="schedule-date-input"
                    name="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.target.showPicker();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="schedule-time-input" className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Time</label>
                  <input
                    id="schedule-time-input"
                    name="time"
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.target.showPicker();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label htmlFor="schedule-meeting-link" className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Meeting Room ID</label>
                <div className="relative flex items-center">
                  <input
                    id="schedule-meeting-link"
                    name="meetingLink"
                    type="text"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="e.g. abc-defg-hij"
                    className="w-full pr-32 px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMeetingLink(generateRoomId())}
                    className="absolute right-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-bold text-xs transition-colors"
                  >
                    Generate ID
                  </button>
                </div>
              </div>

              <div className="pt-6">
                <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95">
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evaluation Modal */}
      {showEvalModal && evaluatingSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-black text-slate-900">Evaluate Student</h3>
                <p className="text-slate-500 font-medium text-sm mt-1 flex flex-wrap gap-1">
                  Grade session for <span className="text-blue-600 font-bold">{evaluatingSession.student?.name}</span>
                </p>
                <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-widest mt-0.5">
                  Course: {evaluatingSession.course?.title}
                </p>
              </div>
              <button
                onClick={() => setShowEvalModal(false)}
                className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors shrink-0"
              >
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleConfirmEvaluation} className="p-8 space-y-6 overflow-y-auto flex-1">
              {/* Pass / Fail Selection */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Result</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setEvalStatus("Pass")}
                    className={`py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 ${
                      evalStatus === "Pass"
                        ? "bg-green-50 text-green-600 border-green-500 shadow-md"
                        : "bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100"
                    }`}
                  >
                    <CheckCircle2 size={18} />
                    Pass
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvalStatus("Failed")}
                    className={`py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 ${
                      evalStatus === "Failed"
                        ? "bg-rose-50 text-rose-600 border-rose-500 shadow-md"
                        : "bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100"
                    }`}
                  >
                    <XCircle size={18} />
                    Fail
                  </button>
                </div>
              </div>

              {/* Score / Mark Input */}
              <div className="space-y-3">
                <label htmlFor="eval-score-input" className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Score / Percentage (0 - 100)%</label>
                <input
                  id="eval-score-input"
                  name="score"
                  type="number"
                  min="0"
                  max="100"
                  value={evalMark}
                  onChange={(e) => setEvalMark(e.target.value)}
                  placeholder="e.g. 85 (optional)"
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Notes / Feedback */}
              <div className="space-y-3">
                <label htmlFor="eval-notes-textarea" className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Evaluation Notes / Feedback</label>
                <textarea
                  id="eval-notes-textarea"
                  name="notes"
                  value={evalNotes}
                  onChange={(e) => setEvalNotes(e.target.value)}
                  placeholder="Provide comments or notes on student performance..."
                  rows={4}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submittingEval}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submittingEval ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting Grade...
                    </>
                  ) : (
                    "Submit Evaluation"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorReviews;

