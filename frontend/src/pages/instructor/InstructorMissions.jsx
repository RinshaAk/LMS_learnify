import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getInstructorCourses } from '../../services/instructorService';
import { getCourseDetails } from '../../services/instructorCourseService';
import { 
  createMission, 
  getCourseMissions, 
  getMissionSubmissions, 
  evaluateSubmission 
} from '../../services/missionService';

const InstructorMissions = () => {
  const [courses, setCourses] = useState([]);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  
  // Modals & States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // Form State
  const [courseId, setCourseId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [modules, setModules] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [points, setPoints] = useState(100);

  // Evaluation Form State
  const [evalStatus, setEvalStatus] = useState('completed'); // 'completed' or 'rejected'
  const [evalFeedback, setEvalFeedback] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourseId, setFilterCourseId] = useState('all');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const coursesData = await getInstructorCourses();
      const allCourses = Array.isArray(coursesData) ? coursesData : (coursesData?.all || []);
      setCourses(allCourses);
      
      if (allCourses && allCourses.length > 0) {
        setFilterCourseId(allCourses[0]._id);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      toast.error('Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  // Load missions when filtered course changes
  useEffect(() => {
    if (filterCourseId && filterCourseId !== 'all') {
      fetchMissions(filterCourseId);
    } else {
      setMissions([]);
    }
  }, [filterCourseId]);

  // Load modules when selected course inside create modal changes
  useEffect(() => {
    if (courseId) {
      loadCourseModules(courseId);
    } else {
      setModules([]);
    }
  }, [courseId]);

  const loadCourseModules = async (id) => {
    try {
      const details = await getCourseDetails(id);
      setModules(details?.modules || []);
    } catch (err) {
      console.error('Error loading course modules:', err);
      setModules([]);
    }
  };

  const fetchMissions = async (id) => {
    try {
      setLoading(true);
      const data = await getCourseMissions(id);
      setMissions(data || []);
    } catch (err) {
      console.error('Error fetching missions:', err);
      toast.error('Failed to load missions for selected course.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMissionSubmit = async (e) => {
    e.preventDefault();
    if (!courseId) return toast.error('Please select a course.');
    if (!title.trim()) return toast.error('Please enter a title.');
    if (!description.trim()) return toast.error('Please enter description details.');
    if (!deadlineDate || !deadlineTime) return toast.error('Please set a deadline.');

    try {
      setSubmitting(true);
      const deadline = new Date(`${deadlineDate}T${deadlineTime}`);
      
      const payload = {
        title,
        description,
        course: courseId,
        module: moduleId || undefined,
        deadline: deadline.toISOString(),
        points: Number(points)
      };

      await createMission(payload);
      toast.success('Mission task successfully created and assigned!');
      
      // Reset
      setTitle('');
      setDescription('');
      setDeadlineDate('');
      setDeadlineTime('');
      setPoints(100);
      setModuleId('');
      setShowCreateModal(false);
      
      // Refresh list
      if (filterCourseId === courseId) {
        fetchMissions(courseId);
      } else {
        setFilterCourseId(courseId);
      }
    } catch (err) {
      console.error('Error creating mission:', err);
      toast.error(err.response?.data?.message || 'Failed to assign mission.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenSubmissions = async (mission) => {
    setSelectedMission(mission);
    setLoadingSubmissions(true);
    try {
      const data = await getMissionSubmissions(mission._id);
      setSubmissions(data || []);
    } catch (err) {
      console.error('Error loading submissions:', err);
      toast.error('Failed to load submissions.');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleEvaluateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    if (!evalFeedback.trim()) return toast.error('Please provide evaluation feedback.');

    try {
      setEvaluating(true);
      await evaluateSubmission(selectedSubmission._id, {
        status: evalStatus,
        feedback: evalFeedback
      });
      toast.success('Submission successfully graded!');
      
      // Reset
      setSelectedSubmission(null);
      setEvalFeedback('');
      
      // Refresh submissions
      if (selectedMission) {
        handleOpenSubmissions(selectedMission);
      }
    } catch (err) {
      console.error('Error evaluating submission:', err);
      toast.error('Failed to submit evaluation.');
    } finally {
      setEvaluating(false);
    }
  };

  const filteredMissions = missions.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-300">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardCheck size={36} className="text-blue-600" />
            Missions & Task Assignments
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Assign weekly tasks, review coding homework, and evaluate student submissions.</p>
        </div>
        <button 
          onClick={() => {
            setShowCreateModal(true);
            if (courses.length > 0) setCourseId(courses[0]._id);
          }}
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-3 active:scale-95"
        >
          <Plus size={20} />
          Assign New Mission
        </button>
      </div>

      {/* Course Filter Row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-96 flex items-center">
          <Search size={18} className="absolute left-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search missions..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter size={16} className="text-slate-400 hidden sm:block" />
          <select
            value={filterCourseId}
            onChange={(e) => setFilterCourseId(e.target.value)}
            className="w-full md:w-64 px-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-sm font-semibold text-slate-600 outline-none focus:bg-white focus:border-slate-200 transition-all"
          >
            <option value="all" disabled>-- Select a Course --</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>{course.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Missions...</p>
        </div>
      ) : filterCourseId === 'all' || courses.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 max-w-xl mx-auto">
          <ClipboardCheck size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-bold">Please select a course above to view and manage missions.</p>
        </div>
      ) : filteredMissions.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 max-w-xl mx-auto">
          <ClipboardCheck size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No missions assigned yet</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">Assign homework, coding requirements, and review submissions for this course.</p>
          <button 
            onClick={() => {
              setShowCreateModal(true);
              setCourseId(filterCourseId);
            }} 
            className="mt-6 px-6 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-md"
          >
            Assign First Mission
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          {filteredMissions.map((mission) => (
            <div 
              key={mission._id} 
              className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-8 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-blue-50 text-blue-600 border-blue-100">
                    Points: {mission.points}
                  </span>
                  {mission.module && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Module: {mission.module.name}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-black text-slate-900 leading-tight">{mission.title}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-3">{mission.description}</p>
                
                <div className="flex items-center gap-6 pt-4 border-t border-slate-50 text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-500" />
                    Due: {new Date(mission.deadline).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-500" />
                    {new Date(mission.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  onClick={() => handleOpenSubmissions(mission)}
                  className="w-full py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs hover:bg-blue-600 hover:text-white hover:border-transparent transition-all flex items-center justify-center gap-2"
                >
                  View Submissions
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MISSION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl my-8 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Assign Course Mission</h3>
                <p className="text-slate-500 font-medium text-xs mt-1">Assign custom tasks, coding exercises, or homework deadlines.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateMissionSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Select Course</label>
                <select 
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  required
                >
                  <option value="" disabled>-- Select Course --</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>{course.title}</option>
                  ))}
                </select>
              </div>

              {modules.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Select Associated Module (Optional)</label>
                  <select 
                    value={moduleId}
                    onChange={(e) => setModuleId(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="">-- No Module / General Course --</option>
                    {modules.map(mod => (
                      <option key={mod._id} value={mod._id}>{mod.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Mission Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Build dynamic Todo app with Redux"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Detailed Description & Instructions</label>
                <textarea 
                  rows="4"
                  placeholder="Specify task guidelines, endpoints to create, styling constraints, and evaluation points..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Deadline Date</label>
                  <input 
                    type="date" 
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    onClick={(e) => e.target.showPicker()}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Deadline Time</label>
                  <input 
                    type="time" 
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    onClick={(e) => e.target.showPicker()}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Points Value</label>
                <input 
                  type="number" 
                  min="1"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  required
                />
              </div>

              <div className="pt-6 shrink-0 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign Mission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMISSIONS MODAL */}
      {selectedMission && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl my-8 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Mission Submissions</h3>
                <p className="text-slate-500 font-bold text-xs mt-1">Mission: {selectedMission.title}</p>
              </div>
              <button 
                onClick={() => {
                  setSelectedMission(null);
                  setSelectedSubmission(null);
                }} 
                className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-8 min-h-0">
              {/* Submissions List */}
              <div className="flex-1 space-y-4 overflow-y-auto">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Submissions History</h4>
                
                {loadingSubmissions ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loading submissions...</p>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">No submissions recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((sub) => {
                      const isSelected = selectedSubmission?._id === sub._id;
                      return (
                        <div 
                          key={sub._id}
                          onClick={() => {
                            setSelectedSubmission(sub);
                            setEvalStatus(sub.status === 'pending' ? 'completed' : sub.status);
                            setEvalFeedback(sub.feedback || '');
                          }}
                          className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-50/10 shadow-sm' 
                              : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0 uppercase">
                              {sub.student?.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800">{sub.student?.name || 'Student'}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                Submitted: {new Date(sub.submittedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-3">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                              sub.status === 'completed' ? 'bg-green-50 text-green-600 border-green-100' :
                              sub.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                              'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                              {sub.status}
                            </span>
                            <ChevronRight size={16} className="text-slate-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Evaluation Panel */}
              <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8 flex flex-col justify-between shrink-0">
                {selectedSubmission ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                      <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest">Evaluate Task</h4>
                    </div>

                    <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-2 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600 rounded-full -mr-12 -mt-12 opacity-30 blur-2xl"></div>
                      <div className="relative z-10 space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Submission URL</span>
                        <a 
                          href={selectedSubmission.submissionUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs font-bold text-white hover:underline flex items-center gap-1.5 w-full break-all"
                        >
                          <ExternalLink size={14} className="shrink-0 text-blue-400" />
                          {selectedSubmission.submissionUrl}
                        </a>
                      </div>
                    </div>

                    {selectedSubmission.studentNotes && (
                      <div className="space-y-2">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Student Notes</span>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-medium text-slate-600 max-h-32 overflow-y-auto">
                          {selectedSubmission.studentNotes}
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleEvaluateSubmit} className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                        <select 
                          value={evalStatus}
                          onChange={(e) => setEvalStatus(e.target.value)}
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                          <option value="completed">Complete / Approve</option>
                          <option value="rejected">Reject / Redo</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Feedback Comments</label>
                        <textarea 
                          rows="3"
                          placeholder="Provide feedback about code structure, fixes, or comments..."
                          value={evalFeedback}
                          onChange={(e) => setEvalFeedback(e.target.value)}
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                          required
                        />
                      </div>

                      <button 
                        type="submit" 
                        disabled={evaluating}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                      >
                        {evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Evaluation'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-100">
                    <Sparkles size={32} className="text-blue-300 animate-pulse mb-3" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select a student submission from the list to grade it.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorMissions;
