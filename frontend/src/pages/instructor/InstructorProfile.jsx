import React, { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  Award, 
  ShieldCheck, 
  Edit3, 
  Briefcase,
  Star,
  Users,
  BookOpen,
  Camera,
  Clock,
  MapPin,
  Image as ImageIcon,
  Loader2,
  X
} from 'lucide-react';
import { FaTwitter, FaLinkedin, FaGithub, FaGlobe } from 'react-icons/fa';
import { updateProfile } from '../../features/auth/authSlice';
import { uploadUserAvatar } from '../../services/userService';
import { toast } from 'react-hot-toast';

const InstructorProfile = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    location: '',
    bio: '',
    education: '',
    expertise: '',
    experience: '',
    website: '',
    linkedin: '',
    twitter: '',
    github: '',
  });
  const { user } = useSelector((state) => state.auth);
  const { dashboardData } = useSelector((state) => state.instructor);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB.");
      return;
    }

    try {
      setAvatarLoading(true);
      const res = await uploadUserAvatar(file);
      if (res && res.url) {
        await dispatch(updateProfile({ profileImage: res.url })).unwrap();
        toast.success("Profile picture updated successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update profile picture");
    } finally {
      setAvatarLoading(false);
    }
  };

  const openEditModal = () => {
    setEditForm({
      name: user?.name || '',
      phone: user?.phone || '',
      location: user?.location || '',
      bio: user?.bio || '',
      education: user?.verificationDetails?.education || '',
      expertise: user?.verificationDetails?.expertise || '',
      experience: user?.verificationDetails?.experience || '',
      website: user?.socialLinks?.website || '',
      linkedin: user?.socialLinks?.linkedin || '',
      twitter: user?.socialLinks?.twitter || '',
      github: user?.socialLinks?.github || '',
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();

    if (!editForm.name.trim()) {
      toast.error("Name is required.");
      return;
    }

    try {
      setSavingProfile(true);
      await dispatch(updateProfile({
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        location: editForm.location.trim(),
        bio: editForm.bio.trim(),
        verificationDetails: {
          ...(user?.verificationDetails || {}),
          education: editForm.education.trim(),
          expertise: editForm.expertise.trim(),
          experience: editForm.experience.trim(),
        },
        socialLinks: {
          website: editForm.website.trim(),
          linkedin: editForm.linkedin.trim(),
          twitter: editForm.twitter.trim(),
          github: editForm.github.trim(),
        },
      })).unwrap();
      setShowEditModal(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(typeof err === 'string' ? err : err?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };
  
  const profile = {
    name: user?.name || 'Instructor',
    email: user?.email || '',
    phone: user?.phone || 'Not provided',
    role: user?.verificationDetails?.expertise || 'Expert Instructor',
    bio: user?.bio || "No biography provided yet.",
    qualifications: user?.verificationDetails?.education ? [user.verificationDetails.education] : ['Not specified'],
    skills: user?.verificationDetails?.expertise ? user.verificationDetails.expertise.split(',') : ['Teaching'],
    experience: user?.verificationDetails?.experience || 'Not specified',
    avatar: user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'I')}&background=random&size=200`,
    isVerified: user?.approvalStatus === 'approved',
    location: user?.location || 'Not set',
    rating: dashboardData?.averageRating?.toFixed(1) || '0.0',
    students: dashboardData?.totalStudents || 0,
    courses: dashboardData?.totalCourses || 0,
    socialLinks: user?.socialLinks || {}
  };

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
      <div className="flex flex-col xl:flex-row gap-10">
        {/* Left Column - Main Info */}
        <div className="flex-1 space-y-10">
          {/* Cover & Avatar Section */}
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden relative transition-all duration-300 hover:shadow-md">
            <div className="h-48 md:h-64 relative group bg-slate-800">
              {profile.coverImage ? (
                <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover opacity-80" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-800">
                   <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                </div>
              )}
              <button className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:bg-black/70 flex items-center gap-2 text-sm font-medium">
                <ImageIcon size={16} /> Edit Cover
              </button>
            </div>
            
            <div className="px-6 sm:px-10 pb-12 flex flex-col md:flex-row items-center md:items-end gap-6 sm:gap-8 -mt-20 md:-mt-16 relative z-10 text-center md:text-left">
              <div className="relative group w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] flex-shrink-0">
                {avatarLoading ? (
                  <div className="w-full h-full rounded-[2.5rem] border-8 border-white shadow-2xl bg-slate-50 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                  </div>
                ) : user?.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt={profile.name} 
                    className="w-full h-full rounded-[2.5rem] border-8 border-white shadow-2xl object-cover bg-white" 
                  />
                ) : (
                  <div className="w-full h-full rounded-[2.5rem] border-8 border-white shadow-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <User size={48} />
                  </div>
                )}
                <button 
                  onClick={handleAvatarClick}
                  disabled={avatarLoading}
                  className="absolute bottom-2 right-2 p-3 bg-slate-900 text-white rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-600 disabled:cursor-not-allowed"
                >
                  <Camera size={20} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*" 
                />
              </div>
              
              <div className="flex-1 pb-2 md:pb-4 space-y-3 w-full">
                <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{profile.name}</h2>
                  {profile.isVerified && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 w-max mx-auto md:mx-0">
                      <ShieldCheck size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Verified Expert</span>
                    </div>
                  )}
                </div>
                <p className="text-slate-500 font-bold text-base md:text-lg">{profile.role}</p>
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 sm:gap-6 pt-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <Star className="text-yellow-400 fill-yellow-400" size={16} /> {profile.rating} Rating
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <Users className="text-blue-500" size={16} /> {profile.students} Students
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <BookOpen className="text-purple-500" size={16} /> {profile.courses} Courses
                  </div>
                </div>
              </div>
              
              <button
                type="button"
                onClick={openEditModal}
                className="w-full md:w-auto mb-2 md:mb-4 px-6 md:px-8 py-3 md:py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-blue-600 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-slate-100 whitespace-nowrap"
              >
                <Edit3 size={18} />
                Edit Profile
              </button>
            </div>
          </div>

          {/* About Section */}
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                <User size={20} className="text-blue-600" />
                About Me
              </h3>
            </div>
            <p className="text-slate-600 leading-relaxed text-base sm:text-lg italic whitespace-pre-line">"{profile.bio}"</p>
          </div>

          {/* Qualifications & Expertise */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
            <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-black text-slate-900 pb-4 border-b border-slate-50 uppercase tracking-widest flex items-center gap-3">
                <GraduationCap size={20} className="text-purple-600" />
                Academic Background
              </h3>
              <ul className="space-y-4">
                {profile.qualifications.map((q, i) => (
                  <li key={i} className="flex items-start gap-4 text-slate-600 font-bold text-sm group">
                    <div className="w-2 h-2 rounded-full bg-purple-200 group-hover:bg-purple-600 transition-colors mt-1.5 shrink-0"></div>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-black text-slate-900 pb-4 border-b border-slate-50 uppercase tracking-widest flex items-center gap-3">
                <Award size={20} className="text-green-600" />
                Key Expertise
              </h3>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {profile.skills.map((skill, i) => (
                  <span key={i} className="px-4 py-2 bg-green-50 text-green-700 text-[10px] sm:text-xs font-black rounded-xl border border-green-100 uppercase tracking-widest">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Stats & Links */}
        <div className="xl:w-96 space-y-8 sm:space-y-10">
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 sm:space-y-10 hover:shadow-md transition-shadow">
            <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm flex items-center gap-3">
              <Briefcase size={18} className="text-blue-600" />
              Professional Info
            </h3>
            
            <div className="space-y-6 sm:space-y-8">
              <div className="flex gap-4 sm:gap-5">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <Mail size={22} />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                  <p className="font-bold text-slate-900 truncate">{profile.email}</p>
                </div>
              </div>
              <div className="flex gap-4 sm:gap-5">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <Phone size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</p>
                  <p className="font-bold text-slate-900">{profile.phone}</p>
                </div>
              </div>
              <div className="flex gap-4 sm:gap-5">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <MapPin size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</p>
                  <p className="font-bold text-slate-900">{profile.location}</p>
                </div>
              </div>
              <div className="flex gap-4 sm:gap-5">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <Clock size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Experience</p>
                  <p className="font-bold text-slate-900">{profile.experience}</p>
                </div>
              </div>
            </div>

            <div className="pt-8 sm:pt-10 border-t border-slate-50 space-y-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sm:text-left">Connect with me</p>
              <div className="flex gap-3 sm:gap-4 justify-center sm:justify-start flex-wrap">
                <a href={profile.socialLinks?.website || '#'} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 transition-all hover:text-blue-600 border border-transparent hover:border-slate-200 hover:bg-white hover:shadow-lg shadow-slate-100">
                  <FaGlobe size={20} />
                </a>
                <a href={profile.socialLinks?.linkedin || '#'} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 transition-all hover:text-blue-700 border border-transparent hover:border-slate-200 hover:bg-white hover:shadow-lg shadow-slate-100">
                  <FaLinkedin size={20} />
                </a>
                <a href={profile.socialLinks?.twitter || '#'} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 transition-all hover:text-sky-500 border border-transparent hover:border-slate-200 hover:bg-white hover:shadow-lg shadow-slate-100">
                  <FaTwitter size={20} />
                </a>
                <a href={profile.socialLinks?.github || '#'} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 transition-all hover:text-slate-900 border border-transparent hover:border-slate-200 hover:bg-white hover:shadow-lg shadow-slate-100">
                  <FaGithub size={20} />
                </a>
              </div>
            </div>
          </div>

          {/* Verification Badge */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 text-white relative overflow-hidden hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600 rounded-full -ml-32 -mt-32 opacity-30 blur-3xl"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-blue-600/20 border border-blue-500/30 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-900/50 backdrop-blur-sm">
                <ShieldCheck size={40} className="text-blue-400" />
              </div>
              <div>
                <h4 className="text-xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Trusted Educator</h4>
                <p className="text-slate-400 text-xs mt-3 leading-relaxed">This badge is awarded to instructors who maintain a high rating and complete required teaching hours.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm md:p-8">
          <form
            onSubmit={handleProfileSave}
            className="w-full max-w-3xl rounded-[2rem] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">Edit Profile</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">Update the information shown on your instructor profile.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-2xl p-3 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Name</span>
                <input name="name" value={editForm.name} onChange={handleEditChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Phone</span>
                <input name="phone" value={editForm.phone} onChange={handleEditChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Location</span>
                <input name="location" value={editForm.location} onChange={handleEditChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Experience</span>
                <input name="experience" value={editForm.experience} onChange={handleEditChange} placeholder="3 years" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Education</span>
                <input name="education" value={editForm.education} onChange={handleEditChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Expertise</span>
                <input name="expertise" value={editForm.expertise} onChange={handleEditChange} placeholder="React, Node.js, UI/UX" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Biography</span>
                <textarea name="bio" value={editForm.bio} onChange={handleEditChange} rows="4" className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Website</span>
                <input name="website" value={editForm.website} onChange={handleEditChange} placeholder="https://example.com" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">LinkedIn</span>
                <input name="linkedin" value={editForm.linkedin} onChange={handleEditChange} placeholder="https://linkedin.com/in/..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Twitter/X</span>
                <input name="twitter" value={editForm.twitter} onChange={handleEditChange} placeholder="https://x.com/..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">GitHub</span>
                <input name="github" value={editForm.github} onChange={handleEditChange} placeholder="https://github.com/..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProfile && <Loader2 size={16} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default InstructorProfile;
