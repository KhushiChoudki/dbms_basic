import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import * as XLSX from 'xlsx';

async function getUsnsFromExcel(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not download Excel');
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  const usnIndex = (data[0] || []).findIndex(
    h => typeof h === 'string' && h.toLowerCase().includes('usn')
  );
  // Clean all USNs to uppercase and trimmed
  return data.slice(1)
    .map(r =>
      typeof r[usnIndex] === 'string'
        ? r[usnIndex].trim().toUpperCase()
        : ('' + r[usnIndex]).trim().toUpperCase())
    .filter(Boolean);
}

export default function SuperadminDashboard({ user }) {
  const [superadminId, setSuperadminId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    const role = user?.user_metadata?.role || user?.raw_user_meta_data?.role || 'unknown';
    if (role !== 'Superadmin') {
      setError('You do not have Superadmin access.');
      return;
    }
    async function fetchSuperadminData() {
      setLoading(true);
      setError(null);
      try {
        const { data: supRow } = await supabase
          .from('superadmins')
          .select('superadmin_id')
          .eq('id', user.id)
          .single();
        if (!supRow) {
          setError('Superadmin data not found.');
          setLoading(false);
          return;
        }
        setSuperadminId(supRow.superadmin_id);
        const { data: acts, error: actsErr } = await supabase
          .from('activities')
          .select('*')
          .is('approved_by', null)
          .not('excel_url', 'is', null);
        if (actsErr) throw actsErr;
        setActivities(acts ?? []);
      } catch (err) {
        setError('Failed to load data: ' + err.message);
      }
      setLoading(false);
    }
    fetchSuperadminData();
  }, [user]);

  async function handleApprove(activity) {
    if (!superadminId) {
      alert('Superadmin identity missing. Please relog.');
      return;
    }
    setLoading(true);

    let excelUsns = [];
    try {
      if (activity.excel_url) {
        excelUsns = await getUsnsFromExcel(activity.excel_url);
      }
    } catch (ex) {
      alert('Excel/Sheet parse failed: ' + ex.message);
      setLoading(false);
      return;
    }
    if (!excelUsns.length) {
      alert('No USNs found in the uploaded Excel.');
      setLoading(false);
      return;
    }

    // Fetch students whose USNs (trimmed & uppercased) match
    const { data: students, error: se } = await supabase
      .from('students')
      .select('usn,email,total_points')
      .in('usn', excelUsns);

    if (se) {
      alert('Error fetching students: ' + se.message);
      setLoading(false);
      return;
    }

    if (!students?.length) {
      alert('No matching students for these USNs.');
      setLoading(false);
      return;
    }

    // Insert activity points, then update totals for each relevant student.
    const inserts = students.map(s => ({
      id: crypto.randomUUID(),
      usn: s.usn,
      activity_id: activity.activity_id,
      email: s.email,
      points: activity.points,
      excel_url: activity.excel_url || null,
    }));

    const { error: insertErr } = await supabase
      .from('student_activities')
      .insert(inserts);

    if (insertErr) {
      alert('Error awarding points: ' + insertErr.message);
      setLoading(false);
      return;
    }

    // Update each student's total_points in parallel
    await Promise.all(
      students.map(async s => {
        // Add activity.points to existing total (ensure integer math)
        const updatedTotal = (s.total_points || 0) + (activity.points || 0);
        await supabase
          .from('students')
          .update({ total_points: updatedTotal })
          .eq('usn', s.usn);
      })
    );

    // Mark activity as approved
    const { error: updateErr } = await supabase
      .from('activities')
      .update({
        approved_by: superadminId,
        status: 'Approved'
      })
      .eq('activity_id', activity.activity_id);

    if (updateErr) {
      alert('Error approving activity: ' + updateErr.message);
      setLoading(false);
      return;
    }

    // Refresh activities
    const { data: freshActs, error: freshErr } = await supabase
      .from('activities')
      .select('*')
      .is('approved_by', null)
      .not('excel_url', 'is', null);
    if (!freshErr) setActivities(freshActs ?? []);
    else setError('Failed to refresh activities: ' + freshErr.message);

    setLoading(false);
    alert('Points awarded and totals updated!');
  }

  async function handleDisapprove(activity) {
    setLoading(true);
    const { error: updateErr } = await supabase
      .from('activities')
      .update({
        approved_by: null,
        status: 'Rejected',
        excel_url: null
      })
      .eq('activity_id', activity.activity_id);
    if (updateErr) {
      alert('Error disapproving activity: ' + updateErr.message);
      setLoading(false);
      return;
    }
    // Refresh pending activities
    const { data: freshActs, error: freshErr } = await supabase
      .from('activities')
      .select('*')
      .is('approved_by', null)
      .not('excel_url', 'is', null);
    if (!freshErr) setActivities(freshActs ?? []);
    else setError('Failed to refresh activities: ' + freshErr.message);
    setLoading(false);
    alert('Activity disapproved and Excel removed.');
  }

  if (error) return <div className="p-4 bg-red-600 text-white font-bold">{error}</div>;
  if (loading) return <div className="p-4 text-green-300">Loading...</div>;

  return (
    <div className="bg-gray-900 min-h-screen text-green-200 px-6 py-8">
      <h1 className="text-2xl font-bold text-green-400 mb-4">Superadmin Dashboard</h1>
      <p className="mb-6 text-xl">
        <span className="text-gray-300">Welcome,</span> <span className="ml-1 text-green-300">{user.email}</span>
        {superadminId && <span className="ml-4 text-green-400">Superadmin ID: {superadminId}</span>}
      </p>
      <h2 className="font-bold text-green-300 mb-2">Pending Activity Verifications</h2>
      {activities.length === 0 ? (
        <p className="text-gray-400">No activities to approve right now.</p>
      ) : (
        <table className="w-full bg-gray-800 rounded overflow-hidden mb-20">
          <thead>
            <tr className="bg-green-900">
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Admin</th>
              <th className="px-3 py-2">Excel</th>
              <th className="px-3 py-2">Approve/Disapprove</th>
            </tr>
          </thead>
          <tbody>
            {activities.map(a => (
              <tr key={a.activity_id} className="border-b border-gray-700">
                <td className="px-3 py-2">{a.title}</td>
                <td className="px-3 py-2">{a.organized_by || a.organizer_admin_id}</td>
                <td className="px-3 py-2">
                  {a.excel_url ? (
                    <a href={a.excel_url} target="_blank" rel="noopener noreferrer" className="underline text-green-400">
                      Excel
                    </a>
                  ) : ('—')}
                </td>
                <td className="px-3 py-2 flex gap-2">
                  <button className="px-3 py-1 bg-green-500 text-gray-900 rounded font-bold hover:bg-green-400 transition" onClick={() => handleApprove(a)}>
                    Approve
                  </button>
                  <button className="px-3 py-1 bg-red-500 text-white rounded font-bold hover:bg-red-400 transition" onClick={() => handleDisapprove(a)}>
                    Disapprove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
