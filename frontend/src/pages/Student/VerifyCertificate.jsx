import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  AlertCircle,
  Loader2,
  Search,
  Calendar,
  User,
  BookOpen,
  Award,
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { verifyCertificate } from '../../services/certificateService';

const VerifyCertificate = () => {
  const { certificateCode: urlCode } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(urlCode || '');
  const [loading, setLoading] = useState(false);
  const [certData, setCertData] = useState(null);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleVerify = useCallback(async (codeToVerify) => {
    if (!codeToVerify || !codeToVerify.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const data = await verifyCertificate(codeToVerify.trim());
      setCertData(data);
    } catch (err) {
      console.error("Verification error:", err);
      setError(
        err.response?.data?.message ||
        "Invalid certificate code. The credential could not be found or verified in our database."
      );
      setCertData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (urlCode) {
      setCode(urlCode);
      handleVerify(urlCode);
    } else {
      setCertData(null);
      setError(null);
      setSearched(false);
    }
  }, [urlCode, handleVerify]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim()) {
      navigate(`/verify/${code.trim()}`);
    }
  };

  const handleReset = () => {
    setCode('');
    setCertData(null);
    setError(null);
    setSearched(false);
    navigate('/verify');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      {/* Premium Sticky Navigation */}
      <nav className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200/80 z-50 py-4 transition-all duration-300">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="text-white w-5 h-5" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900">
              StackVerseHub
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link
              to="/login"
              className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-blue-600 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Explore Courses
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-50">
        {/* Abstract Background Accents */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full filter blur-[120px] -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full filter blur-[120px] translate-x-1/2 translate-y-1/2"></div>

        <div className="w-full max-w-4xl z-10 my-8">

          {/* Default Search State */}
          {!searched && !loading && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-2xl p-10 md:p-16 max-w-2xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mx-auto w-20 h-20 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-center text-blue-600 shadow-inner">
                <ShieldCheck size={40} className="stroke-[1.5]" />
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Verify Academy Credentials</h1>
                <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                  Enter the secure certificate verification code to validate the student identity, program completion, and authenticity of the credential.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                    <Search size={18} />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Enter Certificate Code (e.g. CERT-XXXX-XXXX)"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-2xl text-md font-bold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                >
                  Verify Authenticity
                </button>
              </form>

              <div className="pt-6 border-t border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Award size={14} /> Backed by secure StackVerseHub Verification Registry
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-16 max-w-md mx-auto text-center space-y-6 flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Retrieving Record</h3>
                <p className="text-slate-400 text-sm">Searching the StackVerseHub database for verification ID: <span className="font-bold text-slate-600">{code}</span></p>
              </div>
            </div>
          )}

          {/* Error / Invalid State */}
          {error && !loading && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-10 md:p-16 max-w-2xl mx-auto text-center space-y-8 animate-in fade-in duration-300">
              <div className="mx-auto w-20 h-20 bg-red-50 border border-red-100 rounded-3xl flex items-center justify-center text-red-500 shadow-inner">
                <AlertCircle size={40} className="stroke-[1.5]" />
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Verification Failed</h2>
                <p className="text-red-500 font-medium text-sm max-w-md mx-auto leading-relaxed">
                  {error}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left max-w-md mx-auto text-xs text-slate-500 space-y-2 leading-relaxed">
                <span className="font-bold text-slate-700 block uppercase tracking-wider mb-1">Troubleshooting Tips:</span>
                <ul className="list-disc list-inside space-y-1">
                  <li>Verify that the code was copied exactly without spaces.</li>
                  <li>Certificate codes are case-sensitive. Check capitalizations.</li>
                  <li>Ensure the certificate request has been approved by the instructor.</li>
                </ul>
              </div>

              <div className="flex gap-4 max-w-md mx-auto pt-4">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
                >
                  Clear and Try Again
                </button>
              </div>
            </div>
          )}

          {/* Success State */}
          {certData && !loading && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Status Header Block */}
              <div className={`p-8 rounded-[2rem] border shadow-md flex flex-col md:flex-row items-center justify-between gap-6 ${
                certData.valid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : certData.status === 'rejected'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-5 text-center md:text-left flex-col md:flex-row">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                    certData.valid
                      ? 'bg-emerald-600 text-white shadow-emerald-600/10'
                      : certData.status === 'rejected'
                      ? 'bg-red-600 text-white shadow-red-600/10'
                      : 'bg-amber-500 text-white shadow-amber-500/10'
                  }`}>
                    {certData.valid ? <ShieldCheck size={32} /> : certData.status === 'rejected' ? <XCircle size={32} /> : <Clock size={32} />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${
                        certData.valid
                          ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                          : certData.status === 'rejected'
                          ? 'bg-red-100 border-red-200 text-red-700'
                          : 'bg-amber-100 border-amber-250 text-amber-700'
                      }`}>
                        {certData.status === 'approved' ? 'Verified Credential' : certData.status === 'rejected' ? 'Request Rejected' : 'Awaiting Approval'}
                      </span>
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900">
                      {certData.valid
                        ? 'This certificate is fully valid and verified.'
                        : certData.status === 'rejected'
                        ? 'This certificate request was rejected.'
                        : 'This certificate request is pending instructor approval.'}
                    </h2>
                    <p className="text-slate-500 text-xs font-semibold">Verification ID: {certData.certificateCode}</p>
                  </div>
                </div>

                <div className="flex gap-3 shrink-0 w-full md:w-auto">
                  <button
                    onClick={handleReset}
                    className="flex-1 md:flex-none px-6 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft size={14} /> Verify Another
                  </button>
                </div>
              </div>

              {/* Certificate Layout Card Grid */}
              <div className="grid md:grid-cols-3 gap-8">
                {/* Visual Certificate (takes 2 columns) */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Certificate Preview</h3>

                  <div className="w-full aspect-[1.414/1] border-8 border-slate-900 p-5 md:p-8 relative flex flex-col justify-between bg-[#fbfcfd] text-center select-none overflow-hidden rounded-[1.5rem] shadow-xl border-double">
                    {/* Decorative corner borders */}
                    <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-amber-600"></div>
                    <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-amber-600"></div>
                    <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-amber-600"></div>
                    <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-amber-600"></div>

                    <div className="absolute inset-4 border border-amber-700/30"></div>

                    {/* Brand Header */}
                    <div className="flex flex-col items-center mt-1">
                      <img src="/logo.png" alt="StackVerseHub" className="h-6 md:h-8 w-auto object-contain" />
                      <h2 className="text-md md:text-2xl font-black text-slate-900 tracking-tight mt-1">CERTIFICATE OF COMPLETION</h2>
                      <p className="text-slate-400 text-[10px] md:text-xs italic font-serif mt-0.5">This is proudly presented to</p>
                    </div>

                    {/* Student Name */}
                    <div className="space-y-1 my-1">
                      <h3 className="text-lg md:text-3xl font-black text-blue-600 tracking-wider uppercase border-b-2 border-slate-200 pb-1 max-w-xs md:max-w-md mx-auto">
                        {certData.studentName}
                      </h3>
                      <p className="text-slate-500 text-[9px] md:text-xs max-w-xs md:max-w-md mx-auto">
                        for successfully completing and passing all evaluation tasks in the course
                      </p>
                    </div>

                    {/* Course Title */}
                    <div className="space-y-1">
                      <h4 className="text-xs md:text-lg font-black text-slate-900 italic font-serif">
                        "{certData.courseTitle}"
                      </h4>
                      <p className="text-[7px] md:text-[9px] text-slate-400 max-w-xs md:max-w-md mx-auto">
                        A comprehensive training program encompassing theory sessions, hands-on lab exercises, and final assessments.
                      </p>
                    </div>

                    {/* Signatures & Seal */}
                    <div className="flex justify-between items-end w-full px-4 pt-2">
                      <div className="text-left w-1/3">
                        <div className="h-5 flex items-center justify-center font-serif text-slate-800 text-[10px] md:text-xs italic font-bold">
                          {certData.instructorName}
                        </div>
                        <div className="border-t border-slate-200 pt-0.5 text-center">
                          <p className="text-[6px] md:text-[8px] font-bold text-slate-400 uppercase tracking-wider">Instructor</p>
                        </div>
                      </div>

                      {/* Gold seal */}
                      <div className="w-8 h-8 md:w-12 md:h-12 bg-amber-500 rounded-full flex items-center justify-center text-white text-[12px] md:text-lg font-bold shadow-lg border border-amber-600 relative select-none">
                        ★
                        <div className="absolute inset-0.5 rounded-full border border-dashed border-white/50"></div>
                      </div>

                      <div className="w-1/3 text-right">
                        <div className="h-5 flex items-center justify-center font-bold text-slate-700 text-[8px] md:text-[10px]">
                          {new Date(certData.completionDate).toLocaleDateString()}
                        </div>
                        <div className="border-t border-slate-200 pt-0.5 text-center">
                          <p className="text-[6px] md:text-[8px] font-bold text-slate-400 uppercase tracking-wider">Date of Issue</p>
                        </div>
                      </div>
                    </div>

                    {/* Verification details */}
                    <div className="flex justify-between items-center text-[6px] md:text-[8px] text-slate-400 px-2 pt-2 border-t border-slate-100">
                      <span className="font-bold">Code: {certData.certificateCode}</span>
                      <span>Verified Registry Record</span>
                    </div>
                  </div>
                </div>

                {/* Verification Metadata details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Verification Details</h3>

                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
                    <div className="space-y-4">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Recipient</span>
                        <div className="flex items-center gap-2 mt-1">
                          <User size={14} className="text-slate-400" />
                          <span className="font-bold text-slate-800 text-sm">{certData.studentName}</span>
                        </div>
                      </div>

                      <hr className="border-slate-100" />

                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Course Title</span>
                        <div className="flex items-center gap-2 mt-1">
                          <BookOpen size={14} className="text-slate-400" />
                          <span className="font-bold text-slate-800 text-sm leading-tight">{certData.courseTitle}</span>
                        </div>
                      </div>

                      <hr className="border-slate-100" />

                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Authorized By</span>
                        <div className="flex items-center gap-2 mt-1">
                          <User size={14} className="text-slate-400" />
                          <span className="font-bold text-slate-800 text-sm">{certData.instructorName}</span>
                        </div>
                      </div>

                      <hr className="border-slate-100" />

                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Date of Issue</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="font-bold text-slate-800 text-sm">{new Date(certData.completionDate).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <hr className="border-slate-100" />

                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                        <div className="flex items-center gap-2 mt-1.5">
                          <CheckCircle2 size={14} className={certData.valid ? "text-emerald-500" : "text-amber-500"} />
                          <span className={`font-black text-xs uppercase tracking-wider ${certData.valid ? "text-emerald-600" : "text-amber-600"}`}>
                            {certData.status === 'approved' ? 'Active / Verified' : certData.status === 'rejected' ? 'Rejected' : 'Pending Approval'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 bg-white border-t border-slate-200/80">
        <div className="container mx-auto px-6 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          © 2026 StackVerseHub Ecosystem. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};

export default VerifyCertificate;
