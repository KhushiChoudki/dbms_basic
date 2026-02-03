import { useRef, useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import * as XLSX from 'xlsx';

async function getUsnsFromExcel(url) {
  // Auto-convert Google Sheet "edit" links to "export" links
  let fetchUrl = url;
  if (url.includes('docs.google.com/spreadsheets')) {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      fetchUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
      console.log("Converted Google Sheet URL to:", fetchUrl);
    }
  }

  const response = await fetch(fetchUrl);
  if (!response.ok) throw new Error('Could not download Excel. Status: ' + response.status);
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Find Headers
  const headerRow = data[0] || [];
  const usnIndex = headerRow.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('usn'));
  const pointsIndex = headerRow.findIndex(h => typeof h === 'string' && (h.toLowerCase().includes('point') || h.toLowerCase().includes('score')));

  return data.slice(1)
    .map(r => {
      const usn = typeof r[usnIndex] === 'string'
        ? r[usnIndex].trim().toUpperCase()
        : (r[usnIndex] ? ('' + r[usnIndex]).trim().toUpperCase() : null);

      if (!usn) return null;

      let points = null;
      if (pointsIndex !== -1 && r[pointsIndex] !== undefined) {
        points = Number(r[pointsIndex]);
      }
      return { usn, points };
    })
    .filter(item => item && item.usn);
}

