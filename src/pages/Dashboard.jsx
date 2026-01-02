import { Loader2, AlertCircle, ShieldAlert } from 'lucide-react';
import useUserRole from "../hooks/useUserRole";
import StudentDashboard from "../components/Dashboard/StudentDashboard";
import CounsellorDashboard from "../components/Dashboard/CounsellorDashboard";
import AdminDashboard from "../components/Dashboard/AdminDashboard";
import SuperadminDashboard from "../components/Dashboard/SuperadminDashboard";

export default function Dashboard({ user }) {
  const { role, loading } = useUserRole(user?.id);

  // Role-based dashboard mapping
  const dashboardComponents = {
    Student: StudentDashboard,
    Counsellor: CounsellorDashboard,
    Admin: AdminDashboard,
    Superadmin: SuperadminDashboard,
    SuperAdmin: SuperadminDashboard,
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="mt-4 text-sm text-slate-500">Loading your dashboard...</p>
      </div>
    );
  }

  // Unknown or missing role
  if (!role || !dashboardComponents[role]) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="rounded-full bg-red-100 p-3 mb-4">
          <ShieldAlert className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Access Denied</h3>
        <p className="mt-2 text-slate-600 max-w-sm">
          {!role ? 'Your account role could not be determined.' : `The role "${role}" is not recognized.`}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Refresh Page
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  // Render appropriate dashboard
  const DashboardComponent = dashboardComponents[role];
  return <DashboardComponent user={user} />;
}