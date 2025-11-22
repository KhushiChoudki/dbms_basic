import useUserRole from "../hooks/useUserRole";
import StudentDashboard from "../components/Dashboard/StudentDashboard";
import CounsellorDashboard from "../components/Dashboard/CounsellorDashboard";
import AdminDashboard from "../components/Dashboard/AdminDashboard";
import SuperadminDashboard from "../components/Dashboard/SuperadminDashboard";

export default function Dashboard({ user }) {
  const { role, loading } = useUserRole(user?.id);

  if (loading) return <div>Loading...</div>;
  if (!role) return <div>Unknown role</div>;
  if (role === "Student") return <StudentDashboard user={user} />;
  if (role === "Counsellor") return <CounsellorDashboard user={user} />;
  if (role === "Admin") return <AdminDashboard user={user} />;
  if (role === "Superadmin" || role === "SuperAdmin") return <SuperadminDashboard user={user} />;
  return <div>Unknown role</div>;
}
