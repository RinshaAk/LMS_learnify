import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  GraduationCap,
  Briefcase,
  BookOpen,
  Phone,
  MapPin,
  Save,
  Loader2,
  LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../features/axiosInstance';
import { logout, fetchProfile } from '../../features/auth/authSlice';
import { toast } from 'react-hot-toast';

const InstructorVerification = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error, success } = useSelector((state) => state.auth);

  const [certLoading, setCertLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    education: '',
    college: '',
    degree: '',
    graduationYear: '',
    experience: '',
    expertise: '',
    certifications: '',
    bio: '',
    phone: '',
    location: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        age: user.verificationDetails?.age || '',
        education: user.verificationDetails?.education || '',
        college: user.verificationDetails?.college || '',
        degree: user.verificationDetails?.degree || '',
        graduationYear: user.verificationDetails?.graduationYear || '',
        experience: user.verificationDetails?.experience || '',
        expertise: user.verificationDetails?.expertise || '',
        certifications: user.verificationDetails?.certifications?.join(', ') || '',
        bio: user.bio || '',
        phone: user.phone || '',
        location: user.location || '',
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCertUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setCertLoading(true);
      const data = new FormData();
      data.append('resource', file);
      const response = await axiosInstance.post('/uploads/resource', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data?.url) {
        const newCerts = formData.certifications ? formData.certifications + ', ' + response.data.url : response.data.url;
        setFormData(prev => ({ ...prev, certifications: newCerts }));
        toast.success("Certificate uploaded successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload certificate");
    } finally {
      setCertLoading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      certifications: formData.certifications.split(',').map(s => s.trim()).filter(s => s),
    };

    try {
      // Use the dedicated verification endpoint
      await axiosInstance.post('/instructor/verify', data);
      dispatch(fetchProfile()); // Refresh user data to get approvalStatus: pending
      navigate('/instructor/pending');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-xl">
              <ShieldCheck className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Instructor Details / Qualification</h1>
              <p className="text-slate-500 font-medium">Verify your expertise to start teaching on StackVerseHub</p>
            </div>
          </div>
          <button
            onClick={() => dispatch(logout())}
            className="flex items-center gap-2 text-slate-500 hover:text-red-500 font-bold transition-all px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-slate-200 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Section 1: Professional Info */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                   <User size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Personal & Academic Details</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Your full legal name"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Highest Qualification</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      name="education"
                      value={formData.education}
                      onChange={handleInputChange}
                      placeholder="e.g. Master's Degree"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">College / University Name</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      name="college"
                      value={formData.college}
                      onChange={handleInputChange}
                      placeholder="Name of your institution"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Degree / Course</label>
                        <input
                            type="text"
                            name="degree"
                            value={formData.degree}
                            onChange={handleInputChange}
                            placeholder="e.g. B.Tech"
                            className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Graduation Year</label>
                        <input
                            type="text"
                            name="graduationYear"
                            value={formData.graduationYear}
                            onChange={handleInputChange}
                            placeholder="e.g. 2022"
                            className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            required
                        />
                    </div>
                </div>
              </div>
            </div>

            {/* Section 2: Professional Info */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                  <Briefcase size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Teaching Experience</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Subjects You Can Teach</label>
                  <div className="relative">
                    <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      name="expertise"
                      value={formData.expertise}
                      onChange={handleInputChange}
                      placeholder="e.g. Web Development, AI, Math"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Years of Teaching Experience</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      name="experience"
                      value={formData.experience}
                      onChange={handleInputChange}
                      placeholder="e.g. 5+ years"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Certificates or Achievements</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="file"
                      onChange={handleCertUpload}
                      disabled={certLoading}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {certLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-600" size={18} />}
                  </div>
                  {formData.certifications && (
                    <p className="text-xs text-green-600 font-medium ml-1">
                      Uploaded files: {formData.certifications.split(',').length}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Contact & Background */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                   <Phone size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Contact & About</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9+]/g, '');
                        setFormData(prev => ({ ...prev, phone: val }));
                      }}
                      placeholder="+1 234 567 890"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Place / Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z\s,]/g, '');
                        setFormData(prev => ({ ...prev, location: val }));
                      }}
                      placeholder="City, Country"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Short Bio / About Yourself</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Tell us about your background and teaching style..."
                    className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-blue-500 h-40 transition-all resize-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-bold text-lg shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:bg-blue-400"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                Submit Details for Approval
              </button>
              {success && (
                <p className="text-center text-green-600 font-bold mt-4 animate-bounce">Submitted Successfully!</p>
              )}
              {error && (
                <p className="text-center text-red-600 font-bold mt-4">{error}</p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InstructorVerification;
