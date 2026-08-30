import React, { useState, useEffect } from 'react';
import {
  Plus,
  Video,
  FileText,
  Award,
  PlayCircle,
  Upload,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Info,
  Layers,
  IndianRupee,
  Link as LinkIcon,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  FileBadge,
  Globe,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  createCourseDraft,
  addModule,
  addLesson,
  publishCourse,
  uploadThumbnail,
  uploadVideo,
  getCourseDetails,
  updateCourse,
  updateLesson
} from '../../services/instructorCourseService';
import adminService from '../../services/adminService';

const CreateCourse = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [courseId, setCourseId] = useState(null);
  const [categories, setCategories] = useState([]);

  // Form States
  const [courseData, setCourseData] = useState({
    title: '',
    subtitle: '',
    description: '',
    category: 'Web Development',
    level: 'Beginner',
    language: 'English',
    price: '',
    discountPrice: '',
    thumbnail: '',
  });

  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);


  const [modules, setModules] = useState([
    { title: 'Introduction', lessons: [{ title: 'Welcome to the course', duration: '5:00', isPreviewFree: true }] }
  ]);

  const [settings, setSettings] = useState({
    examRequired: false,
    certificateEligibility: true,
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await adminService.getAllCategories();
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (id) {
      const fetchCourse = async () => {
        try {
          setLoading(true);
          const result = await getCourseDetails(id);
          const course = result.course;
          setCourseId(course._id);
          setCourseData({
            title: course.title,
            subtitle: course.subtitle || '',
            description: course.description || '',
            category: course.category,
            level: course.level,
            language: course.language || 'English',
            price: course.price,
            discountPrice: course.discountPrice || '',
            thumbnail: course.thumbnail,
          });
          setThumbnailPreview(course.thumbnail);
          setModules(course.modules.length > 0 ? course.modules : [
            { title: 'Introduction', lessons: [{ title: 'Welcome to the course', duration: '5:00', isPreviewFree: true }] }
          ]);
          setSettings({
            examRequired: course.examRequired,
            certificateEligibility: course.certificateEligibility,
          });
        } catch (error) {
          console.error("Error fetching course:", error);
          toast.error("Failed to load course details.");
        } finally {
          setLoading(false);
        }
      };
      fetchCourse();
    }
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCourseData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddModule = () => {
    setModules([...modules, { title: `Module ${modules.length + 1}`, lessons: [] }]);
  };

  const handleAddLesson = (moduleIndex) => {
    const newModules = [...modules];
    newModules[moduleIndex].lessons.push({
      title: 'New Lesson',
      duration: '10:00',
      isPreviewFree: false,
      videoUrl: '',
      uploading: false
    });
    setModules(newModules);
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Local preview
    const reader = new FileReader();
    reader.onloadend = () => setThumbnailPreview(reader.result);
    reader.readAsDataURL(file);

    try {
      setUploadingThumbnail(true);
      const result = await uploadThumbnail(file);
      setCourseData(prev => ({ ...prev, thumbnail: result.url }));
      toast.success("Thumbnail uploaded!");
    } catch (error) {
      console.error("Thumbnail upload failed:", error);
      toast.error("Failed to upload thumbnail.");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleVideoUpload = async (moduleIndex, lessonIndex, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadToast = toast.loading("Uploading video...");
    try {
      const newModules = [...modules];
      newModules[moduleIndex].lessons[lessonIndex].uploading = true;
      setModules(newModules);

      const result = await uploadVideo(file, courseId);

      const updatedModules = [...modules];
      updatedModules[moduleIndex].lessons[lessonIndex].videoUrl = result.url;
      updatedModules[moduleIndex].lessons[lessonIndex].uploading = false;
      setModules(updatedModules);

      toast.success("Video uploaded successfully!", { id: uploadToast });
    } catch (error) {
      console.error("Video upload failed:", error);
      toast.error(error.userMessage || error.response?.data?.message || error.message || "Failed to upload video.", { id: uploadToast });

      const resetModules = [...modules];
      resetModules[moduleIndex].lessons[lessonIndex].uploading = false;
      setModules(resetModules);
    }
  };

  const handleNextStep = async () => {
    try {
      setLoading(true);
      if (step === 1) {
        if (!courseData.title.trim()) {
          toast.error("Please enter a course title.");
          return;
        }

        // Create Draft if not already created
        if (!courseId) {
          const payload = {
            ...courseData,
            price: Number(courseData.price) || 0,
            discountPrice: Number(courseData.discountPrice) || 0,
          };
          const result = await createCourseDraft(payload);
          setCourseId(result.course._id);
          toast.success("Course draft created!");
        }
        setStep(2);
      } else if (step === 2) {
        // Save Modules & Lessons
        const loadingToast = toast.loading("Saving content...");
        try {
          for (const mod of modules) {
            let currentModId = mod._id;

            // 1. Create Module if it doesn't exist
            if (!currentModId) {
              const modResult = await addModule(courseId, { title: mod.title });
              currentModId = modResult.module._id;
            }

            // 2. Create or Update Lessons for this module
            for (const lesson of mod.lessons) {
              const lessonPayload = {
                ...lesson,
                resources: lesson.resourceUrl ? [{ name: 'Resource Link', url: lesson.resourceUrl }] : []
              };

              if (!lesson._id) {
                // Create new lesson
                await addLesson(courseId, currentModId, lessonPayload);
              } else {
                // Update existing lesson (to save resources/links)
                await updateLesson(courseId, lesson._id, lessonPayload);
              }
            }
          }
          toast.success("Content saved successfully!", { id: loadingToast });
          setStep(3);
        } catch (err) {
          toast.error("Failed to save content.", { id: loadingToast });
          throw err;
        }
      } else if (step === 3) {
        // Save Pricing
        const savingToast = toast.loading("Saving pricing...");
        try {
          const price = parseFloat(courseData.price) || 0;
          const discountPrice = parseFloat(courseData.discountPrice) || 0;

          await updateCourse(courseId, {
            price: price,
            discountPrice: discountPrice
          });
          toast.success("Pricing saved!", { id: savingToast });
          setStep(4);
        } catch (err) {
          toast.error("Failed to save pricing.", { id: savingToast });
          throw err;
        }
      } else if (step === 4) {
        // Save Settings & Final Publish
        const finalToast = toast.loading("Finalizing course...");
        try {
          await updateCourse(courseId, {
            ...settings
          });
          await publishCourse(courseId);
          toast.success('Congratulations! Your course is now published.', { id: finalToast });
          navigate('/instructor/courses');
        } catch (err) {
          toast.error("Failed to publish course.", { id: finalToast });
          throw err;
        }
      }
    } catch (error) {
      console.error("Error saving step:", error);
      toast.error(error.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: 'Basic Information', icon: <FileText size={18} /> },
    { id: 2, title: 'Course Content', icon: <Layers size={18} /> },
    { id: 3, title: 'Pricing & Offers', icon: <IndianRupee size={18} /> },
    { id: 4, title: 'Settings & Publish', icon: <CheckCircle2 size={18} /> },
  ];

  return (
    <div className="space-y-10 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create New Course</h2>
          <p className="text-slate-500 mt-1 font-medium">Follow the steps to submit your course for admin approval.</p>
        </div>
        <div className="px-5 py-2.5 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-100 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
          <Info size={16} /> {courseId ? 'Course ID: ' + courseId : 'Draft Mode'}
        </div>
      </div>

      {/* Step Progress */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar">
        <div className="flex items-center justify-between min-w-[600px]">
          {steps.map((s, idx) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all ${
                  step >= s.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-400'
                }`}>
                  {step > s.id ? <CheckCircle2 size={20} /> : s.icon}
                </div>
                <div className="text-left">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${
                    step >= s.id ? 'text-blue-600' : 'text-slate-400'
                  }`}>Step {s.id}</p>
                  <p className={`text-sm font-bold truncate ${
                    step >= s.id ? 'text-slate-900' : 'text-slate-400'
                  }`}>{s.title}</p>
                </div>
              </div>
              {idx < steps.length - 1 && <div className="h-0.5 w-12 bg-slate-100 mx-4"></div>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-10">
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-900 uppercase tracking-widest">Course Title</label>
                <input
                  type="text"
                  name="title"
                  value={courseData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Mastering Advanced React Patterns"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-900 uppercase tracking-widest">Description</label>
                <textarea
                  rows="5"
                  name="description"
                  value={courseData.description}
                  onChange={handleInputChange}
                  placeholder="Describe what students will learn..."
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none font-medium text-slate-600"
                ></textarea>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-widest">Category</label>
                  <select
                    name="category"
                    value={courseData.category}
                    onChange={handleInputChange}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-600"
                  >
                    {categories.length > 0 ? (
                      categories.map((cat) => (
                        <option key={cat._id} value={cat.name}>{cat.name}</option>
                      ))
                    ) : (
                      <>
                        <option>Web Development</option>
                        <option>Data Science</option>
                        <option>Mobile App Dev</option>
                        <option>UI/UX Design</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-widest">Level</label>
                  <select
                    name="level"
                    value={courseData.level}
                    onChange={handleInputChange}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-600"
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-black text-slate-900 uppercase tracking-widest">Course Thumbnail</label>
              <div className="relative">
                <input
                  type="file"
                  id="thumbnail-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                />
                <label
                  htmlFor="thumbnail-upload"
                  className={`border-4 border-dashed rounded-[2.5rem] p-12 text-center space-y-4 hover:border-blue-200 transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[300px] overflow-hidden ${
                    uploadingThumbnail ? 'bg-slate-50 border-blue-200' : 'border-slate-100 bg-white'
                  }`}
                >
                  {uploadingThumbnail ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 size={40} className="text-blue-600 animate-spin" />
                      <p className="text-sm font-bold text-slate-600">Uploading to Cloudinary...</p>
                    </div>
                  ) : thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="Thumbnail Preview" className="absolute inset-0 w-full h-full object-cover rounded-[2.2rem]" />
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                        <Upload size={32} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Click to upload or drag and drop</p>
                        <p className="text-xs text-slate-400 mt-1">PNG, JPG or WEBP (Recommended 1200x675)</p>
                      </div>
                    </>
                  )}
                  {thumbnailPreview && !uploadingThumbnail && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white font-bold text-sm bg-blue-600 px-6 py-2 rounded-xl">Change Thumbnail</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Modules & Lessons</h3>
              <button
                onClick={handleAddModule}
                className="flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline"
              >
                <Plus size={18} /> Add Module
              </button>
            </div>

            <div className="space-y-6">
              {modules.map((m, mIdx) => (
                <div key={mIdx} className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 p-6 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-900 shadow-sm">{mIdx + 1}</div>
                      <input
                        type="text"
                        value={m.title}
                        onChange={(e) => {
                          const newMods = [...modules];
                          newMods[mIdx].title = e.target.value;
                          setModules(newMods);
                        }}
                        className="bg-transparent border-none font-bold text-slate-900 focus:ring-0 text-lg"
                      />
                    </div>
                    <button
                      onClick={() => setModules(modules.filter((_, i) => i !== mIdx))}
                      className="p-2 text-slate-400 hover:text-red-500 transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    {m.lessons.map((l, lIdx) => (
                      <div key={lIdx} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 w-6">{mIdx + 1}.{lIdx + 1}</span>
                            <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                              <PlayCircle size={18} />
                            </div>
                          </div>
                          <input
                            type="text"
                            value={l.title}
                            onChange={(e) => {
                              const newMods = [...modules];
                              newMods[mIdx].lessons[lIdx].title = e.target.value;
                              setModules(newMods);
                            }}
                            className="text-sm font-bold text-slate-700 bg-transparent border-none focus:ring-0"
                          />
                        </div>
                        {l.showResourceInput && (
                          <div className="flex-1 mx-4">
                            <input
                              type="text"
                              placeholder="Paste resource link (GitHub, PDF, etc.)"
                              value={l.resourceUrl || ''}
                              onChange={(e) => {
                                const newMods = [...modules];
                                newMods[mIdx].lessons[lIdx].resourceUrl = e.target.value;
                                setModules(newMods);
                              }}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => {
                              const newMods = [...modules];
                              newMods[mIdx].lessons[lIdx].showResourceInput = !newMods[mIdx].lessons[lIdx].showResourceInput;
                              setModules(newMods);
                            }}
                            className={`p-2 rounded-lg transition-all ${
                              l.resourceUrl ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                          >
                            <LinkIcon size={16} />
                          </button>
                          <div className="relative">
                            <input
                              type="file"
                              id={`video-upload-${mIdx}-${lIdx}`}
                              className="hidden"
                              accept="video/*"
                              onChange={(e) => handleVideoUpload(mIdx, lIdx, e)}
                            />
                            <label
                              htmlFor={`video-upload-${mIdx}-${lIdx}`}
                              className={`p-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                                l.videoUrl ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              {l.uploading ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : l.videoUrl ? (
                                <CheckCircle2 size={16} />
                              ) : (
                                <Upload size={16} />
                              )}
                              <span className="text-[10px] font-black uppercase">
                                {l.uploading ? 'Uploading...' : l.videoUrl ? 'Video Ready' : 'Upload Video'}
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddLesson(mIdx)}
                      className="w-full py-3 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-xs font-bold hover:border-blue-200 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Add Lesson to Module {mIdx + 1}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid md:grid-cols-2 gap-10">
               <div className="space-y-4">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-widest">Base Price (â‚¹)</label>
                  <div className="relative">
                    <IndianRupee size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      name="price"
                      value={courseData.price}
                      onChange={handleInputChange}
                      placeholder="2499"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                    />
                  </div>
               </div>
               <div className="space-y-4">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-widest">Introductory Offer (Optional)</label>
                  <div className="relative">
                    <IndianRupee size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      name="discountPrice"
                      value={courseData.discountPrice}
                      onChange={handleInputChange}
                      placeholder="1999"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                    />
                  </div>
               </div>
            </div>

            <div className="p-8 bg-blue-50 rounded-[2rem] border border-blue-100 flex items-start gap-4">
               <Info className="text-blue-600 flex-shrink-0" size={20} />
               <div className="space-y-2">
                  <p className="text-xs font-black text-blue-900 uppercase tracking-widest">Pricing Policy</p>
                  <p className="text-sm text-blue-700 leading-relaxed font-medium">StackVerseHub takes a 20% platform fee on each sale. This fee covers hosting, marketing, and transaction processing. You keep 80% of the revenue.</p>
               </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid md:grid-cols-2 gap-8">
                <div className={`p-8 rounded-[2rem] border transition-all cursor-pointer flex items-center justify-between group ${settings.examRequired ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-white'}`} onClick={() => setSettings({...settings, examRequired: !settings.examRequired})}>
                   <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-2xl ${settings.examRequired ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                         <ShieldCheck size={24} />
                      </div>
                      <div>
                         <p className="font-bold text-slate-900">Exam Required</p>
                         <p className="text-xs text-slate-400 font-medium">Mandatory for certificate</p>
                      </div>
                   </div>
                   {settings.examRequired ? <ToggleRight size={32} className="text-blue-600" /> : <ToggleLeft size={32} className="text-slate-300" />}
                </div>

                <div className={`p-8 rounded-[2rem] border transition-all cursor-pointer flex items-center justify-between group ${settings.certificateEligibility ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-white'}`} onClick={() => setSettings({...settings, certificateEligibility: !settings.certificateEligibility})}>
                   <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-2xl ${settings.certificateEligibility ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                         <FileBadge size={24} />
                      </div>
                      <div>
                         <p className="font-bold text-slate-900">Certificates</p>
                         <p className="text-xs text-slate-400 font-medium">Auto-generate on pass</p>
                      </div>
                   </div>
                   {settings.certificateEligibility ? <ToggleRight size={32} className="text-blue-600" /> : <ToggleLeft size={32} className="text-slate-300" />}
                </div>

                <div className="p-8 rounded-[2rem] border border-slate-100 bg-white flex items-center gap-4 opacity-50">
                   <div className="p-4 rounded-2xl bg-slate-50 text-slate-400">
                      <Globe size={24} />
                   </div>
                   <div>
                      <p className="font-bold text-slate-900">Visibility</p>
                      <p className="text-xs text-slate-400 font-medium">Approved only (Locked)</p>
                   </div>
                </div>
             </div>

             <div className="p-10 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                   <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center text-blue-400 flex-shrink-0">
                      <Info size={40} />
                   </div>
                   <div className="space-y-3 text-center md:text-left">
                      <h4 className="text-xl font-black">Submission Confirmation</h4>
                      <p className="text-slate-400 text-sm font-medium leading-relaxed">By submitting, you agree that your content follows our guidelines. Our team will review your course within 24-48 hours. You will be notified via email.</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="pt-10 border-t border-slate-50 flex items-center justify-between">
          <button
            disabled={step === 1 || loading}
            onClick={() => setStep(step - 1)}
            className={`px-8 py-4 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${
              step === 1 ? 'text-slate-300' : 'text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm'
            }`}
          >
            <ChevronLeft size={18} /> Previous Step
          </button>

          <button
            onClick={handleNextStep}
            disabled={loading}
            className={`px-10 py-4 ${step === 4 ? 'bg-blue-600' : 'bg-slate-900'} text-white rounded-2xl font-bold text-sm hover:opacity-90 shadow-xl shadow-slate-100 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50`}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {step < 4 ? 'Next Step' : 'Submit for Approval'}
                {step < 4 ? <ChevronRight size={18} /> : <CheckCircle2 size={20} />}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCourse;

