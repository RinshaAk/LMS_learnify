import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  Play,
  Clock,
  BookOpen,
  User,
  Tag,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import StatusBadge from '../../components/admin/StatusBadge';
import adminService from '../../services/adminService';
import { toast } from 'react-hot-toast';

const AdminCourseApproval = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [previewCourse, setPreviewCourse] = useState(null);
  const [previewLesson, setPreviewLesson] = useState(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');
  const [previewVideoLoading, setPreviewVideoLoading] = useState(false);
  const [previewVideoError, setPreviewVideoError] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllCourses();
      setCourses(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    let action = '';
    if (status === 'approved') action = 'approve';
    else if (status === 'rejected') action = 'reject';
    else if (status === 'hide') action = 'hide';
    else if (status === 'unhide') action = 'unhide';

    if (!window.confirm(`Are you sure you want to ${action} this course?`)) return;

    try {
      await adminService.updateCourseStatus(id, status);
      fetchCourses(); // Refresh data
      toast.success(`Course ${status === 'hide' ? 'hidden' : status === 'unhide' ? 'unhidden' : status} successfully!`);
    } catch (err) {
      console.error(`Error updating course status:`, err);
      toast.error(`Failed to ${action} course`);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.instructor?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (selectedStatus === 'pending') matchesStatus = course.approvalStatus === 'pending';
    else if (selectedStatus === 'approved') matchesStatus = course.approvalStatus === 'approved' && !course.isHidden;
    else if (selectedStatus === 'rejected') matchesStatus = course.approvalStatus === 'rejected';
    else if (selectedStatus === 'hidden') matchesStatus = course.isHidden;
    else if (selectedStatus === 'blocked') matchesStatus = course.approvalStatus === 'rejected'; // Mapping block to rejected
    else if (selectedStatus === 'all') matchesStatus = true;

    return matchesSearch && matchesStatus;
  });

  const getCourseLessons = (course) => (
    course?.modules?.flatMap((module) =>
      (module.lessons || []).map((lesson) => ({
        ...lesson,
        moduleTitle: module.title,
      }))
    ) || []
  );

  const getCourseVideoCount = (course) =>
    getCourseLessons(course).filter((lesson) => lesson.videoUrl).length;

  const openCoursePreview = (course) => {
    const lessons = getCourseLessons(course);
    setPreviewCourse(course);
    setPreviewLesson(lessons.find((lesson) => lesson.videoUrl) || lessons[0] || null);
  };

  const closeCoursePreview = () => {
    setPreviewCourse(null);
    setPreviewLesson(null);
    setPreviewVideoUrl('');
    setPreviewVideoError('');
    setPreviewVideoLoading(false);
  };

  useEffect(() => {
    let isActive = true;

    const loadPreviewVideo = async () => {
      setPreviewVideoUrl('');
      setPreviewVideoError('');

      if (!previewLesson?.videoUrl) {
        return;
      }

      try {
        setPreviewVideoLoading(true);
        const data = await adminService.getVideoPlaybackUrl({
          videoUrl: previewLesson.videoUrl,
          courseId: previewCourse?._id,
          lessonId: previewLesson._id,
        });

        if (isActive) {
          setPreviewVideoUrl(data.url || previewLesson.videoUrl);
        }
      } catch (err) {
        console.error('Error loading preview video:', err);

        if (isActive) {
          setPreviewVideoError(err.response?.data?.message || 'Video preview could not be loaded.');
        }
      } finally {
        if (isActive) {
          setPreviewVideoLoading(false);
        }
      }
    };

    loadPreviewVideo();

    return () => {
      isActive = false;
    };
  }, [previewCourse?._id, previewLesson]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading courses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Course Management</h2>
          <p className="text-slate-500">Review, approve, and manage the visibility of all courses.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-bold">{error}</p>
          <button onClick={fetchCourses} className="ml-auto text-xs bg-white px-3 py-1 rounded-lg border border-red-200 hover:bg-red-50">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search courses or instructors..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            className="bg-slate-50 border-none text-sm font-medium text-slate-600 rounded-xl focus:ring-0 px-4 py-2"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Courses</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved & Visible</option>
            <option value="hidden">Hidden Courses</option>
            <option value="rejected">Rejected / Blocked</option>
          </select>
        </div>
      </div>

      {/* Courses List */}
      <div className="space-y-4">
        {filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
            <div key={course._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row items-stretch group hover:border-blue-200 transition-colors">
              {/* Thumbnail */}
              <div className="md:w-64 lg:w-72 shrink-0 relative overflow-hidden bg-slate-100">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <StatusBadge status={course.approvalStatus === 'approved' ? 'Active' : course.approvalStatus === 'rejected' ? 'Rejected' : 'Pending'} />
                  {course.isHidden && <span className="px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded uppercase tracking-wider">Hidden</span>}
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                    <Tag className="w-3 h-3" /> {course.category}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{course.title}</h3>
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-6">
                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                      <User className="w-4 h-4 text-slate-400" /> {course.instructor?.name || 'Unknown Instructor'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                      <Clock className="w-4 h-4 text-slate-400" /> {new Date(course.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                      <Play className="w-4 h-4 text-slate-400" /> {getCourseVideoCount(course)} Videos
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-100">
                  <div className="text-2xl font-bold text-slate-900">₹{course.price}</div>
                  <div className="flex items-center gap-3">
                    {course.approvalStatus === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(course._id, 'rejected')}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors border border-red-100"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(course._id, 'approved')}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-900/20"
                        >
                          Approve
                        </button>
                      </>
                    )}
                    {course.approvalStatus === 'approved' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(course._id, 'rejected')}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors border border-red-100"
                        >
                          Block
                        </button>
                        {course.isHidden ? (
                          <button
                            onClick={() => handleStatusUpdate(course._id, 'unhide')}
                            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors border border-blue-100"
                          >
                            Unhide
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusUpdate(course._id, 'hide')}
                            className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-sm font-bold hover:bg-amber-100 transition-colors border border-amber-100"
                          >
                            Hide
                          </button>
                        )}
                      </>
                    )}
                    {course.approvalStatus === 'rejected' && (
                      <button
                        onClick={() => handleStatusUpdate(course._id, 'approved')}
                        className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-sm font-bold hover:bg-green-100 transition-colors"
                      >
                        Unblock / Approve
                      </button>
                    )}
                    <button
                      onClick={() => openCoursePreview(course)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
                      title="Preview course videos"
                    >
                      <Eye className="w-5 h-5" />
                      Preview Video
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-20 text-center">
            <p className="text-slate-400 font-medium">No courses found matching your criteria.</p>
          </div>
        )}
      </div>

      {previewCourse && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Course Preview</p>
                <h3 className="text-xl font-bold text-slate-900 truncate">{previewCourse.title}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {previewCourse.instructor?.name || 'Unknown Instructor'} - {getCourseLessons(previewCourse).length} Lessons
                </p>
              </div>
              <button
                onClick={closeCoursePreview}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                title="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid lg:grid-cols-[1fr_360px] bg-slate-50">
              <div className="p-5 space-y-4 min-w-0">
                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center">
                  {previewVideoLoading ? (
                    <div className="text-center p-8">
                      <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-spin" />
                      <p className="text-slate-300 font-bold">Loading video preview...</p>
                    </div>
                  ) : previewVideoError ? (
                    <div className="text-center p-8">
                      <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                      <p className="text-slate-300 font-bold">{previewVideoError}</p>
                    </div>
                  ) : previewVideoUrl ? (
                    <video
                      key={previewLesson._id}
                      src={previewVideoUrl}
                      controls
                      className="w-full h-full object-contain bg-black"
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="text-center p-8">
                      <Play className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                      <p className="text-slate-300 font-bold">No video available for this lesson.</p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    {previewLesson?.moduleTitle || 'Lesson'}
                  </p>
                  <h4 className="text-lg font-bold text-slate-900">
                    {previewLesson?.title || 'Select a lesson'}
                  </h4>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    {previewLesson?.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              <aside className="bg-white border-l border-slate-200 p-5 overflow-y-auto">
                <h4 className="text-sm font-black text-slate-900 mb-4">Course Content</h4>
                <div className="space-y-5">
                  {(previewCourse.modules || []).map((module) => (
                    <div key={module._id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <h5 className="text-xs font-black text-slate-700 uppercase tracking-widest truncate">
                          {module.title}
                        </h5>
                        <span className="text-[10px] font-bold text-slate-400 shrink-0">
                          {module.lessons?.length || 0} Lessons
                        </span>
                      </div>

                      <div className="space-y-2">
                        {(module.lessons || []).map((lesson) => (
                          <button
                            key={lesson._id}
                            onClick={() => setPreviewLesson({ ...lesson, moduleTitle: module.title })}
                            className={`w-full text-left p-3 rounded-xl border transition-colors ${
                              previewLesson?._id === lesson._id
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                lesson.videoUrl ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'
                              }`}>
                                <Play className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate">{lesson.title}</p>
                                <p className="text-[10px] font-semibold opacity-70 mt-0.5">
                                  {lesson.videoUrl ? 'Video ready' : 'No video'} {lesson.duration ? `- ${lesson.duration}` : ''}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {getCourseLessons(previewCourse).length === 0 && (
                    <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl">
                      <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-400">No lessons found.</p>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourseApproval;
