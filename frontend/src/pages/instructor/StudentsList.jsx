import React, { useEffect, useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MessageSquare, 
  BookOpen,
  Calendar,
  Users,
  Loader2,
  Mail,
  User,
  GraduationCap,
  Award
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { fetchInstructorStudents } from '../../features/instructor/instructorThunk';
import { completeStudentCourse } from '../../services/instructorService';

const StudentsList = () => {
  const dispatch = useDispatch();
  const { id: courseIdFromUrl } = useParams();
  const { students, loading } = useSelector((state) => state.instructor);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(courseIdFromUrl || 'all');
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCompleteCourseClick = (student) => {
    setSelectedStudent(student);
    setShowConfirmModal(true);
  };

  const handleConfirmComplete = async () => {
    if (!selectedStudent) return;
    try {
      setSubmitting(true);
      await completeStudentCourse(selectedStudent.courseId, selectedStudent.studentId);
      toast.success(`${selectedStudent.name} has been marked as course completed!`);
      setShowConfirmModal(false);
      setSelectedStudent(null);
      dispatch(fetchInstructorStudents());
    } catch (error) {
      console.error("Error completing course:", error);
      toast.error(error.response?.data?.message || "Failed to complete course.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    dispatch(fetchInstructorStudents());
  }, [dispatch]);

  useEffect(() => {
    if (courseIdFromUrl) {
      setSelectedCourseId(courseIdFromUrl);
    }
  }, [courseIdFromUrl]);

  // Extract unique courses for filter
  const uniqueCourses = useMemo(() => {
    const courses = students.reduce((acc, student) => {
      if (student.courseId && !acc.find(c => c.id === student.courseId)) {
        acc.push({ id: student.courseId, name: student.courseName });
      }
      return acc;
    }, []);
    return courses;
  }, [students]);

  // Filter logic
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = 
        student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.courseName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCourse = selectedCourseId === 'all' || student.courseId === selectedCourseId;
      
      return matchesSearch && matchesCourse;
    });
  }, [students, searchQuery, selectedCourseId]);

  const activeStudentsCount = filteredStudents.filter(s => s.status === 'Active').length;

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Student Roster</h2>
          <p className="text-slate-500 mt-1 font-medium">
            {courseIdFromUrl 
              ? `Showing students enrolled in ${filteredStudents[0]?.courseName || 'this course'}`
              : 'Detailed directory of students enrolled in your courses.'}
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-4 py-2 border-r border-slate-100 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrolled</p>
            <p className="text-sm font-black text-blue-600">{filteredStudents.length.toLocaleString()}</p>
          </div>
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active</p>
            <p className="text-sm font-black text-green-600">{activeStudentsCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search by name, email or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 shadow-sm transition-all outline-none"
          />
        </div>
        <div className="flex gap-4">
          <select 
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 outline-none shadow-sm cursor-pointer hover:bg-slate-50 transition-all"
          >
            <option value="all">All Courses</option>
            {uniqueCourses.map(course => (
              <option key={course.id} value={course.id}>{course.name}</option>
            ))}
          </select>
          <button className="px-6 py-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
            <Filter size={18} />
            Filters
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Information</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrolled Course</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Join Date</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Completion %</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                      <p className="text-slate-500 font-bold">Fetching roster data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                    {/* Student Information: Name & Email */}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <img 
                          src={student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`} 
                          alt={student.name} 
                          className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm object-cover" 
                        />
                        <div>
                          <p className="font-black text-slate-900 leading-none mb-1">{student.name}</p>
                          <div className="flex items-center gap-1 text-slate-400">
                            <Mail size={10} />
                            <span className="text-[10px] font-bold">{student.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Course Context */}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <BookOpen size={14} />
                        </div>
                        <p className="text-sm font-bold text-slate-900 truncate max-w-[180px]">{student.courseName}</p>
                      </div>
                    </td>

                    {/* Join Date */}
                    <td className="px-8 py-6 text-center">
                      <div className="inline-flex flex-col items-center">
                         <p className="text-sm font-bold text-slate-700">{new Date(student.purchaseDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                         <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Enrollment Date</p>
                      </div>
                    </td>

                    {/* Progress / Completion Percentage */}
                    <td className="px-8 py-6">
                      <div className="w-32 space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Complete</span>
                          <span className="text-blue-600">{student.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out" 
                            style={{ width: `${student.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Enrollment Status */}
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                        student.status === 'Completed' 
                          ? 'bg-green-50 text-green-600 border border-green-100' 
                          : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${student.status === 'Completed' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></div>
                        {student.status}
                      </div>
                    </td>

                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {student.completionStatus === 'completed' || student.status === 'Completed' ? (
                          <button 
                            disabled
                            className="px-4 py-2 bg-green-50 text-green-600 border border-green-250 rounded-xl text-xs font-black cursor-not-allowed uppercase tracking-wider"
                          >
                            Completed ✓
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleCompleteCourseClick(student)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-md shadow-blue-100 uppercase tracking-wider"
                          >
                            Complete Course
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                       <Users size={40} className="opacity-20" />
                       <p className="italic font-medium">No students match your criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Total Displayed: <span className="text-slate-900">{filteredStudents.length}</span>
          </p>
          <div className="flex gap-2">
            <button className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-400 cursor-not-allowed uppercase tracking-widest">Prev</button>
            <button className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm uppercase tracking-widest">Next</button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl p-8 relative flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 border border-blue-100">
              <Award size={32} />
            </div>
            
            <h3 className="text-xl font-black text-slate-900 mb-2">Mark Course Completed</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Mark this student as course completed? This will automatically generate and issue their certificate.
            </p>
            
            <div className="flex gap-4 w-full">
              <button
                disabled={submitting}
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedStudent(null);
                }}
                className="w-1/2 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={handleConfirmComplete}
                className="w-1/2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-100 transition-all active:scale-95 disabled:bg-blue-400"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsList;
