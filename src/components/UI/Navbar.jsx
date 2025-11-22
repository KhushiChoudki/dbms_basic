import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';

export default function Navbar({ user, onLogout }) {
  const [role, setRole] = useState('');

  useEffect(() => {
  async function fetchUserRole() {
    if (user?.id) {
      console.log('Fetching role for user id:', user.id); // Debug line
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      console.log('Supabase data:', data);      // Debug line
      console.log('Supabase error:', error);    // Debug line
      setRole(data?.role || 'Unknown');
    }
  }
  fetchUserRole();
}, [user]);


  return (
    <header className="flex justify-between items-center px-4 py-3 bg-white shadow">
      <h1 className="text-xl font-bold text-purple-700">AICTE Points Tracker</h1>
      <div className="flex items-center gap-5">
        <span>Role: <span className="font-semibold">{role}</span></span>
        <span>{user?.email}</span>
        <button
          className="bg-red-500 text-white px-4 py-2 rounded"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
