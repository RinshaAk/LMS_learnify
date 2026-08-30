import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Clock, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  History,
  Link as LinkIcon,
  ChevronRight,
  User,
  Loader2,
  AlertTriangle,
  GitBranch,
  Award,
  Check,
  MessageSquare,
  ExternalLink,
  X
} from 'lucide-react';
import { getStudentExams, getExamHistory, submitExamAttempt, requestExtraAttempt, checkExamEligibility, getExamResourceUrl } from '../../services/examService';
import { toast } from 'react-hot-toast';

// Simple countdown timer for scheduled exams
const ExamCountdown = ({ targetDate, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate) - new Date();
      return difference > 0 ? Math.floor(difference / 1000) : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        if (onComplete) onComplete();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (timeLeft <= 0) return null;

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <span className="text-[10px] font-black text-primary-700 bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-lg tracking-wider uppercase">
      Starts in: {hours > 0 ? `${hours}h ` : ''}{minutes}m {seconds}s
    </span>
  );
};

const Exams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [examHistory, setExamHistory] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Active exam / Modal states
  const [activeExam, setActiveExam] = useState(null);
  const [assessmentType, setAssessmentType] = useState(null); // 'theory' or 'machine_task'
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);

  // Machine task submission form states
  const [repoUrl, setRepoUrl] = useState('');
  const [studentNotes, setStudentNotes] = useState('');

  // Request Extra Attempt states
  const [requestExamId, setRequestExamId] = useState(null);
  const [requestReason, setRequestReason] = useState('');

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const data = await getStudentExams();
      setExams(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching exams:", err);
      setError("Failed to load your exams. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (examId) => {
    try {
      const history = await getExamHistory(examId);
      setExamHistory(prev => ({ ...prev, [examId]: history }));
    } catch (err) {
      console.error("Error fetching exam history:", err);
    }
  };

  const handleOpenExamResource = async (exam) => {
    try {
      const result = await getExamResourceUrl(exam._id, exam.attachment);
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error("Error opening assessment resource:", err);
      toast.error(err.response?.data?.message || "Failed to open reference material.");
    }
  };

  // Start Assessment Handler
  const handleStartAssessment = async (exam) => {
    const now = new Date();
    const startsAt = exam.scheduledDate ? new Date(exam.scheduledDate) : null;
    const closesAt = exam.deadline
      ? new Date(exam.deadline)
      : startsAt && exam.duration
        ? new Date(startsAt.getTime() + Number(exam.duration) * 60 * 1000)
        : null;

    if (startsAt && now < startsAt) return toast.error("This assessment has not started yet.");
    if (closesAt && now > closesAt) return toast.error("This assessment window is closed.");
    if (['completed', 'expired'].includes(exam.status)) return toast.error("This assessment window is closed.");

    try {
      const eligibility = await checkExamEligibility(exam._id);
      if (!eligibility.eligible) {
        return toast.error("You are not eligible for another submission.");
      }
    } catch (err) {
      return toast.error(err.response?.data?.message || "Unable to start this assessment.");
    }

    if (exam.examType === 'theory' && exam.taskType !== 'task') {
      const questions = (exam.questions && exam.questions.length > 0)
        ? exam.questions
        : [];
      if (questions.length === 0) {
        return toast.error("This assessment has no questions yet.");
      }
      setActiveExam(exam);
      setAssessmentType('theory');
      setQuizQuestions(questions);
      setCurrentQuestionIndex(0);
      const savedAnswers = localStorage.getItem(`exam-progress-${exam._id}`);
      setSelectedAnswers(savedAnswers ? JSON.parse(savedAnswers) : {});
      setTimeLeft((exam.duration || 60) * 60); // minutes to seconds
    } else {
      setActiveExam(exam);
      setAssessmentType('machine_task');
      setRepoUrl('');
      setStudentNotes('');
    }
  };

  useEffect(() => {
    if (activeExam && assessmentType === 'theory') {
      localStorage.setItem(`exam-progress-${activeExam._id}`, JSON.stringify(selectedAnswers));
    }
  }, [selectedAnswers, activeExam, assessmentType]);

  // Timer effect for Theory Quiz
  useEffect(() => {
    if (activeExam && assessmentType === 'theory' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (activeExam && assessmentType === 'theory' && timeLeft === 0) {
      toast.error("Time is up! Auto-submitting assessment.");
      handleQuizSubmit();
    }
  }, [timeLeft, activeExam, assessmentType]);

  // Quiz submission
  const handleQuizSubmit = async () => {
    if (!activeExam || submitting) return;
    setSubmitting(true);
    try {
      let correctCount = 0;
      quizQuestions.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.correct) {
          correctCount++;
        }
      });
      
      const finalScore = Math.round((correctCount / quizQuestions.length) * 100);
      
      const answers = quizQuestions.map((question, idx) => ({
        questionId: question._id,
        questionIndex: idx,
        selectedOption: selectedAnswers[idx],
        answer: selectedAnswers[idx],
      })).filter((answer) => answer.selectedOption !== undefined);

      await submitExamAttempt(activeExam._id, { score: finalScore, answers });
      toast.success(`Exam submitted successfully! Score: ${finalScore}%`);
      localStorage.removeItem(`exam-progress-${activeExam._id}`);
      
      setActiveExam(null);
      setAssessmentType(null);
      fetchExams();
      fetchHistory(activeExam._id);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to submit exam attempt.");
    } finally {
      setSubmitting(false);
    }
  };

  // Machine Task submission
  const handleMachineTaskSubmit = async (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return toast.error("Please enter your GitHub repository link.");
    
    const isGithub = repoUrl.toLowerCase().includes("github.com/");
    if (!isGithub) {
      return toast.error("Please submit a valid GitHub Repository link (github.com/username/repo).");
    }

    setSubmitting(true);
    try {
      await submitExamAttempt(activeExam._id, {
        submissionUrl: repoUrl.trim(),
        studentNotes: studentNotes.trim()
      });
      
      toast.success("Coding Task submitted! Undergoing instructor evaluation.");
      setActiveExam(null);
      setAssessmentType(null);
      fetchExams();
      fetchHistory(activeExam._id);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to submit coding attempt.");
    } finally {
      setSubmitting(false);
    }
  };

  // Request extra attempt
  const handleRequestAttemptSubmit = async (e) => {
    e.preventDefault();
    if (!requestReason.trim()) return toast.error("Please provide a reason for the request.");

    setSubmitting(true);
    try {
      await requestExtraAttempt(requestExamId, requestReason.trim());
      toast.success("Extra attempt requested successfully. Pending approval.");
      setRequestExamId(null);
      setRequestReason('');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
        <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">Loading your assessments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="bg-red-50/50 p-8 rounded-3xl border border-red-100 max-w-md space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Oops! Something went wrong</h3>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">{error}</p>
          <button 
            onClick={fetchExams}
            className="w-full btn-primary py-2.5 text-xs uppercase tracking-wider rounded-xl bg-red-650 hover:bg-red-700 shadow-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const activeExams = exams.filter((exam) => {
    const isMachineOrMissionTask = exam.examType === 'machine_task' || exam.taskType === 'task';
    const hasFinalTaskResult = isMachineOrMissionTask && ['pass', 'fail'].includes(exam.latestResult);
    return !hasFinalTaskResult;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Assessment Center</h2>
        <p className="text-slate-500 text-sm font-medium mt-1">Track your course exams, submit machine tasks, and view grading feedback.</p>
      </div>

      <div className="grid gap-8">
        {activeExams.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-4">
            <FileText size={40} className="mx-auto text-slate-200 animate-pulse" />
            <div>
              <p className="text-slate-550 font-bold text-sm">No Assessments Found</p>
              <p className="text-slate-400 text-xs mt-1">There are no assessments assigned to your enrolled courses yet.</p>
            </div>
          </div>
        ) : (
          activeExams.map((exam) => {
            const isFailed = exam.latestResult === 'fail' && exam.attemptCount >= exam.maxAttempts;
            const isPassed = exam.latestResult === 'pass';
            const isPendingEvaluation = exam.latestResult === 'pending';
            const isMachineOrMissionTask = exam.examType === 'machine_task' || exam.taskType === 'task';
            const now = new Date();
            const startsAt = exam.scheduledDate ? new Date(exam.scheduledDate) : null;
            const closesAt = exam.deadline
              ? new Date(exam.deadline)
              : startsAt && exam.duration
                ? new Date(startsAt.getTime() + Number(exam.duration) * 60 * 1000)
                : null;
            const isNotStarted = exam.taskType === 'exam' && startsAt && now < startsAt;
            const isAssessmentClosed = closesAt
              ? now > closesAt
              : ['completed', 'expired'].includes(exam.status);
            
            return (
              <div 
                key={exam._id} 
                className={`bg-white rounded-2xl border transition-all duration-300 ${
                  isFailed ? 'border-red-200 bg-red-50/5' : isPassed ? 'border-emerald-200 bg-emerald-50/5' : 'border-slate-200/60 shadow-sm'
                }`}
              >
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/20">
                  <div className="flex gap-4.5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                      isPassed ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 
                      isFailed ? 'bg-red-50 text-red-600 border-red-100/50' : 
                      'bg-primary-50 text-primary-600 border-primary-100/50'
                    }`}>
                      {isMachineOrMissionTask ? <GitBranch size={22} /> : <FileText size={22} />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                          isMachineOrMissionTask ? 'bg-purple-50 text-purple-600 border-purple-100/50' : 'bg-emerald-50 text-emerald-600 border-emerald-100/50'
                        }`}>
                          {isMachineOrMissionTask ? '💻 Machine Task' : '📝 Theory Exam'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                          exam.taskType === 'task' ? 'bg-indigo-50 text-indigo-600 border-indigo-100/50' : 'bg-blue-50 text-blue-600 border-blue-100/50'
                        }`}>
                          {exam.taskType === 'task' ? '📋 Task' : '⏱️ Exam'}
                        </span>
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-900 mt-2 leading-snug">{exam.course?.title}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                        <User size={12} className="text-primary-600" /> Instructor: {exam.instructor?.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
                    <div className="px-3.5 py-1.5 bg-white rounded-xl border border-slate-200/80 text-[10px] font-black uppercase tracking-wider shadow-sm text-slate-500">
                      Attempts: <span className={exam.attemptCount >= exam.maxAttempts ? 'text-red-500' : 'text-slate-900'}>{exam.attemptCount}/{exam.maxAttempts}</span>
                    </div>
                    <div className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-wider shadow-sm ${
                      isPassed ? 'bg-emerald-50 text-emerald-600 border-emerald-250/50' : 
                      isFailed ? 'bg-red-50 text-red-600 border-red-250/50' : 
                      isPendingEvaluation ? 'bg-amber-50 text-amber-600 border-amber-250/50' :
                      'bg-slate-50 text-slate-500 border-slate-200/80'
                    }`}>
                      {isPassed ? 'Passed' : isFailed ? 'Failed' : isPendingEvaluation ? 'Evaluating' : exam.status}
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                  {/* Left Side: Info & Topics */}
                  <div className="p-6 md:p-8 space-y-6 flex flex-col justify-between">
                    <div className="space-y-6">
                      {exam.description && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">Description</h4>
                          <p className="text-sm text-slate-650 font-semibold leading-relaxed">{exam.description}</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">Topics Cover</h4>
                        <div className="flex flex-wrap gap-2">
                          {exam.topics?.map((topic, i) => (
                            <span key={i} className="px-2.5 py-1 bg-slate-50 text-slate-500 text-[9px] font-black rounded-lg border border-slate-150 uppercase tracking-wider">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>

                      {isMachineOrMissionTask && exam.requirements && exam.requirements.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest px-0.5">Guidelines & Specifications</h4>
                          <div className="space-y-2">
                            {exam.requirements.map((req, i) => (
                              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-500 font-medium leading-tight">
                                <Check size={14} className="text-purple-500 shrink-0 mt-0.5" />
                                <span>{req}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {exam.instructions && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">Instructions</h4>
                          <p className="text-xs text-slate-500 bg-slate-50/50 border border-slate-150 p-4 rounded-xl font-medium leading-relaxed">{exam.instructions}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50 text-xs font-bold text-slate-500">
                        {exam.taskType === 'task' && exam.deadline ? (
                          <div className="flex items-center gap-2 text-red-500">
                            <Calendar size={15} />
                            <span>Deadline: {new Date(exam.deadline).toLocaleDateString()} at {new Date(exam.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : exam.scheduledDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar size={15} className="text-slate-400" />
                            <span>Start: {new Date(exam.scheduledDate).toLocaleDateString()} at {new Date(exam.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : exam.deadline ? (
                          <div className="flex items-center gap-2 text-red-500">
                            <Calendar size={15} />
                            <span>Deadline: {new Date(exam.deadline).toLocaleDateString()} at {new Date(exam.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : null}
                        {exam.duration ? (
                          <div className="flex items-center gap-2">
                            <Clock size={15} className="text-slate-400" />
                            <span>Duration: {exam.duration} mins</span>
                          </div>
                        ) : null}
                        <div className="flex items-center gap-2 text-emerald-600 col-span-1 md:col-span-2 font-black">
                          <Award size={15} />
                          <span>Total Marks: {exam.totalMarks || 100}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 space-y-4">
                      {exam.attachment && (
                        <button
                          type="button"
                          onClick={() => handleOpenExamResource(exam)}
                          className="p-4 bg-primary-50/40 rounded-xl border border-primary-100/50 flex items-center justify-between text-xs font-bold text-primary-650 hover:bg-primary-50 transition-colors"
                        >
                          <span className="flex items-center gap-2"><LinkIcon size={14} /> Reference Material.pdf</span>
                          <ExternalLink size={12} />
                        </button>
                      )}

                      {/* CTA Action buttons */}
                      {exam.attemptCount < exam.maxAttempts && !isPassed && !isPendingEvaluation && (
                        <>
                          {isNotStarted ? (
                            <div className="flex flex-col gap-2.5 w-full">
                              <button 
                                disabled
                                className="w-full py-3.5 bg-slate-100 text-slate-400 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed border border-slate-150"
                              >
                                Exam is Scheduled
                              </button>
                              <div className="text-center">
                                <ExamCountdown targetDate={exam.scheduledDate} onComplete={() => fetchExams()} />
                              </div>
                            </div>
                          ) : isAssessmentClosed ? (
                            <div className="p-3.5 bg-red-50 text-red-650 rounded-xl border border-red-100 text-xs font-black text-center uppercase tracking-wider w-full">
                              Assessment Window Closed
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleStartAssessment(exam)}
                              className="w-full btn-primary py-3.5 text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-primary-600/5"
                            >
                              {isMachineOrMissionTask ? 'Submit Project Solution' : 'Start assessment'}
                              <ChevronRight size={14} />
                            </button>
                          )}
                        </>
                      )}
                      
                      {isPendingEvaluation && (
                        <div className="p-3.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 text-xs font-black text-center uppercase tracking-wider">
                          Awaiting Instructor Grading Evaluation
                        </div>
                      )}

                      {isPassed && (
                        <div className="p-3.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-xs font-black text-center uppercase tracking-wider flex items-center justify-center gap-2">
                          <CheckCircle2 size={14} /> Passed & Completed!
                        </div>
                      )}

                      {isFailed && (
                        <div className="space-y-3">
                          <div className="p-3.5 bg-red-50 text-red-600 rounded-xl text-xs font-black flex items-center gap-2 border border-red-100 uppercase tracking-wider justify-center">
                            <AlertTriangle size={14} /> All attempts completed
                          </div>
                          <button 
                            onClick={() => {
                              setRequestExamId(exam._id);
                              setRequestReason('');
                            }}
                            className="w-full btn-secondary py-3.5 text-xs uppercase tracking-wider rounded-xl text-red-600 border-red-200 hover:bg-red-50 transition-all"
                          >
                            Request Extra Attempt
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Attempts History */}
                  <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">
                        Recent Attempts
                      </h4>
                      <button 
                        onClick={() => fetchHistory(exam._id)}
                        className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors flex items-center gap-1.5 border border-primary-100/30"
                      >
                        <History size={12} />
                        Sync History
                      </button>
                    </div>
                    
                    <div className="space-y-4 overflow-y-auto max-h-[350px] pr-1.5 custom-scrollbar">
                      {examHistory[exam._id]?.map((attempt) => (
                        <div 
                          key={attempt._id} 
                          className="p-5 rounded-xl border border-slate-150 bg-slate-50/30 space-y-4"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs border ${
                                attempt.result === 'pass' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                attempt.result === 'fail' ? 'bg-red-50 text-red-600 border-red-100' : 
                                'bg-amber-50 text-amber-600 border-amber-100'
                              }`}>
                                #{attempt.attemptNumber}
                              </div>
                              <div>
                                <span className={`text-[10px] font-black uppercase tracking-wider ${
                                  attempt.result === 'pass' ? 'text-emerald-600' : 
                                  attempt.result === 'fail' ? 'text-red-500' : 'text-amber-500'
                                }`}>
                                  {attempt.result === 'pending' ? 'Pending Eval' : `${attempt.result} • ${attempt.score}%`}
                                </span>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                  {new Date(attempt.attemptedAt || attempt.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {attempt.result === 'pass' ? <CheckCircle2 size={16} className="text-emerald-500" /> : 
                             attempt.result === 'fail' ? <XCircle size={16} className="text-red-500" /> : 
                             <Clock size={16} className="text-amber-550" />}
                          </div>

                          {/* Submission Details */}
                          {attempt.submissionUrl && (
                            <div className="p-3 bg-slate-900 rounded-lg text-white text-[11px] flex justify-between items-center">
                              <span className="truncate max-w-[200px] font-mono text-[10px] text-slate-350">{attempt.submissionUrl}</span>
                              <a href={attempt.submissionUrl} target="_blank" rel="noopener noreferrer" className="text-primary-300 hover:text-white shrink-0 ml-2">
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          )}

                          {/* Feedback text */}
                          {attempt.feedback && (
                            <div className="p-3 bg-white border border-slate-150 rounded-lg text-xs flex items-start gap-2.5 text-slate-650 font-medium">
                              <MessageSquare size={13} className="text-primary-500 shrink-0 mt-0.5" />
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Instructor Feedback</span>
                                {attempt.feedback}
                              </div>
                            </div>
                          )}

                        </div>
                      ))}
                      
                      {(!examHistory[exam._id] || examHistory[exam._id].length === 0) && (
                        <div className="py-10 text-center space-y-2">
                          <History size={32} className="mx-auto text-slate-200" />
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">No attempts found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* THEORY ASSESSMENT SIMULATOR MODAL */}
      {activeExam && assessmentType === 'theory' && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/30">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Theory Exam: {activeExam.title}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Course: {activeExam.course?.title}</p>
              </div>
              <div className="px-3.5 py-1.5 bg-red-50 text-red-600 border border-red-100/50 rounded-xl font-mono text-xs font-black flex items-center gap-1.5">
                <Clock size={14} />
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Question {currentQuestionIndex + 1} of {quizQuestions.length}</span>
                <span>{Math.round(((currentQuestionIndex + 1) / quizQuestions.length) * 100)}% Complete</span>
              </div>
              
              {quizQuestions.length > 0 && (
                <div className="space-y-6">
                  <h4 className="text-sm font-extrabold text-slate-800 leading-snug">
                    {quizQuestions[currentQuestionIndex].q}
                  </h4>
                  
                  {/* Options */}
                  <div className="space-y-3">
                    {quizQuestions[currentQuestionIndex].options?.map((option, idx) => {
                      const isSelected = selectedAnswers[currentQuestionIndex] === idx;
                      return (
                        <div 
                          key={idx}
                          onClick={() => setSelectedAnswers({
                            ...selectedAnswers,
                            [currentQuestionIndex]: idx
                          })}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3.5 ${
                            isSelected 
                              ? 'border-primary-500 bg-primary-50/10 shadow-sm' 
                              : 'border-slate-150 bg-slate-50/30 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-primary-500 bg-primary-500 text-white' : 'border-slate-300'
                          }`}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                          </div>
                          <span className="text-xs font-semibold text-slate-700 leading-snug">{option}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/30 shrink-0 flex justify-between gap-4">
              <button
                type="button"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                className="btn-secondary py-2 px-4 text-xs uppercase tracking-wider rounded-xl disabled:opacity-50"
              >
                Previous
              </button>

              {currentQuestionIndex < quizQuestions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedAnswers[currentQuestionIndex] === undefined) {
                      return toast.error("Please select an answer to proceed.");
                    }
                    setCurrentQuestionIndex(currentQuestionIndex + 1);
                  }}
                  className="btn-primary py-2.5 px-5 text-xs uppercase tracking-wider rounded-xl"
                >
                  Next Question
                  <ChevronRight size={13} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    if (selectedAnswers[currentQuestionIndex] === undefined) {
                      return toast.error("Please select an answer to submit.");
                    }
                    handleQuizSubmit();
                  }}
                  className="btn-primary py-2.5 px-6 text-xs uppercase tracking-wider rounded-xl"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit Exam'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MACHINE TASK SUBMISSION MODAL */}
      {activeExam && assessmentType === 'machine_task' && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/30">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Submit coding task</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Exam: {activeExam.title}</p>
              </div>
              <button 
                onClick={() => {
                  setActiveExam(null);
                  setAssessmentType(null);
                }} 
                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-650 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleMachineTaskSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              {activeExam.requirements && activeExam.requirements.length > 0 && (
                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-2.5">
                  <h4 className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Grading Requirements</h4>
                  <div className="space-y-1.5">
                    {activeExam.requirements.map((req, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-600 font-medium leading-tight">
                        <Check size={12} className="text-purple-500 shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Repo Link */}
              <div className="space-y-2">
                <label htmlFor="repo-url-input" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">GitHub Repository URL</label>
                <input 
                  id="repo-url-input"
                  name="repoUrl"
                  type="url"
                  placeholder="https://github.com/username/project"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label htmlFor="student-notes-input" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">Submission Notes</label>
                <textarea 
                  id="student-notes-input"
                  name="studentNotes"
                  rows="4"
                  placeholder="Include layout remarks, code architecture, or deployment details..."
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  className="input-field resize-none"
                />
              </div>

              <div className="pt-4 flex justify-between gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setActiveExam(null);
                    setAssessmentType(null);
                  }}
                  className="w-1/3 btn-secondary py-3 text-xs uppercase tracking-wider rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-2/3 btn-primary py-3 text-xs uppercase tracking-wider rounded-xl"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit Solution'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* REQUEST ATTEMPT MODAL */}
      {requestExamId && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Request Extra Attempt</h3>
              <button 
                onClick={() => setRequestExamId(null)} 
                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-650"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRequestAttemptSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="reason-textarea" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">Reason for Request</label>
                <textarea 
                  id="reason-textarea"
                  name="reason"
                  rows="4"
                  placeholder="Explain why you require another attempt (e.g. system disconnect, review revision)..."
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="input-field resize-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-between gap-3">
                <button 
                  type="button" 
                  onClick={() => setRequestExamId(null)}
                  className="w-1/3 btn-secondary py-2.5 text-xs uppercase tracking-wider rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-2/3 btn-primary py-2.5 text-xs uppercase tracking-wider rounded-xl"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Exams;
