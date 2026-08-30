import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { fetchCourseById as fetchCourseThunk } from '../../features/courses/courseThunk';
import { 
  Play, 
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  MessageCircle, 
  ChevronRight, 
  ChevronLeft,
  Settings,
  Clock,
  BookOpen,
  Loader2,
  ClipboardCheck,
  ExternalLink,
  X
} from 'lucide-react';
import { getCourseMissions, submitMission } from '../../services/missionService';
import { getCourseProgress, completeLesson, getVideoProgress, saveVideoProgress } from '../../services/progressService';
import { getVideoPlaybackUrl } from '../../services/courseService';
import { toast } from 'react-hot-toast';

const CoursePlayer = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { selectedCourse, loading } = useSelector((state) => state.courses);
  
  const [expandedModule, setExpandedModule] = useState(0);
  const [currentLessonId, setCurrentLessonId] = useState(null);

  const course = selectedCourse?.details || null;
  const lessons = React.useMemo(() => {
    if (course?.lessons?.length) {
      return course.lessons;
    }

    return course?.modules?.flatMap((module) => module.lessons || []) || [];
  }, [course]);

  const currentLesson = lessons.find((lesson) => lesson._id === currentLessonId) || lessons[0] || null;

  // Group lessons into modules (for now, we'll treat all lessons as one module if not structured)
  const modules = React.useMemo(() => {
    if (course?.modules && course.modules.length > 0) {
      return course.modules;
    }

    return [
      {
        _id: 'default-module',
        id: 'default-module',
        title: 'Course Content',
        duration: course?.duration || 'Unknown',
        lessons: lessons.map((l, idx) => ({
          _id: l._id || idx,
          id: l._id || idx,
          title: l.title,
          duration: l.duration || '00:00',
          status: currentLesson?._id === l._id ? 'current' : 'pending',
          videoUrl: l.videoUrl
        })) || []
      }
    ];
  }, [course, lessons, currentLesson?._id]);

  // Tabs & Missions State
  const [activeTab, setActiveTab] = useState('about'); // 'about' or 'missions'
  const [missions, setMissions] = useState([]);
  const [loadingMissions, setLoadingMissions] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedMissionForSubmit, setSelectedMissionForSubmit] = useState(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [studentNotes, setStudentNotes] = useState('');
  const [submittingMission, setSubmittingMission] = useState(false);

  // Progress State
  const [completedLessons, setCompletedLessons] = useState([]);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [markingComplete, setMarkingComplete] = useState(false);

  // Custom Video Player States & Refs
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoVolume, setVideoVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentLessonWatchPercentage, setCurrentLessonWatchPercentage] = useState(0);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [currentVideoLoading, setCurrentVideoLoading] = useState(false);
  const [currentVideoError, setCurrentVideoError] = useState('');

  const videoRef = React.useRef(null);
  const playerContainerRef = React.useRef(null);
  const bufferingTimerRef = React.useRef(null);

  const clearBufferingIndicator = () => {
    if (bufferingTimerRef.current) {
      clearTimeout(bufferingTimerRef.current);
      bufferingTimerRef.current = null;
    }
    setIsBuffering(false);
  };

  const handleVideoWaiting = () => {
    if (bufferingTimerRef.current) {
      return;
    }

    bufferingTimerRef.current = setTimeout(() => {
      setIsBuffering(true);
      bufferingTimerRef.current = null;
    }, 2000);
  };

  const handleVideoPlaying = () => {
    setIsPlaying(true);
    clearBufferingIndicator();
  };

  useEffect(() => {
    dispatch(fetchCourseThunk(id));
  }, [dispatch, id]);

  useEffect(() => {
    return () => {
      if (bufferingTimerRef.current) {
        clearTimeout(bufferingTimerRef.current);
      }
    };
  }, []);

  const fetchProgress = async () => {
    try {
      const data = await getCourseProgress(id);
      if (data) {
        setCompletedLessons(data.completedLessons || []);
        setProgressPercentage(data.percentage || 0);
      }
    } catch (err) {
      console.error("Error fetching course progress:", err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProgress();
    }
  }, [id]);

  useEffect(() => {
    if (lessons.length > 0 && !currentLessonId) {
      setCurrentLessonId(lessons[0]._id);
    }
    if (course?.modules?.length > 0 && course.modules[0] && expandedModule === 0) {
      setExpandedModule(course.modules[0]._id || course.modules[0].id);
    } else if (expandedModule === 0 && modules.length > 0) {
      setExpandedModule(modules[0].id);
    }
  }, [course, lessons, currentLessonId, expandedModule, modules]);

  const handleMarkComplete = async () => {
    if (!currentLesson?._id) return;
    setMarkingComplete(true);
    try {
      // Optimistic update
      const updatedCompleted = [...completedLessons, currentLesson._id];
      setCompletedLessons(updatedCompleted);
      const total = lessons.length;
      const newPercentage = total > 0 ? Math.round((updatedCompleted.length / total) * 100) : 0;
      setProgressPercentage(newPercentage);

      // Call API
      const result = await completeLesson(id, currentLesson._id);
      if (result) {
        setCompletedLessons(result.completedLessons || updatedCompleted);
        setProgressPercentage(result.percentage ?? newPercentage);
        toast.success("Lesson marked as completed!");
        
        if (result.percentage === 100) {
          toast.success("Congratulations! You completed the course! 🎓");
        }
      }
    } catch (err) {
      console.error("Error completing lesson:", err);
      toast.error("Failed to mark lesson as completed.");
      // Rollback
      fetchProgress();
    } finally {
      setMarkingComplete(false);
    }
  };

  // Fetch video progress when lesson changes
  useEffect(() => {
    const loadVideoProgress = async () => {
      if (!currentLesson?._id) return;
      try {
        const data = await getVideoProgress(currentLesson._id);
        if (data && data.success && data.progress) {
          const progress = data.progress;
          setCurrentLessonWatchPercentage(progress.watchPercentage || 0);
          
          // Once metadata is loaded, seek to last position
          const video = videoRef.current;
          if (video) {
            const handleMetadata = () => {
              if (progress.lastPlaybackPosition) {
                video.currentTime = progress.lastPlaybackPosition;
              }
              video.removeEventListener('loadedmetadata', handleMetadata);
            };
            if (video.readyState >= 1) {
              if (progress.lastPlaybackPosition) {
                video.currentTime = progress.lastPlaybackPosition;
              }
            } else {
              video.addEventListener('loadedmetadata', handleMetadata);
            }
          }
        } else {
          setCurrentLessonWatchPercentage(0);
        }
      } catch (err) {
        console.error("Error loading video progress:", err);
      }
    };
    
    setIsPlaying(false);
    setVideoCurrentTime(0);
    clearBufferingIndicator();
    
    loadVideoProgress();
  }, [currentLessonId, currentLesson?._id]);

  useEffect(() => {
    let isActive = true;

    const loadPlaybackUrl = async () => {
      setCurrentVideoUrl('');
      setCurrentVideoError('');
      setVideoDuration(0);
      setVideoCurrentTime(0);

      if (!currentLesson?.videoUrl) {
        return;
      }

      try {
        setCurrentVideoLoading(true);
        const data = await getVideoPlaybackUrl({
          videoUrl: currentLesson.videoUrl,
          courseId: id,
          lessonId: currentLesson._id,
        });

        if (isActive) {
          setCurrentVideoUrl(data.url || currentLesson.videoUrl);
        }
      } catch (err) {
        console.error("Error loading video playback URL:", err);

        if (isActive) {
          setCurrentVideoError(err.response?.data?.message || "This lesson video could not be loaded.");
        }
      } finally {
        if (isActive) {
          setCurrentVideoLoading(false);
        }
      }
    };

    clearBufferingIndicator();
    setIsPlaying(false);
    loadPlaybackUrl();

    return () => {
      isActive = false;
    };
  }, [currentLesson?._id, currentLesson?.videoUrl, id]);

  const saveProgressToDb = async (forceCompleted = false) => {
    const video = videoRef.current;
    if (!video || !currentLesson?._id) return;

    const currentTime = video.currentTime;
    const duration = video.duration || 0;
    
    if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return;

    const watchPct = forceCompleted ? 100 : Math.min(100, Math.round((currentTime / duration) * 100));
    
    if (watchPct > currentLessonWatchPercentage || forceCompleted) {
      setCurrentLessonWatchPercentage(Math.max(watchPct, currentLessonWatchPercentage));
    }

    try {
      await saveVideoProgress({
        courseId: id,
        lessonId: currentLesson._id,
        watchedSeconds: Math.round(currentTime),
        duration: Math.round(duration),
        watchPercentage: Math.max(watchPct, currentLessonWatchPercentage),
        lastPlaybackPosition: Math.round(currentTime),
      });
    } catch (err) {
      console.error("Error saving video progress:", err);
    }
  };

  // Auto save progress on interval
  useEffect(() => {
    let interval;
    if (isPlaying && currentLesson?._id) {
      interval = setInterval(() => {
        saveProgressToDb();
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentLesson?._id, currentLessonWatchPercentage]);

  // Save progress on window blur or unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveProgressToDb();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentLesson?._id, currentLessonWatchPercentage]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !currentVideoUrl || currentVideoError) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      saveProgressToDb();
    } else {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error("Error playing video:", err);
        setCurrentVideoError("This video format or source is not supported by the browser.");
      });
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    saveProgressToDb();
  };

  const handleEnded = () => {
    setIsPlaying(false);
    saveProgressToDb(true); // Force 100% watch progress on end
    
    // Auto-advance logic to naturally shift currentLessonId to the next lesson once finished.
    if (lessons.length > 0) {
      const idx = lessons.findIndex(l => l._id === currentLesson?._id);
      if (idx !== -1 && idx < lessons.length - 1) {
        const nextLesson = lessons[idx + 1];
        setCurrentLessonId(nextLesson._id);
        toast.success("Auto-advancing to next lesson...");
      }
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVideoVolume(newVolume);
    const video = videoRef.current;
    if (video) {
      video.volume = newVolume;
      video.muted = newVolume === 0;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      video.volume = videoVolume || 0.8;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    const video = videoRef.current;
    if (video) {
      video.playbackRate = speed;
    }
  };

  const seekRelative = (seconds) => {
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration) && Number.isFinite(video.currentTime)) {
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    }
  };

  const handleTimelineChange = (e) => {
    const seekPct = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
      const newTime = (seekPct / 100) * video.duration;
      video.currentTime = newTime;
      setVideoCurrentTime(newTime);
    }
  };

  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => console.error("Error entering fullscreen:", err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => console.error("Error exiting fullscreen:", err));
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const formatVideoTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds === null) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const fetchMissionsData = async () => {
    try {
      setLoadingMissions(true);
      const data = await getCourseMissions(id);
      setMissions(data || []);
    } catch (err) {
      console.error("Error fetching course missions:", err);
    } finally {
      setLoadingMissions(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMissionsData();
    }
  }, [id]);

  const handleMissionSubmit = async (e) => {
    e.preventDefault();
    if (!submissionUrl.trim()) return toast.error("Please enter a submission repository link.");
    
    const isGithub = submissionUrl.toLowerCase().includes("github.com/");
    if (!isGithub) {
      return toast.error("Please submit a valid GitHub Repository link (github.com/username/repo).");
    }

    try {
      setSubmittingMission(true);
      await submitMission(selectedMissionForSubmit._id, {
        submissionUrl: submissionUrl.trim(),
        studentNotes: studentNotes.trim()
      });
      toast.success("Mission submitted successfully!");
      setShowSubmitModal(false);
      setSubmissionUrl('');
      setStudentNotes('');
      fetchMissionsData();
    } catch (error) {
      console.error("Error submitting mission:", error);
      toast.error("Failed to submit mission.");
    } finally {
      setSubmittingMission(false);
    }
  };

  if (loading && !course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 bg-white rounded-[2.5rem]">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading your classroom...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col lg:flex-row bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
      {/* Video Area */}
      <div className="flex-1 min-w-0 flex flex-col bg-slate-900">
        {/* Video Player Container */}
        <div ref={playerContainerRef} className="w-full aspect-video lg:max-h-[52vh] relative group bg-black flex items-center justify-center shrink-0 overflow-hidden shadow-2xl">
          {currentVideoLoading ? (
            <div className="text-center p-8">
              <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-spin" />
              <p className="text-slate-300 font-bold">Loading lesson video...</p>
            </div>
          ) : currentVideoError ? (
            <div className="text-center p-8">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-slate-300 font-bold">{currentVideoError}</p>
            </div>
          ) : currentVideoUrl ? (
            <>
              <video
                key={currentLesson._id}
                ref={videoRef}
                src={currentVideoUrl}
                autoPlay
                onClick={togglePlay}
                onTimeUpdate={() => {
                  const currentTime = videoRef.current?.currentTime || 0;
                  setVideoCurrentTime(Number.isFinite(currentTime) ? currentTime : 0);
                }}
                onDurationChange={() => {
                  const duration = videoRef.current?.duration || 0;
                  setVideoDuration(Number.isFinite(duration) ? duration : 0);
                }}
                onError={() => {
                  setIsPlaying(false);
                  setCurrentVideoError("This video could not be played. It may still be processing or the format is unsupported.");
                }}
                onWaiting={handleVideoWaiting}
                onStalled={handleVideoWaiting}
                onPlaying={handleVideoPlaying}
                onCanPlay={clearBufferingIndicator}
                onPause={handlePause}
                onEnded={handleEnded}
                className="w-full h-full object-contain cursor-pointer"
              >
                Your browser does not support the video tag.
              </video>
              
              {/* Buffering Indicator */}
              {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                </div>
              )}

              {/* Controls overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 p-5 flex flex-col justify-between select-none pointer-events-none">
                {/* Top Control Bar */}
                <div className="flex justify-between items-center pointer-events-auto">
                  <h2 className="text-white font-black drop-shadow text-sm leading-none">{currentLesson?.title || 'Select a lesson'}</h2>
                  <span className="bg-blue-600/80 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-blue-500/30">
                    Now Playing
                  </span>
                </div>

                {/* Bottom Control Panel */}
                <div className="space-y-4 pointer-events-auto">
                  {/* Timeline slider */}
                  <div className="w-full flex items-center gap-3">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={videoDuration > 0 ? (videoCurrentTime / videoDuration) * 100 : 0} 
                      onChange={handleTimelineChange}
                      className="w-full accent-blue-500 bg-white/20 h-1.5 rounded-lg cursor-pointer hover:h-2 transition-all appearance-none outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap justify-between items-center gap-4 text-white">
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Play/Pause */}
                      <button onClick={togglePlay} className="hover:text-blue-400 transition-colors">
                        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                      </button>

                      {/* Seek 10s back */}
                      <button onClick={() => seekRelative(-10)} className="hover:text-blue-400 transition-colors" title="Rewind 10s">
                        <RotateCcw size={18} />
                      </button>

                      {/* Seek 10s forward */}
                      <button onClick={() => seekRelative(10)} className="hover:text-blue-400 transition-colors" title="Forward 10s">
                        <RotateCw size={18} />
                      </button>

                      {/* Volume Controls */}
                      <div className="flex items-center gap-2 group/volume">
                        <button onClick={toggleMute} className="hover:text-blue-400 transition-colors">
                          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.05"
                          value={isMuted ? 0 : videoVolume} 
                          onChange={handleVolumeChange}
                          className="w-16 accent-blue-500 bg-white/25 h-1 rounded-lg cursor-pointer outline-none appearance-none group-hover/volume:w-20 transition-all duration-300"
                        />
                      </div>

                      {/* Duration display */}
                      <span className="text-xs font-mono select-none">
                        {formatVideoTime(videoCurrentTime)} / {formatVideoTime(videoDuration)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Speed selector */}
                      <div className="relative group/speed cursor-pointer flex items-center gap-1.5">
                        <Settings size={18} className="hover:rotate-45 transition-transform duration-300" />
                        <select 
                          value={playbackSpeed}
                          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                          className="bg-black/80 text-white text-[11px] font-bold py-1 px-2 border border-white/20 rounded cursor-pointer outline-none hover:bg-black/90 transition-colors"
                        >
                          <option value="0.5">0.5x Speed</option>
                          <option value="1.0">1.0x Normal</option>
                          <option value="1.25">1.25x Speed</option>
                          <option value="1.5">1.5x Speed</option>
                          <option value="2.0">2.0x Speed</option>
                        </select>
                      </div>

                      {/* Fullscreen toggle */}
                      <button onClick={toggleFullscreen} className="hover:text-blue-400 transition-colors">
                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <img 
                src={course?.thumbnail || "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1200&q=80"} 
                className="w-full h-full object-cover opacity-40" 
                alt="Video Placeholder" 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-2xl animate-pulse cursor-pointer">
                  <Play size={40} fill="currentColor" className="ml-1" />
                </div>
              </div>
              <div className="absolute bottom-10 left-10 text-white z-20">
                <p className="text-sm font-bold opacity-80 uppercase tracking-widest">No video available</p>
                <h3 className="text-2xl font-black">{currentLesson?.title}</h3>
              </div>
            </>
          )}
        </div>

        {/* Scrollable details and tabs area */}
        <div className="bg-white flex flex-col min-h-[360px]">
          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-100 px-5 sm:px-8 pt-4 shrink-0 bg-slate-50/50 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('about')}
              className={`pb-4 px-4 font-bold text-sm border-b-2 transition-all ${
                activeTab === 'about' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              About Lesson
            </button>
            <button 
              onClick={() => setActiveTab('missions')}
              className={`pb-4 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'missions' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Missions
              {missions.length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {missions.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-5 sm:p-8 overflow-visible">
            {activeTab === 'about' ? (
              <div className="space-y-6">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-2xl font-bold text-slate-900">{currentLesson?.title}</h1>
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100">Now Playing</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-500">
                      <span className="flex items-center gap-1.5"><Clock size={16} /> {currentLesson?.duration} Duration</span>
                      <span className="flex items-center gap-1.5"><BookOpen size={16} /> {course?.title}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {completedLessons.includes(currentLesson?._id) ? (
                      <span className="px-5 py-3 bg-green-50 border border-green-200 text-green-700 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-sm">
                        <CheckCircle2 size={18} className="text-green-600" /> Completed
                      </span>
                    ) : (
                      <div className="flex flex-col items-start sm:items-center gap-1">
                        <button 
                          onClick={handleMarkComplete}
                          disabled={markingComplete || currentLessonWatchPercentage < 80}
                          className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 active:scale-95 shadow-lg ${
                            currentLessonWatchPercentage >= 80 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100' 
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                          }`}
                        >
                          {markingComplete ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 size={18} />} Mark as Complete
                        </button>
                        {currentLessonWatchPercentage < 80 && (
                          <span className="text-[10px] text-amber-600 font-extrabold tracking-wide uppercase px-1">
                            Watch {Math.round(currentLessonWatchPercentage)}% / 80% to Unlock
                          </span>
                        )}
                      </div>
                    )}
                    <button 
                      onClick={() => {
                        const idx = lessons.findIndex(l => l._id === currentLesson?._id);
                        if (idx > 0) setCurrentLessonId(lessons[idx - 1]._id);
                      }}
                      disabled={!lessons.length || lessons.indexOf(currentLesson) === 0}
                      className="px-6 py-3 bg-slate-50 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-100 disabled:opacity-50 transition-all flex items-center gap-2 border border-slate-100 whitespace-nowrap"
                    >
                      <ChevronLeft size={18} /> Previous
                    </button>
                    <button 
                      onClick={() => {
                        const idx = lessons.findIndex(l => l._id === currentLesson?._id);
                        if (idx < lessons.length - 1) setCurrentLessonId(lessons[idx + 1]._id);
                      }}
                      disabled={!lessons.length || lessons.indexOf(currentLesson) === lessons.length - 1}
                      className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-100 flex items-center gap-2 whitespace-nowrap"
                    >
                      Next Lesson <ChevronRight size={18} />
                    </button>
                  </div>
                </div>

                <div className="prose max-w-none text-slate-600 mt-6 leading-relaxed">
                  <p className="font-medium text-sm">
                    {currentLesson?.description || "No description provided for this lesson."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">Course Missions & Tasks</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Complete missions to unlock course points</p>
                </div>

                {loadingMissions ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading missions...</p>
                  </div>
                ) : missions.length === 0 ? (
                  <div className="py-16 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                    <ClipboardCheck size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-bold">No missions assigned for this course yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {missions.map((mission) => {
                      const submission = mission.submission;
                      const hasSubmitted = !!submission;
                      
                      return (
                        <div key={mission._id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                                {mission.points} Points
                              </span>
                              {hasSubmitted ? (
                                <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                                  submission.status === 'completed' ? 'bg-green-50 text-green-600 border-green-100' :
                                  submission.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                  'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                  Status: {submission.status}
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                  Not Submitted
                                </span>
                              )}
                            </div>
                            <h4 className="text-lg font-bold text-slate-900">{mission.title}</h4>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">{mission.description}</p>
                            
                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">
                              <span>Due: {new Date(mission.deadline).toLocaleDateString()}</span>
                            </div>

                            {hasSubmitted && submission.feedback && (
                              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs flex gap-2 text-slate-600 font-medium mt-3">
                                <MessageCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Instructor Feedback</span>
                                  {submission.feedback}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 self-end md:self-auto">
                            {(!hasSubmitted || submission.status === 'rejected') ? (
                              <button 
                                onClick={() => {
                                  setSelectedMissionForSubmit(mission);
                                  setSubmissionUrl(submission?.submissionUrl || '');
                                  setStudentNotes(submission?.studentNotes || '');
                                  setShowSubmitModal(true);
                                }}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-100 active:scale-95 transition-all"
                              >
                                {hasSubmitted ? 'Re-submit Task' : 'Submit Mission'}
                              </button>
                            ) : (
                              <a 
                                href={submission.submissionUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                              >
                                <ExternalLink size={14} /> View Submission
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar - Lesson List */}
      <aside className="w-full lg:w-96 lg:shrink-0 border-l border-slate-100 flex flex-col bg-slate-50/30 overflow-hidden">
        <div className="p-6 bg-white border-b border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900">Course Content</h3>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{progressPercentage}% Done</span>
          </div>
          <div className="space-y-2">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${progressPercentage}%` }}></div>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Progress</span>
              <span>{completedLessons.length}/{lessons.length} Lessons</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {modules.map((module) => (
            <div key={module.id || module._id} className="bg-white">
              <button 
                onClick={() => setExpandedModule(expandedModule === (module.id || module._id) ? null : (module.id || module._id))}
                className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-all"
              >
                <div className="text-left">
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">{module.title}</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">{module.duration} • {module.lessons?.length || 0} Lessons</p>
                </div>
                {expandedModule === (module.id || module._id) ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </button>

              {expandedModule === (module.id || module._id) && (
                <div className="bg-slate-50/50">
                  {module.lessons?.map((lesson) => (
                    <div 
                      key={lesson.id || lesson._id} 
                      onClick={() => {
                        const target = lessons.find(l => l._id === (lesson.id || lesson._id));
                        if (target) setCurrentLessonId(target._id);
                      }}
                      className={`p-4 pl-12 flex items-center gap-4 cursor-pointer hover:bg-blue-50/50 transition-all relative ${
                        currentLesson?._id === (lesson.id || lesson._id) ? 'bg-blue-50 border-r-4 border-blue-600 font-bold' : ''
                      } ${completedLessons.includes(lesson.id || lesson._id) ? 'bg-green-50/20' : ''}`}
                    >
                      {completedLessons.includes(lesson.id || lesson._id) ? (
                        <CheckCircle2 size={18} className="text-green-500 fill-green-50 shrink-0" />
                      ) : currentLesson?._id === (lesson.id || lesson._id) ? (
                        <Play size={18} className="text-blue-600 fill-blue-600 shrink-0 animate-pulse" />
                      ) : (
                        <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300 shrink-0"></div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs truncate ${
                          completedLessons.includes(lesson.id || lesson._id) ? 'text-slate-400 line-through font-medium' :
                          currentLesson?._id === (lesson.id || lesson._id) ? 'text-blue-600 font-black' : 'text-slate-700 font-bold'
                        }`}>
                          {lesson.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Clock size={10} /> {lesson.duration}
                          </span>
                          {completedLessons.includes(lesson.id || lesson._id) && (
                            <span className="bg-green-100 text-green-700 font-black text-[8px] px-1.5 py-0.2 rounded uppercase tracking-wider scale-90 origin-left">Completed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Support Section */}
        <div className="p-6 bg-white border-t border-slate-100">
          <button className="w-full py-4 bg-slate-50 text-slate-700 rounded-2xl font-bold text-xs hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 border border-slate-100">
            <MessageCircle size={16} />
            Discuss with Instructor
          </button>
        </div>
      </aside>

      {/* MISSION SUBMISSION MODAL */}
      {showSubmitModal && selectedMissionForSubmit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-900">Submit Mission Solution</h3>
              <button 
                onClick={() => setShowSubmitModal(false)} 
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleMissionSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">GitHub Repository Link</label>
                <input 
                  type="url" 
                  placeholder="https://github.com/username/repo-name"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Notes / Pre-requisites (Optional)</label>
                <textarea 
                  rows="4"
                  placeholder="Summarize instructions to run the project, or design decisions..."
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowSubmitModal(false)}
                  className="w-1/2 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingMission}
                  className="w-1/2 py-3 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  {submittingMission ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Mission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursePlayer;
