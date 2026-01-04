import { useEffect, useState } from "react";
import { supabase } from "./utils/supabaseClient";
import Navbar from "./components/UI/Navbar";
import LoginForm from "./components/Auth/LoginForm";
import ResetPassword from "./components/Auth/ResetPassword";
import Dashboard from "./pages/Dashboard";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import "./tailwind.css";

function AppContent() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function getSessionAndRole() {
      // Fetch session
      const { data } = await supabase.auth.getSession();
      const u = data?.session?.user || null;
      setUser(u);

      if (u?.id) {
        // Fetch role from Supabase DB by Auth ID!
        const { data: userRow, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", u.id)
          .single();

        setRole(userRow?.role || null);
      } else {
        setRole(null);
      }
      setLoading(false);
    }

    getSessionAndRole();

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Only trigger reload if user Actually changed (login/logout/switch)
      // Avoid reloading on TOKEN_REFRESH which happens on tab focus
      setUser(prevUser => {
        const newUser = session?.user ?? null;
        if (prevUser?.id !== newUser?.id) {
          setRole(null);
          setLoading(true);
        }
        return newUser;
      });
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setLoading(false);
    navigate("/");
  };

  if (!user) return <LoginForm onLogin={setUser} />;
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-slate-500">Loading...</div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar user={user} role={role || "Unknown"} onLogout={logout} />
      <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <Dashboard user={user} role={role || "Unknown"} />
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;
