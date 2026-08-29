import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  Download,
  ExternalLink,
  Clock,
  Lock,
  Search,
  CheckCircle2,
  Calendar,
  User,
  ShieldCheck,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { getMyCertificates, getCertificateDownloadUrl, claimCertificate, getCertificateById } from '../../services/certificateService';
import { getEnrolledCourses } from '../../services/userService';
import { getStudentExams } from '../../services/examService';
import { toast } from 'react-hot-toast';

const Certificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewCert, setPreviewCert] = useState(null);
  const [loadingCertId, setLoadingCertId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [certs, enrolled, studentExams] = await Promise.all([
        getMyCertificates(),
        getEnrolledCourses(),
        getStudentExams()
      ]);
      setCertificates(certs || []);
      setEnrolledCourses(enrolled || []);
      setExams(studentExams || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching certificates data:", err);
      setError("Failed to load certificates. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter pending courses (enrolled but no certificate created yet)
  const certificateCourseIds = certificates.map(cert => cert.course?._id || cert.course);
  const pendingCourses = enrolledCourses.filter(enrollment => {
    const course = enrollment.course || enrollment;
    return !certificateCourseIds.includes(course._id);
  });

  const filteredCertificates = certificates.filter(cert =>
    cert.certificateId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.course?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownload = (certId) => {
    const url = getCertificateDownloadUrl(certId);
    window.open(url, "_blank");
  };

  const handlePreview = async (cert) => {
    try {
      setLoadingCertId(cert._id);
      const updatedCert = await getCertificateById(cert._id);
      setPreviewCert(updatedCert);
    } catch (err) {
      console.error("Error fetching single certificate details:", err);
      // Fallback to local state if fetch fails
      setPreviewCert(cert);
    } finally {
      setLoadingCertId(null);
    }
  };

  const handleClaim = async (examId) => {
    try {
      setClaiming(true);
      await claimCertificate(examId);
      toast.success("Certificate request submitted! Pending instructor approval.");
      fetchData();
    } catch (err) {
      console.error("Error claiming certificate:", err);
      toast.error(err.response?.data?.message || "Failed to claim certificate.");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center bg-white rounded-[2.5rem] border border-slate-200">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">Loading your achievements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[60vh] flex items-center justify-center bg-white rounded-[2.5rem] border border-slate-200">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h3 className="text-xl font-bold text-slate-900">Oops! Something went wrong</h3>
          <p className="text-slate-500 max-w-md">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Certificates</h2>
          <p className="text-slate-500 mt-1">Download and share your industry-recognized certifications.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto font-sans">
          <button
            onClick={fetchData}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            title="Refresh list"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <div className="relative w-full md:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search certificates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-primary-500 transition-all outline-none font-medium"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-12">
        {/* Earned Certificates */}
        <div className="space-y-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            Verified Certifications
          </h3>
          {filteredCertificates.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 p-16 text-center flex flex-col items-center gap-4 rounded-3xl">
              <Award size={48} className="text-slate-200" />
              <p className="text-slate-500 font-medium italic">No certificates found matching your search.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {filteredCertificates.map((cert) => (
                <div key={cert._id} className="bg-white rounded-3xl border border-slate-200 flex flex-col md:flex-row overflow-hidden hover:border-blue-300 transition-all group">
                  <div className="w-full md:w-40 h-40 md:h-auto relative bg-slate-900 flex-shrink-0 border-r border-slate-100">
                    <img
                      src={cert.course?.thumbnail || "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80"}
                      alt={cert.course?.title}
                      className="w-full h-full object-cover opacity-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Award className="text-white opacity-80" size={40} />
                    </div>
                  </div>

                  <div className="flex-1 p-6 flex flex-col justify-between space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                          (cert.status === 'approved' || cert.status === 'issued') ? 'bg-green-50 text-green-600 border-green-100' :
                          cert.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {(cert.status === 'approved' || cert.status === 'issued') ? 'Verified' : cert.status === 'rejected' ? 'Rejected' : 'Pending Approval'}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">ID: {cert.certificateId}</span>
                      </div>
                      <h4 className="text-md font-bold text-slate-900 leading-tight line-clamp-2">{cert.course?.title}</h4>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Instructor</p>
                          <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mt-1 truncate"><User size={12} /> {cert.instructor?.name}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Issued On</p>
                          <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mt-1"><Calendar size={12} /> {new Date(cert.issueDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                      {(cert.status === 'approved' || cert.status === 'issued') ? (
                        <>
                          <button
                            disabled={loadingCertId !== null}
                            onClick={() => handleDownload(cert._id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-blue-100 transition-all disabled:opacity-50"
                          >
                            <Download size={14} />
                            Download PDF
                          </button>
                          <button
                            disabled={loadingCertId !== null}
                            onClick={() => handlePreview(cert)}
                            className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                            title="Preview Certificate"
                          >
                            {loadingCertId === cert._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink size={14} />}
                            View
                          </button>
                        </>
                      ) : cert.status === 'rejected' ? (
                        <div className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 flex-1 text-left">
                          Request Rejected. {cert.rejectionReason ? `Reason: ${cert.rejectionReason}` : "Please contact instructor."}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full gap-3">
                          <div className="text-xs font-bold text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100 flex-1 text-center flex items-center justify-center gap-1.5 animate-pulse">
                            <Clock size={14} /> Awaiting Approval
                          </div>
                          <button
                            disabled={loadingCertId !== null}
                            onClick={() => handlePreview(cert)}
                            className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {loadingCertId === cert._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink size={14} />}
                            Preview
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending / Claimable Certificates */}
        {pendingCourses.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              Locked & Claimable
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingCourses.map((enrollment) => {
                const course = enrollment.course || enrollment;
                const isCompleted = enrollment.completed;

                // Find matching exam for this course
                const courseExams = exams.filter(e => (e.course?._id || e.course) === course._id);
                const passedExam = courseExams.find(e => e.latestResult === 'pass');

                return (
                  <div key={course._id} className="bg-slate-50/50 p-5 rounded-3xl border border-slate-200 flex flex-col justify-between gap-5 border-dashed hover:bg-white transition-all group">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Lock className="text-slate-300 group-hover:text-blue-500 transition-colors" size={20} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <h4 className="font-bold text-slate-600 text-[13px] truncate">{course.title}</h4>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>Progress</span>
                            <span>{isCompleted ? '100%' : 'Not Completed'}</span>
                          </div>
                          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${isCompleted ? 'bg-green-500' : 'bg-blue-600'}`}
                              style={{ width: isCompleted ? '100%' : '50%' }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {isCompleted && (
                      <div className="pt-2">
                        {passedExam ? (
                          <button
                            disabled={claiming}
                            onClick={() => handleClaim(passedExam._id)}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 disabled:bg-blue-400 flex items-center justify-center gap-1.5"
                          >
                            <Award size={14} />
                            {claiming ? 'Claiming...' : 'Claim Certificate'}
                          </button>
                        ) : (
                          <div className="text-center text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2">
                            Pass the Course Exam first
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>



      {/* Certificate Preview Modal */}
      {previewCert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl p-6 md:p-8 relative flex flex-col items-center my-auto">
            {/* Close Button */}
            <button
              onClick={() => setPreviewCert(null)}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all rounded-full text-lg font-bold"
            >
              ✕
            </button>

            {/* Certificate Visual layout */}
            <div className="w-full aspect-[1.414/1] border-8 border-slate-900 p-5 md:p-8 relative flex flex-col justify-between bg-[#fbfcfd] text-center select-none overflow-hidden rounded shadow-inner">
              {/* Decorative corner borders */}
              <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-amber-600"></div>
              <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-amber-600"></div>
              <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-amber-600"></div>
              <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-amber-600"></div>

              <div className="absolute inset-4 border border-amber-700/30"></div>

              {/* Brand Header */}
              <div className="flex flex-col items-center mt-1">
                <img src="/logo.png" alt="StackVerseHub" className="h-8 md:h-10 w-auto object-contain" />
                <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight font-sans mt-1">CERTIFICATE OF COMPLETION</h2>
                <p className="text-slate-400 text-xs italic font-serif mt-0.5">This is proudly presented to</p>
              </div>

              {/* Student Name */}
              <div className="space-y-1 my-1">
                <h3 className="text-2xl md:text-4xl font-black text-sky-600 tracking-wider uppercase border-b-2 border-slate-200 pb-1 max-w-lg mx-auto font-sans">
                  {previewCert.student?.name || "Student Name"}
                </h3>
                <p className="text-slate-500 text-xs max-w-md mx-auto font-sans">
                  for successfully completing and passing all evaluation tasks in the course
                </p>
              </div>

              {/* Course Title */}
              <div className="space-y-1">
                <h4 className="text-md md:text-2xl font-black text-slate-900 italic font-serif">
                  "{previewCert.course?.title || "Course Title"}"
                </h4>
                <p className="text-[9px] text-slate-400 max-w-lg mx-auto font-sans">
                  A comprehensive training program encompassing theory sessions, hands-on lab exercises, and final assessments.
                </p>
              </div>

              {/* Signatures & Seal */}
              <div className="flex justify-between items-end w-full px-6 pt-2 mt-1">
                <div className="text-left w-1/3">
                  <div className="h-5 flex items-center justify-center font-serif text-slate-800 text-sm italic font-bold">
                    {previewCert.instructor?.name || "Authorized Signature"}
                  </div>
                  <div className="border-t border-slate-200 pt-0.5 text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Instructor</p>
                  </div>
                </div>

                {/* Gold seal */}
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg border border-amber-600 relative select-none">
                  ★
                  <div className="absolute inset-1 rounded-full border border-dashed border-white/50"></div>
                </div>

                <div className="text-right w-1/3">
                  <div className="h-5 flex items-center justify-center font-bold text-slate-700 text-[10px] md:text-xs">
                    {new Date(previewCert.approvedAt || previewCert.issueDate).toLocaleDateString()}
                  </div>
                  <div className="border-t border-slate-200 pt-0.5 text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Date of Issue</p>
                  </div>
                </div>
              </div>

              {/* Verification details */}
              <div className="flex justify-between items-center text-[7px] md:text-[9px] text-slate-400 px-4 pt-2 border-t border-slate-100">
                <span className="font-bold">Code: {previewCert.certificateCode || previewCert.certificateId}</span>
                <span>Verify at: http://localhost:5173/verify/{previewCert.certificateCode || previewCert.certificateId}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-6 w-full">
              <button
                onClick={() => setPreviewCert(null)}
                className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
              >
                Close Preview
              </button>
              {(previewCert.status === "approved" || previewCert.status === "issued") && (
                <button
                  onClick={() => {
                    handleDownload(previewCert._id);
                    setPreviewCert(null);
                  }}
                  className="w-1/2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-blue-100 transition-all"
                >
                  <Download size={16} />
                  Download PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Certificates;
