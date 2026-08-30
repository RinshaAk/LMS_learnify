import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchStudentDashboard } from "../../features/student/studentThunk";
import {
  CheckCircle2,
  Clock,
  PlayCircle,
  Award,
  ChevronRight,
  Loader2,
  Lock,
  Download,
  BookOpen,
  ClipboardCheck,
  XCircle
} from "lucide-react";
import { getCertificateDownloadUrl } from "../../services/certificateService";

const StudentDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { dashboardData, loading, error } = useSelector((state) => state.student);

  useEffect(() => {
    dispatch(fetchStudentDashboard());
  }, [dispatch]);

  if (loading && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
        <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">Preparing your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="bg-red-50/50 p-8 rounded-3xl border border-red-100 max-w-md space-y-4">
          <p className="text-red-650 font-extrabold text-lg">Failed to load dashboard</p>
          <p className="text-red-500 text-xs font-semibold leading-relaxed">{error}</p>
          <button 
            onClick={() => dispatch(fetchStudentDashboard())}
            className="w-full btn-primary py-2.5 text-xs uppercase tracking-wider rounded-xl bg-red-600 hover:bg-red-700 shadow-sm"
          >
            Retry Fetching
          </button>
        </div>
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Courses Completed",
      value: dashboardData?.completedCourses || 0,
      icon: <CheckCircle2 className="text-emerald-600 w-5 h-5" />,
      bg: "bg-emerald-50/60 border-emerald-100/50",
    },
    {
      label: "Enrolled Courses",
      value: dashboardData?.totalCourses || 0,
      icon: <Clock className="text-primary-600 w-5 h-5" />,
      bg: "bg-primary-50/60 border-primary-100/50",
    },
    {
      label: "Active Lessons",
      value: dashboardData?.pendingCourses || 0,
      icon: <PlayCircle className="text-blue-600 w-5 h-5" />,
      bg: "bg-blue-50/60 border-blue-100/50",
    },
  ];
  const examResults = dashboardData?.examResults || [];
  const getResultBadge = (result) => {
    if (result === "pass") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (result === "fail") return "bg-red-50 text-red-650 border-red-100";
    return "bg-amber-50 text-amber-700 border-amber-100";
  };
  const getResultText = (item) => {
    if (item.result === "pass") return "Pass";
    if (item.result === "fail") return "Failed";
    if (item.result === "pending") return "Pending";
    return item.status || "Completed";
  };
  const getResultIcon = (result) => {
    if (result === "pass") return <CheckCircle2 size={14} />;
    if (result === "fail") return <XCircle size={14} />;
    return <Clock size={14} />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Welcome back, {dashboardData?.studentName || "Student"}!
        </h2>
        <p className="text-slate-500 text-sm font-medium mt-1">
          Track your progress and continue your learning journey.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {summaryCards.map((card, idx) => (
          <div
            key={idx}
            className={`bg-white border border-slate-200/60 rounded-2xl p-5 flex items-center gap-4.5 shadow-sm`}
          >
            <div className={`w-11 h-11 ${card.bg} border rounded-xl flex items-center justify-center shrink-0`}>
              {card.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {card.label}
              </p>
              <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {card.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Continue Learning */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Continue Learning
            </h3>
            <button onClick={() => navigate('/student/courses')} className="text-primary-600 text-xs font-bold flex items-center gap-1 hover:text-primary-700 transition-colors uppercase tracking-wider">
              View All <ChevronRight size={14} />
            </button>
          </div>

          {/* Courses */}
          <div className="grid sm:grid-cols-2 gap-6">
            {dashboardData?.enrolledCourses?.length > 0 ? (
              dashboardData.enrolledCourses.map((item, index) => {
                const course = item.course || item;
                return (
                  <div
                    key={index}
                    className="card group flex flex-col justify-between border-slate-200/60"
                  >
                    <div>
                      <div className="relative aspect-video overflow-hidden bg-slate-50 border-b border-slate-100">
                        <img
                          src={course.thumbnail || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80"}
                          alt={course.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                        />
                      </div>

                      <div className="p-5 space-y-4">
                        <div>
                          <h4 className="font-extrabold text-slate-900 line-clamp-1 group-hover:text-primary-600 transition-colors">
                            {course.title}
                          </h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            By {course.instructor?.name || "Expert"}
                          </p>
                        </div>

                        <div className="space-y-2 pt-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                            <span className="text-primary-600">
                              {item.progress || 0}% Complete
                            </span>
                            <span className="text-slate-400">
                              {course.lessonsCount || course.lessons?.length || 0} Lessons
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-600 transition-all duration-500 rounded-full"
                              style={{ width: `${item.progress || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0 space-y-3">
                      <button 
                        onClick={() => navigate(`/student/player/${course._id}`)}
                        className="btn-primary w-full py-2.5 text-xs uppercase tracking-wider rounded-xl shadow-md shadow-primary-600/5"
                      >
                        Resume Course
                      </button>

                      {/* Certificate Actions / Lock */}
                      <div className="pt-3 border-t border-slate-100">
                        {item.completionStatus === "completed" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate("/student/certificates")}
                              className="flex-1 py-2 px-3 bg-primary-50 hover:bg-primary-100 text-primary-750 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 border border-primary-100 transition-all"
                            >
                              <Award size={12} />
                              View Certificate
                            </button>
                            {item.certificateId && ['approved', 'issued'].includes(item.certificateStatus) && (
                              <button
                                onClick={() => {
                                  window.open(getCertificateDownloadUrl(item.certificateId), "_blank");
                                }}
                                className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 border border-slate-200 transition-all"
                              >
                                <Download size={12} />
                                Download
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="w-full py-2.5 px-3 bg-slate-50 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 border border-dashed border-slate-200 cursor-not-allowed">
                            <Lock size={12} />
                            Certificate Locked
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-4">
                <BookOpen size={40} className="mx-auto text-slate-200" />
                <div>
                  <p className="text-slate-550 font-bold text-sm">No Active Enrolled Courses</p>
                  <p className="text-slate-400 text-xs mt-1">Enroll in one of our professional classes to start your path.</p>
                </div>
                <button 
                  onClick={() => navigate('/student/buy-courses')}
                  className="btn-primary py-2 px-6 text-xs uppercase tracking-wider rounded-xl"
                >
                  Explore Catalog
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div id="exam-results" className="bg-white border border-slate-200/60 rounded-2xl p-6 space-y-5 shadow-sm scroll-mt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-2 text-sm tracking-tight">
                <ClipboardCheck size={16} className="text-primary-600" />
                Exam Result
              </h3>
              <button
                onClick={() => navigate('/student/exams')}
                className="text-[10px] font-black uppercase tracking-wider text-primary-600 hover:text-primary-700"
              >
                View All
              </button>
            </div>

            {examResults.length > 0 ? (
              <div className="space-y-3">
                {examResults.slice(0, 5).map((item) => (
                  <div key={`${item.kind}-${item._id}`} className="p-3.5 bg-slate-50/50 border border-slate-150 rounded-xl space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                        <h4 className="text-xs font-extrabold text-slate-900 truncate mt-0.5">{item.title}</h4>
                        <p className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">{item.courseTitle}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${getResultBadge(item.result)}`}>
                        {getResultIcon(item.result)}
                        {getResultText(item)}
                      </span>
                    </div>
                    {item.result !== "pending" && item.score !== undefined && item.score !== null && (
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Score: {item.score}/{item.totalMarks || 100}
                      </p>
                    )}
                    {item.feedback && (
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-2">{item.feedback}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                <ClipboardCheck size={28} className="mx-auto text-slate-250" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3">No results yet</p>
              </div>
            )}
          </div>

          <div className="bg-slate-950 rounded-2xl p-6 text-white space-y-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary-600/10 rounded-full filter blur-2xl -mr-24 -mt-24"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                <Award size={18} className="text-primary-300" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-350">Accreditation</span>
            </div>
            <div className="space-y-3 relative z-10">
              <h4 className="text-base font-extrabold leading-snug">
                Earn professional, shareable certificates.
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                Pass course assessments and tasks to unlock verified secure credentials to add to your resume.
              </p>
            </div>
            <button 
              onClick={() => navigate('/student/certificates')}
              className="w-full py-3 bg-white text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-100 transition-colors shadow-sm relative z-10"
            >
              View My Certificates
            </button>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 space-y-6 shadow-sm">
            <h3 className="font-extrabold text-slate-900 flex items-center gap-2 text-sm tracking-tight">
              <PlayCircle size={16} className="text-primary-600" />
              Learning Practices
            </h3>
            <div className="space-y-5">
              {[
                { title: "Consistent Practice", desc: "Dedicate 30 minutes daily to maintain momentum." },
                { title: "Active Note-taking", desc: "Write short code snippets to lock in logic." },
                { title: "GitHub Projects", desc: "Build locally and push to showcase your solution." }
              ].map((tip, i) => (
                <div key={i} className="flex gap-4.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-primary-600 font-extrabold text-xs shrink-0 border border-slate-150">
                    {i + 1}
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-slate-900">{tip.title}</h5>
                    <p className="text-[11px] text-slate-500 leading-normal font-medium">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
