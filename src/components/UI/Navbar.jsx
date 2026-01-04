import { LogOut, User, Shield } from 'lucide-react';

export default function Navbar({ user, role, onLogout }) {

  const getRoleBadgeColor = (role) => {
    const colors = {
      'Administrator': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'Teacher': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Student': 'bg-sky-50 text-sky-700 border-sky-200',
      'Unknown': 'bg-slate-50 text-slate-600 border-slate-200'
    };
    return colors[role] || colors['Unknown'];
  };

  const iconColorClass = role === 'Administrator'
    ? 'text-indigo-400'
    : role === 'Teacher'
      ? 'text-emerald-400'
      : role === 'Student'
        ? 'text-sky-400'
        : 'text-slate-400';

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
              <img src="/rv_logo.png" alt="RVCE Logo" className="h-8 w-auto object-contain filter brightness-0 invert" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              AICTE Points Tracker
            </h1>
          </div>

          {/* User Info Section */}
          <div className="flex items-center gap-4">
            {/* Role Badge */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getRoleBadgeColor(role)} transition-colors duration-200`}>
              <User className={`w-4 h-4 ${iconColorClass}`} />
              <span className="text-sm font-medium">
                {role || 'Loading...'}
              </span>
            </div>

            {/* Email */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-200">
              <span className="text-sm text-slate-600">{user?.email}</span>
            </div>

            {/* Logout Button */}
            <button
              className="flex items-center gap-2 bg-white text-slate-700 hover:text-red-600 px-4 py-2 rounded-md transition-colors duration-200 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-sm font-medium"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}