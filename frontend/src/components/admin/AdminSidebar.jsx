import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CheckCircle,
  Layers,
  CreditCard,
  BarChart3,
  UserCircle,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { logout } from '../../features/auth/authSlice';

const AdminSidebar = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/admin/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Users, label: 'Students', path: '/admin/students' },
    { icon: GraduationCap, label: 'Instructors', path: '/admin/instructors' },
    { icon: CheckCircle, label: 'Courses Approval', path: '/admin/course-approval' },
    { icon: Layers, label: 'Categories', path: '/admin/categories' },
    { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
    { icon: BarChart3, label: 'Reports', path: '/admin/reports' },
    { icon: UserCircle, label: 'Profile', path: '/admin/profile' },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0">
          <Link to="/admin/dashboard" className="flex items-center gap-3 min-w-0">
            <img src="/logo.png" alt="StackVerseHub" className="h-8 w-8 rounded-md object-contain shrink-0" />
            <span className="truncate text-base font-extrabold tracking-tight text-slate-950">StackVerse Hub</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => window.innerWidth < 1024 && toggleSidebar()}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-semibold">{item.label}</span>
              </div>
            </NavLink>
          ))}
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
                <p className="text-xs font-bold text-slate-900 truncate leading-tight">{user?.name || 'Admin User'}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{user?.role || 'Super Admin'}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
