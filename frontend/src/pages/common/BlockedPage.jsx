import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Mail, MessageCircle } from 'lucide-react';
import { logout } from '../../features/auth/authSlice';

const BlockedPage = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-200 overflow-hidden">
        <div className="bg-red-600 p-10 flex justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="bg-white/20 backdrop-blur-md p-6 rounded-[2.5rem] relative z-10 shadow-2xl">
            <ShieldAlert size={64} className="text-white" />
          </div>
        </div>

        <div className="p-10 text-center space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Account Restricted</h2>
            <p className="text-slate-500 font-medium">Your access to StackVerseHub has been suspended.</p>
          </div>

          <div className="bg-red-50 p-6 rounded-3xl border border-red-100 text-left space-y-3">
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Reason for restriction</p>
            <p className="text-red-700 font-bold leading-relaxed">
              {user?.blockedReason || "Your account has been flagged for violating platform policies. Please contact support for more information."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <Mail size={20} className="text-slate-400 mx-auto mb-2" />
              <p className="text-[10px] font-bold text-slate-500 uppercase">Support</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <MessageCircle size={20} className="text-slate-400 mx-auto mb-2" />
              <p className="text-[10px] font-bold text-slate-500 uppercase">Appeal</p>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button
              onClick={handleLogout}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-100"
            >
              <LogOut size={20} />
              Sign Out
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-4 text-slate-500 font-bold text-sm hover:text-slate-900 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">StackVerseHub Security System</p>
        </div>
      </div>
    </div>
  );
};

export default BlockedPage;