export default function SuperadminDashboard({ user }) {
  const [superadminId, setSuperadminId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [allActivities, setAllActivities] = useState([]); // For analytics
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // SDG Modal state
  const [sdgModalOpen, setSdgModalOpen] = useState(false);
  const [sdgModalTitle, setSdgModalTitle] = useState('');
  const [sdgModalActivities, setSdgModalActivities] = useState([]);

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
        // Fetch pending for approval table
        const { data: acts, error: actsErr } = await supabase
          .from('activities')
          .select('*')
          .is('approved_by', null)
          .not('excel_url', 'is', null);
        if (actsErr) throw actsErr;
        setActivities(acts ?? []);

        // Fetch ALL activities for analytics
        const { data: allActs } = await supabase.from('activities').select('*');
        setAllActivities(allActs ?? []);

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

    let excelData = [];
    try {
      if (activity.excel_url) {
        excelData = await getUsnsFromExcel(activity.excel_url);
      }
    } catch (ex) {
      alert('Excel/Sheet parse failed: ' + ex.message);
      setLoading(false);
      return;
    }

    if (!excelData.length) {
      alert('No USNs found in the uploaded Excel.');
      setLoading(false);
      return;
    }

    console.log("Extracted Data from Excel:", excelData);
    const usnList = excelData.map(d => d.usn);

    const { data: students, error: se } = await supabase
      .from('students')
      .select('usn,email,total_points')
      .in('usn', usnList);

    console.log("Matched Students from DB:", students);
    if (se) console.error("Supabase Error:", se);

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

    const inserts = students.map(s => {
      // OVERRIDE LOGIC: Use Excel points if available, else Activity default
      const matchedRow = excelData.find(d => d.usn === s.usn);
      const pointsToAward = (matchedRow && matchedRow.points !== null && !isNaN(matchedRow.points))
        ? matchedRow.points
        : Number(activity.points);

      return {
        id: crypto.randomUUID(),
        usn: s.usn,
        activity_id: activity.activity_id,
        email: s.email,
        points: pointsToAward,
        excel_url: activity.excel_url || null,
      };
    });

    const { error: insertErr } = await supabase
      .from('student_activities')
      .insert(inserts);

    if (insertErr) {
      alert('Error awarding points: ' + insertErr.message);
      setLoading(false);
      return;
    }

    await Promise.all(
      students.map(async s => {
        // Find the specific points awarded to this student in the `inserts` array above
        // or re-calculate. simpler to re-calculate logic here.
        const matchedRow = excelData.find(d => d.usn === s.usn);
        const pointsToAward = (matchedRow && matchedRow.points !== null && !isNaN(matchedRow.points))
          ? matchedRow.points
          : Number(activity.points);

        const updatedTotal = (s.total_points || 0) + pointsToAward;
        await supabase
          .from('students')
          .update({ total_points: updatedTotal })
          .eq('usn', s.usn);
      })
    );

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white rounded-xl p-8 shadow-sm border-l-4 border-red-500 max-w-md w-full">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-100">
              <svg className="w-7 h-7 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
          </div>
          <p className="text-slate-600 text-base leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-lg font-semibold text-slate-800">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-slate-900">
            Superadmin Dashboard
          </h1>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-slate-500 text-sm mb-1 font-medium uppercase tracking-wide">Logged in as</p>
                <p className="text-slate-900 text-xl font-bold">{user.email}</p>
                {superadminId && (
                  <p className="text-slate-600 text-sm mt-2">
                    Superadmin ID: <span className="font-mono font-semibold text-slate-900">{superadminId}</span>
                  </p>
                )}
              </div>
              <div className="rounded-lg p-4 bg-indigo-50 border border-indigo-100">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-indigo-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-indigo-800 font-bold text-sm">Superadmin Access</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SDG Analytics Section */}
        <section className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">SDG Analytics</h2>
              <p className="text-slate-600 text-sm mt-1">AI-based classification analysis of all activities</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Chart 1: Ratio */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 uppercase mb-4">SDG vs Non-SDG Distribution</h3>
                <p className="text-xs text-slate-500 mb-3">Click on a bar to view activities</p>
                {allActivities.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-3">
                      {(() => {
                        const sdgActivities = allActivities.filter(a => a.is_sdg);
                        const nonSdgActivities = allActivities.filter(a => !a.is_sdg);
                        const total = allActivities.length;
                        const sdgPct = Math.round((sdgActivities.length / total) * 100);
                        return (
                          <>
                            <div
                              className="cursor-pointer hover:opacity-80 transition-opacity p-2 -m-2 rounded-lg hover:bg-green-50"
                              onClick={() => {
                                setSdgModalTitle('SDG Related Activities');
                                setSdgModalActivities(sdgActivities);
                                setSdgModalOpen(true);
                              }}
                            >
                              <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-green-700">SDG Related ({sdgActivities.length})</span>
                                <span className="text-slate-500">{sdgPct}%</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2.5">
                                <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${sdgPct}%` }}></div>
                              </div>
                            </div>
                            <div
                              className="cursor-pointer hover:opacity-80 transition-opacity p-2 -m-2 rounded-lg hover:bg-slate-100"
                              onClick={() => {
                                setSdgModalTitle('Non-SDG Activities');
                                setSdgModalActivities(nonSdgActivities);
                                setSdgModalOpen(true);
                              }}
                            >
                              <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-slate-700">Non-SDG ({nonSdgActivities.length})</span>
                                <span className="text-slate-500">{100 - sdgPct}%</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2.5">
                                <div className="bg-slate-400 h-2.5 rounded-full" style={{ width: `${100 - sdgPct}%` }}></div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : <p className="text-sm text-slate-500 italic">No data available</p>}
              </div>

              {/* Chart 2: Top Categories */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 uppercase mb-4">Top SDG Categories</h3>
                <p className="text-xs text-slate-500 mb-3">Click on a category to view activities</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {(() => {
                    const categoryActivities = {};
                    allActivities.forEach(a => {
                      if (a.is_sdg && a.sdg_category) {
                        if (!categoryActivities[a.sdg_category]) {
                          categoryActivities[a.sdg_category] = [];
                        }
                        categoryActivities[a.sdg_category].push(a);
                      }
                    });
                    const sorted = Object.entries(categoryActivities).sort((a, b) => b[1].length - a[1].length);

                    if (sorted.length === 0) return <p className="text-xs text-slate-500 italic">No SDG activities yet.</p>;

                    return sorted.map(([cat, acts]) => (
                      <div
                        key={cat}
                        className="flex items-center justify-between text-sm bg-white p-2 rounded border border-slate-100 shadow-sm cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                        onClick={() => {
                          setSdgModalTitle(cat);
                          setSdgModalActivities(acts);
                          setSdgModalOpen(true);
                        }}
                      >
                        <span className="font-medium text-slate-700 truncate max-w-[80%]">{cat}</span>
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full text-xs">{acts.length}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Pending Activity Verifications</h2>
              <p className="text-slate-600 text-sm mt-1">Review and approve activities uploaded by admins</p>
            </div>

            <div className="p-6">
              {activities.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-slate-100">
                    <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-900 text-lg font-bold mb-1">All caught up!</p>
                  <p className="text-slate-500 text-sm">No activities pending approval at the moment</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3 text-left font-semibold text-sm uppercase tracking-wider text-slate-700">
                            Activity Title
                          </th>
                          <th className="px-6 py-3 text-left font-semibold text-sm uppercase tracking-wider text-slate-700">
                            Organized By
                          </th>
                          <th className="px-6 py-3 text-left font-semibold text-sm uppercase tracking-wider text-slate-700">
                            Points
                          </th>
                          <th className="px-6 py-3 text-left font-semibold text-sm uppercase tracking-wider text-slate-700">
                            Excel File
                          </th>
                          <th className="px-6 py-3 text-center font-semibold text-sm uppercase tracking-wider text-slate-700">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activities.map((a, idx) => (
                          <tr key={a.activity_id} className="transition-all hover:bg-slate-50">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900 text-sm mb-1">{a.title}</div>
                              <div className="text-xs text-slate-500 font-mono px-2 py-0.5 rounded bg-slate-100 inline-block">
                                {a.activity_id}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-800 text-sm font-medium">
                              {a.organized_by || a.organizer_admin_id}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                                {a.points} pts
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {a.excel_url ? (
                                <a
                                  href={a.excel_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                                >
                                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  View File
                                </a>
                              ) : (
                                <span className="text-slate-400 text-sm">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleApprove(a)}
                                  className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 transition-colors shadow-sm"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleDisapprove(a)}
                                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors shadow-sm"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="mt-8 rounded-xl p-6 shadow-sm border border-blue-100 bg-blue-50">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold mb-1 text-blue-900">Approval Process</h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                When you approve an activity, points will be automatically awarded to all students listed in the Excel file.
                Their total points will be updated accordingly. Rejected activities will have their Excel files removed.
              </p>
            </div>
          </div>
        </div>

        {/* SDG Activities Modal */}
        {sdgModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSdgModalOpen(false)}>
            <div className="bg-white shadow-xl rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-slate-200 relative animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{sdgModalTitle}</h2>
                  <p className="text-slate-600 text-sm mt-1">{sdgModalActivities.length} {sdgModalActivities.length === 1 ? 'activity' : 'activities'} found</p>
                </div>
                <button
                  onClick={() => setSdgModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {sdgModalActivities.length > 0 ? (
                  <div className="space-y-3">
                    {sdgModalActivities.map(activity => (
                      <div key={activity.activity_id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-900 mb-1">{activity.title}</h3>
                            <p className="text-xs text-slate-500 font-mono mb-2">{activity.activity_id}</p>
                            {activity.description && (
                              <p className="text-sm text-slate-600 line-clamp-2">{activity.description}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {activity.points} pts
                            </span>
                            {activity.is_sdg && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                SDG
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-3 text-xs text-slate-500">
                          {activity.organized_by && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {activity.organized_by}
                            </span>
                          )}
                          {activity.sdg_category && (
                            <span className="flex items-center gap-1 text-green-600">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {activity.sdg_category}
                            </span>
                          )}
                          {activity.status && (
                            <span className={`px-2 py-0.5 rounded font-medium ${activity.status === 'Approved' ? 'bg-green-100 text-green-700' :
                              activity.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                              {activity.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-slate-500 text-sm">No activities found in this category</p>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSdgModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}