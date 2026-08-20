import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  UserX, 
  UserCheck, 
  AlertTriangle,
  MoreHorizontal,
  Mail,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import adminService from '../../services/adminService';
import { toast } from 'react-hot-toast';

const AdminUserBlocks = () => {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getBlockedUsers();
      setBlockedUsers(data);
    } catch (error) {
      console.error('Failed to fetch blocked users', error);
      toast.error('Could not load blocked users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId) => {
    try {
      // Optimistic update
      setBlockedUsers(prev => prev.filter(u => u._id !== userId));
      
      await adminService.unblockUser(userId);
      toast.success('User unblocked successfully');
    } catch (error) {
      console.error('Failed to unblock user', error);
      toast.error('Failed to unblock user');
      // Rollback
      fetchBlockedUsers();
    }
  };

  const filteredUsers = blockedUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All Roles' || 
                       (roleFilter === 'Students' && user.role === 'student') ||
                       (roleFilter === 'Instructors' && user.role === 'instructor');
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Access Control</h2>
          <p className="text-slate-500">Manage blocked users and maintain platform integrity.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
           <ShieldAlert className="w-5 h-5 text-amber-600" />
           <span className="text-sm font-bold text-amber-700">{blockedUsers.length} Total Blocked Users</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all"
          />
        </div>
        <select 
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-slate-50 border-none text-sm font-medium text-slate-600 rounded-xl focus:ring-0 px-4 py-2"
        >
          <option>All Roles</option>
          <option>Students</option>
          <option>Instructors</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason for Block</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Blocked Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <p className="text-sm text-slate-500">Loading blocked users...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-red-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'instructor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2 max-w-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-slate-600 italic">"{user.blockedReason || 'Policy Violation'}"</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">{formatDate(user.blockedAt || user.updatedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleUnblock(user._id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-bold hover:bg-green-100 transition-colors border border-green-100"
                      >
                        <UserCheck className="w-4 h-4" /> Unblock User
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">
                    No blocked users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUserBlocks;
