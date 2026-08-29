import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard,
  BookOpen,
  ShoppingBag,
  PlayCircle,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  Award,
  FileText,
  ClipboardCheck,
  Mail
} from 'lucide-react';
import { logout } from '../../features/auth/authSlice';
import chatService from '../../services/chatService';
import { useSocket } from '../../context/SocketContext';
import NotificationPanel from '../common/NotificationPanel';

const DashboardLayout = () => {
  const { socket } = useSocket();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const data = await chatService.getConversations();
      const conversationsData = Array.isArray(data) ? data : (data?.conversations || []);
      const totalUnread = conversationsData.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
      setUnreadCount(totalUnread);
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    socket.on("new-message", fetchUnreadCount);
    socket.on("messages-read", fetchUnreadCount);

    return () => {
      socket.off("new-message", fetchUnreadCount);
      socket.off("messages-read", fetchUnreadCount);
    };
  }, [socket]);

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/student/dashboard' },
    { name: 'My Courses', icon: <BookOpen size={18} />, path: '/student/courses' },
    { name: 'Exams', icon: <FileText size={18} />, path: '/student/exams' },
    { name: 'Reviews', icon: <ClipboardCheck size={18} />, path: '/student/reviews' },
    { name: 'Certificates', icon: <Award size={18} />, path: '/student/certificates' },
    { name: 'Messages', icon: <Mail size={18} />, path: '/student/messages' },
    { name: 'Buy Course', icon: <ShoppingBag size={18} />, path: '/student/buy-courses' },
    { name: 'Live Classes', icon: <PlayCircle size={18} />, path: '/student/live-classes' },
    { name: 'Profile', icon: <UserIcon size={18} />, path: '/student/profile' },
  ];

  const getPageTitle = () => {
    const item = menuItems.find(item => item.path === location.pathname || location.pathname.startsWith(item.path));
    return item ? item.name : 'StackVerseHub';
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/student/buy-courses?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden h-screen">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0">
            <Link to="/student/dashboard" className="flex items-center gap-3 min-w-0">
              <img src="/logo.png" alt="StackVerseHub" className="h-8 w-8 rounded-md object-contain shrink-0" />
              <span className="truncate text-base font-extrabold tracking-tight text-slate-950">StackVerse Hub</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 space-y-1 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/student/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''} flex items-center justify-between`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="text-sm font-semibold">{item.name}</span>
                  </div>
                  {item.name === 'Messages' && unreadCount > 0 && (
                    <span className="bg-primary-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full mr-2 shadow-sm shadow-primary-600/10">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Summary in Sidebar */}
          <div className="p-4 border-t border-slate-100 shrink-0">
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 overflow-hidden shrink-0 border border-slate-200/50">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt="profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={18} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate leading-tight">{user?.name || 'Student'}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{user?.role || 'Student'}</p>
                </div>
              </div>
              {unreadCount > 0 && (
                <div className="flex items-center justify-center w-5 h-5 bg-primary-600 rounded-full shrink-0 shadow-sm shadow-primary-600/10">
                  <span className="text-[9px] font-black text-white">{unreadCount}</span>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="mt-2 flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative hidden lg:block w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Search catalog or classes..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs focus:ring-4 focus:ring-primary-500/10 focus:bg-white focus:border-primary-500 outline-none transition-all duration-200 font-semibold"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <NotificationPanel />
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors" onClick={() => navigate('/student/buy-courses')}>
                <ShoppingBag size={18} />
              </button>
            </div>

            {/* User Profile */}
            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            <Link to="/student/profile" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center text-primary-700 overflow-hidden group-hover:ring-4 group-hover:ring-primary-500/10 transition-all border border-primary-100">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={14} />
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 group-hover:text-primary-600 transition-colors leading-tight">{user?.name}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Student</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <main className={`flex-1 ${location.pathname === '/student/messages' ? 'overflow-hidden' : 'overflow-y-auto p-6 lg:p-8'} bg-slate-50/50`}>
          <div className={location.pathname === '/student/messages' ? 'h-full w-full' : 'max-w-7xl mx-auto space-y-8'}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default DashboardLayout;
