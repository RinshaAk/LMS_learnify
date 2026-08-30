import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchStudentDashboard } from "../../features/student/studentThunk";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

const StudentExamResults = () => {
  const dispatch = useDispatch();
  const { dashboardData, loading, error } = useSelector((state) => state.student);
  const examResults = dashboardData?.examResults || [];

  useEffect(() => {
    dispatch(fetchStudentDashboard());
  }, [dispatch]);

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
    if (result === "pass") return <CheckCircle2 size={15} />;
    if (result === "fail") return <XCircle size={15} />;
    return <Clock size={15} />;
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
        <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">Loading exam results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="bg-red-50/50 p-8 rounded-3xl border border-red-100 max-w-md space-y-4">
          <p className="text-red-650 font-extrabold text-lg">Failed to load exam results</p>
          <p className="text-red-500 text-xs font-semibold leading-relaxed">{error}</p>
          <button
            onClick={() => dispatch(fetchStudentDashboard())}
            className="w-full btn-primary py-2.5 text-xs uppercase tracking-wider rounded-xl bg-red-600 hover:bg-red-700 shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardCheck size={24} className="text-primary-600" />
            Exam Result
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Your mission task and review exam results.
          </p>
        </div>
        <button
          onClick={() => dispatch(fetchStudentDashboard())}
          disabled={loading}
          className="btn-secondary py-2.5 px-4 text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {examResults.length > 0 ? (
        <div className="grid lg:grid-cols-2 gap-4">
          {examResults.map((item) => (
            <div key={`${item.kind}-${item._id}`} className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1 break-words">{item.title}</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">{item.courseTitle}</p>
                </div>
                <span className={`shrink-0 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${getResultBadge(item.result)}`}>
                  {getResultIcon(item.result)}
                  {getResultText(item)}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Score</p>
                  <p className="text-sm font-extrabold text-slate-800 mt-1">
                    {item.score !== undefined && item.score !== null ? `${item.score}/${item.totalMarks || 100}` : "Pending"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Submitted</p>
                  <p className="text-sm font-extrabold text-slate-800 mt-1">
                    {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : "Not available"}
                  </p>
                </div>
              </div>

              {item.feedback && (
                <div className="bg-primary-50/50 border border-primary-100/60 rounded-xl p-3">
                  <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest">Feedback</p>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">{item.feedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
          <ClipboardCheck size={42} className="mx-auto text-slate-250" />
          <p className="text-sm font-extrabold text-slate-500 mt-4">No exam results yet</p>
          <p className="text-xs text-slate-400 font-medium mt-1">Completed mission tasks and review exams will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default StudentExamResults;
