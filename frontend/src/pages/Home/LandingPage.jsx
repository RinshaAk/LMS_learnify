import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  User, 
  Users,
  Award, 
  PlayCircle, 
  Star, 
  ChevronRight, 
  CheckCircle2, 
  ArrowRight,
  Menu,
  X,
  Laptop,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllCourses } from '../../features/courses/courseThunk';
import { logout } from '../../features/auth/authSlice';
import heroImage from '../../assets/hero.png';

const MotionDiv = motion.div;

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state) => state.auth);
  const { courses: allCourses, loading: loadingCourses } = useSelector((state) => state.courses);

  const featuredCourses = allCourses?.slice(0, 3) || [];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    dispatch(fetchAllCourses({ limit: 3, status: 'published' }));
  }, [dispatch]);

  const handleEnrollClick = (courseId) => {
    if (currentUser && currentUser.role === 'student') {
      navigate(`/student/course-details/${courseId}`);
    } else {
      navigate('/login');
    }
  };

  const stats = [
    { label: 'Active Learners', value: '25,000+', icon: <Users className="w-5 h-5 text-primary-600" /> },
    { label: 'Expert Courses', value: '850+', icon: <BookOpen className="w-5 h-5 text-primary-600" /> },
    { label: 'Certified Mentors', value: '120+', icon: <Award className="w-5 h-5 text-primary-600" /> },
    { label: 'Live Sessions', value: '300+', icon: <PlayCircle className="w-5 h-5 text-primary-600" /> },
  ];

  const features = [
    {
      title: 'Live Mentor Sessions',
      description: 'Learn directly from industry experts through scheduled live classes and interactive review sessions.',
      icon: <Users className="w-6 h-6 text-primary-600" />
    },
    {
      title: 'Career Ready Path',
      description: 'Build production-grade skills with structured modules, real-world projects, and skill tracking.',
      icon: <Laptop className="w-6 h-6 text-primary-600" />
    },
    {
      title: 'Verified Accreditation',
      description: 'Receive certificates with unique verification IDs upon course completion and passing assessments.',
      icon: <ShieldCheck className="w-6 h-6 text-primary-600" />
    }
  ];

  const testimonials = [
    {
      name: 'Alice Johnson',
      role: 'Frontend Developer',
      quote: 'The live reviews and mentor feedback helped me understand exactly where I needed to improve.'
    },
    {
      name: 'Rahul Mehta',
      role: 'MERN Student',
      quote: 'The structured courses are easy to follow and the dashboard keeps me motivated every day.'
    },
    {
      name: 'Priya Sharma',
      role: 'UI Engineer',
      quote: 'The professional certificate flow and real-world project focus made the learning feel truly career-oriented.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/30 font-sans text-slate-900 selection:bg-primary-100 selection:text-primary-900">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-sm py-3 border-b border-slate-100' 
          : 'bg-transparent py-6'
      }`}>
        <div className="container mx-auto px-6 max-w-7xl flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <img 
              src="/logo.png" 
              alt="Learnify" 
              className="h-8 w-auto" 
            />
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {['Courses', 'About', 'Teach'].map((item) => (
              <a 
                key={item}
                href={item === 'Teach' ? '/instructor/login' : `#${item.toLowerCase()}`}
                onClick={(e) => {
                  if (item === 'Teach') {
                    e.preventDefault();
                    dispatch(logout());
                    navigate('/instructor/login');
                  }
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {!currentUser ? (
              <>
                <button 
                  onClick={() => { dispatch(logout()); navigate('/login'); }}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors px-4 py-2"
                >
                  Login
                </button>
                <button 
                  onClick={() => navigate('/register')}
                  className="btn-primary py-2 px-5 text-xs rounded-xl"
                >
                  Get Started
                </button>
              </>
           ) : (
              <button 
                onClick={() => { dispatch(logout()); navigate('/login'); }}
                className="btn-primary py-2 px-5 text-xs rounded-xl"
              >
                Start Learning
              </button>
            )}
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Menu Panel */}
        <AnimatePresence>
          {isMenuOpen && (
            <MotionDiv
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-lg"
            >
              <div className="flex flex-col p-6 space-y-4">
                {['Courses', 'About', 'Teach'].map((item) => (
                  <a 
                    key={item}
                    href={item === 'Teach' ? '/instructor/login' : `#${item.toLowerCase()}`}
                    onClick={(e) => {
                      if (item === 'Teach') {
                        e.preventDefault();
                        dispatch(logout());
                        navigate('/instructor/login');
                      } else {
                        setIsMenuOpen(false);
                      }
                    }} 
                    className="text-sm font-semibold text-slate-700 hover:text-primary-600 transition-colors"
                  >
                    {item}
                  </a>
                ))}
                <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                  {!currentUser ? (
                    <>
                      <button onClick={() => { dispatch(logout()); navigate('/login'); setIsMenuOpen(false); }} className="w-full py-2.5 text-sm font-bold text-slate-700 bg-slate-50 rounded-xl hover:bg-slate-100">Login</button>
                      <button onClick={() => { navigate('/register'); setIsMenuOpen(false); }} className="w-full bg-primary-600 text-white py-2.5 text-sm font-bold rounded-xl shadow-sm hover:bg-primary-700">Join Now</button>
                    </>
                  ) : (
                    <button onClick={() => { dispatch(logout()); navigate('/login'); setIsMenuOpen(false); }} className="w-full bg-primary-600 text-white py-2.5 text-sm font-bold rounded-xl shadow-sm hover:bg-primary-700">Start Learning</button>
                  )}
                </div>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 bg-white overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 z-0"></div>

        <div className="container mx-auto px-6 max-w-7xl relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left content */}
            <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary-50 border border-primary-100 rounded-full">
                <Zap size={14} className="text-primary-600 fill-primary-600" />
                <span className="text-[10px] font-black text-primary-700 uppercase tracking-widest">Next-Gen Educational LMS</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                Learn Skills That <br />
                <span className="text-primary-600">Build Your Future</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
                Master industry-leading technologies with interactive modules, real-time mentor evaluation, and verified professional certificates.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
                <button
                  onClick={() => { dispatch(logout()); navigate('/login'); }}
                  className="btn-primary px-8 py-4 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary-600/10"
                >
                  Start Learning
                  <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => document.getElementById('courses').scrollIntoView({ behavior: 'smooth' })}
                  className="btn-secondary px-8 py-4 text-xs font-black uppercase tracking-wider rounded-xl"
                >
                  Explore Catalog
                </button>
              </div>
            </div>

            {/* Right graphic mockup */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md md:max-w-lg lg:max-w-none">
                {/* Decorative glow */}
                <div className="absolute inset-0 bg-primary-500/10 rounded-[2.5rem] filter blur-3xl -z-10"></div>
                <div className="p-2.5 bg-slate-100 border border-slate-200/60 rounded-[2rem] shadow-2xl">
                  <img
                    src={heroImage}
                    alt="Realistic Coding Setup"
                    className="w-full h-auto rounded-[1.5rem] object-cover aspect-[4/3] shadow-md border border-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-y border-slate-100" id="about">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="flex items-center gap-4 justify-center md:justify-start">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                  {stat.icon}
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900">{stat.value}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50/50">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid md:grid-cols-3 gap-10">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl border border-slate-100 hover:border-slate-250 transition-all duration-300 space-y-6">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                  {feature.icon}
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-24 bg-white" id="courses">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-16 gap-6 pb-6 border-b border-slate-100">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Trending Now</span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Explore Professional Programs</h2>
            </div>
            {/* Browse Catalog button removed per request */}
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {loadingCourses ? (
              [1, 2, 3].map(i => (
                <div key={i} className="card h-96 animate-pulse bg-slate-50/50 border border-slate-200"></div>
              ))
            ) : featuredCourses.length > 0 ? featuredCourses.map((course) => (
              <div key={course._id} className="card bg-white border border-slate-100 flex flex-col justify-between">
                <div>
                  <div className="relative aspect-video overflow-hidden bg-slate-50">
                    <img 
                      src={course.thumbnail || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80"} 
                      alt={course.title} 
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-102" 
                    />
                    <div className="absolute top-3 left-3 bg-white/95 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-150 text-slate-800 shadow-sm">
                      {course.category}
                    </div>
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-yellow-500 gap-1">
                        <Star size={14} className="fill-current" />
                        <span className="text-slate-800 font-bold text-xs">{course.rating || 0}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{course.enrolledStudentsCount || 0} Learners</span>
                    </div>
                    <h4 className="text-base font-extrabold text-slate-900 leading-snug line-clamp-2 hover:text-primary-600 transition-colors cursor-pointer" onClick={() => handleEnrollClick(course._id)}>
                      {course.title}
                    </h4>
                  </div>
                </div>
                
                <div className="p-6 pt-0">
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Program Fee</p>
                      <p className="text-lg font-black text-slate-900">₹{course.price?.toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => handleEnrollClick(course._id)} 
                      className="btn-primary py-2 px-5 text-xs rounded-xl"
                    >
                      Enroll
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-16 text-center text-slate-400 font-medium italic text-sm">
                No courses currently available. Check back soon!
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-slate-50/50" id="testimonials">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Success Stories</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Trusted by Professional Learners</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-300 space-y-6">
                <div className="flex items-center gap-1 text-yellow-500">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} className="fill-current" />)}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed italic font-medium">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-black text-xs">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">{t.name}</h5>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-slate-950 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-600/10 rounded-full filter blur-[80px] -mr-40 -mt-40"></div>
        
        <div className="container mx-auto px-6 text-center space-y-8 relative z-10 max-w-3xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Ready to Advance Your <span className="text-primary-400">Professional Journey?</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto font-medium">
            Join thousands of professionals already mastering new industry standards and upgrading their credentials on Learnify.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <button 
              onClick={() => { dispatch(logout()); navigate('/login'); }}
              className="btn-primary px-8 py-3.5 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary-600/10 w-full sm:w-auto"
            >
              Start Learning Now
            </button>
            <button 
              onClick={() => { dispatch(logout()); navigate('/instructor/login'); }} 
              className="btn-secondary px-8 py-3.5 text-xs font-black uppercase tracking-wider rounded-xl bg-transparent text-white border-slate-800 hover:bg-slate-900 w-full sm:w-auto"
            >
              Become an Instructor
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-20 pb-12 bg-white border-t border-slate-100">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center">
                <img src="/logo.png" alt="Learnify" className="h-8 w-auto" />
              </div>
              <p className="text-slate-500 max-w-xs text-xs leading-relaxed font-medium">
                The leading platform for professional skill development, mentor-led courses, and verified industry accreditation.
              </p>
            </div>
            
            {['Catalog', 'Company', 'Legal'].map((title, idx) => (
              <div key={idx}>
                <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{title}</h6>
                <ul className="space-y-4 text-xs font-semibold text-slate-600">
                  <li><a href="#courses" className="hover:text-primary-600 transition-colors">Browse Courses</a></li>
                  <li><a href="#about" className="hover:text-primary-600 transition-colors">About Platform</a></li>
                  <li><a href="/instructor/login" onClick={(e) => { e.preventDefault(); dispatch(logout()); navigate('/instructor/login'); }} className="hover:text-primary-600 transition-colors">Instructor Portal</a></li>
                </ul>
              </div>
            ))}
          </div>
          
          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">© 2026 Learnify Ecosystem. Built for Professionals.</p>
            <div className="flex gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <a href="#" className="hover:text-primary-600 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary-600 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
