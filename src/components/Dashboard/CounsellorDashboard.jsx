import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';

// Modal to show activities for a given student (using usn, not student_id)
function StudentActivitiesModal({ student, onClose }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      setLoading(true);
      const { data } = await supabase
        .from('student_activities')
        .select('activity_id, points, activities(title)')
        .eq('usn', student.usn);
      setActivities(data ?? []);
      setLoading(false);
    }
    fetchActivities();
  }, [student.usn]);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white shadow-xl rounded-xl p-6 w-full max-w-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200 text-xl"
        >
          ×
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Student Activities
          </h2>
          <p className="text-slate-500 text-sm">
            {student.name} <span className="text-indigo-600 font-medium">({student.usn})</span>
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-600"></div>
          </div>
        ) : activities.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {activities.map((a, idx) => (
                  <tr
                    key={a.activity_id}
                    className="hover:bg-slate-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-3 text-slate-900 font-medium text-sm">
                      {a.activities?.title || `Activity #${a.activity_id}`}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {a.points} pts
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <svg
              className="mx-auto h-10 w-10 text-slate-400 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-slate-500 text-sm font-medium">No activities recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CounsellorDashboard({ user }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [pointsMap, setPointsMap] = useState({});

  // Analytics State
  const [totalStudents, setTotalStudents] = useState(0);
  const [avgPoints, setAvgPoints] = useState(0);
  const [pointDist, setPointDist] = useState({ low: 0, med: 0, high: 0 }); // 0-50, 50-100, 100+
  const [sdgStats, setSdgStats] = useState({ sdg: 0, nonSdg: 0 });

  useEffect(() => {
    async function fetchCounsellorData() {
      setLoading(true);

      const { data: studentRows, error } = await supabase
        .from('students')
        .select('id, name, usn');

      if (error || !studentRows) {
        setStudents([]);
        setLoading(false);
        return;
      }

      setStudents(studentRows);
      setTotalStudents(studentRows.length);

      if (studentRows.length > 0) {
        const usns = studentRows.map((s) => s.usn);

        // Use INNER JOIN if foreign key is set up, or just select related
        // Assuming student_activities has fk to activities
        const { data: actData, error: actErr } = await supabase
          .from('student_activities')
          .select(`
            usn, 
            points,
            activities!inner (
              is_sdg
            )
          `)
          .in('usn', usns);

        if (actErr) {
          console.error("Error fetching activities", actErr);
          setPointsMap({});
          setLoading(false);
          return;
        }

        const totals = {};
        let low = 0, med = 0, high = 0;
        let sdgCount = 0;
        let nonSdgCount = 0;

        // Count participations
        (actData || []).forEach(row => {
          // Point aggregation
          totals[row.usn] = (totals[row.usn] || 0) + (row.points || 0);

          // SDG Counting
          if (row.activities && row.activities.is_sdg) {
            sdgCount++;
          } else {
            nonSdgCount++;
          }
        });

        // Distribution & Average
        let grandTotal = 0;
        studentRows.forEach(student => {
          const p = totals[student.usn] || 0;
          grandTotal += p;
          if (p < 50) low++;
          else if (p < 100) med++;
          else high++;
        });

        setPointsMap(totals);
        setAvgPoints(studentRows.length ? Math.round(grandTotal / studentRows.length) : 0);
        setPointDist({ low, med, high });
        setSdgStats({ sdg: sdgCount, nonSdg: nonSdgCount });

      } else {
        setPointsMap({});
      }
      setLoading(false);
    }
    fetchCounsellorData();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Counsellor Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">Welcome,</span>
            <span className="text-slate-900 text-sm font-semibold">{user.email}</span>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Class Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Card 1: Total Students */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-slate-500 text-sm font-medium uppercase">Total Students</p>
            <p className="text-3xl font-bold text-indigo-600 mt-2">{totalStudents}</p>
          </div>

          {/* Card 2: Average Points */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-slate-500 text-sm font-medium uppercase">Avg. Class Score</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{avgPoints}</p>
          </div>

          {/* Card 3: Donut Chart (CSS) - Point Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <p className="text-slate-500 text-xs font-medium uppercase mb-2">Performance Bands</p>
            <div className="flex items-center gap-4">
              {/* Simple CSS Donut representation using Conic Gradient */}
              <div className="w-16 h-16 rounded-full flex-shrink-0" style={{
                background: `conic-gradient(
                    #ef4444 0% ${(pointDist.low / totalStudents) * 100}%, 
                    #f59e0b ${(pointDist.low / totalStudents) * 100}% ${((pointDist.low + pointDist.med) / totalStudents) * 100}%, 
                    #10b981 ${((pointDist.low + pointDist.med) / totalStudents) * 100}% 100%
                  )`
              }}></div>
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Low (&lt;50)</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Med (50-100)</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> High (100+)</div>
              </div>
            </div>
          </div>

          {/* Card 4: SDG Breakdown */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <p className="text-slate-500 text-xs font-medium uppercase mb-2">SDG Participation</p>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-blue-600">SDG Activities</span>
                  <span>{sdgStats.sdg}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(sdgStats.sdg / (sdgStats.sdg + sdgStats.nonSdg || 1)) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Other</span>
                  <span>{sdgStats.nonSdg}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1">
                  <div className="bg-slate-400 h-1.5 rounded-full" style={{ width: `${(sdgStats.nonSdg / (sdgStats.sdg + sdgStats.nonSdg || 1)) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <svg
                className="w-6 h-6 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Students Under Guidance
            </h2>
            {!loading && students.length > 0 && (
              <span className="text-sm text-slate-600 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm font-medium">
                Total: <span className="text-indigo-600 font-bold">{students.length}</span> students
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
                <p className="text-slate-500 font-medium">Loading students...</p>
              </div>
            </div>
          ) : students.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        USN
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Total Activity Points
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50 transition-colors duration-150 group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">{s.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600 font-mono font-medium">{s.usn}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100 shadow-sm">
                            {pointsMap[s.usn] || 0} points
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-sm text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            onClick={() => setSelectedStudent(s)}
                          >
                            View Activities
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-24 bg-white rounded-xl border border-dashed border-slate-300">
              <svg
                className="mx-auto h-16 w-16 text-slate-300 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-slate-600 text-lg font-medium mb-1">No students assigned yet</p>
              <p className="text-slate-500 text-sm">Students will appear here once they are assigned to you</p>
            </div>
          )}
        </section>
      </div>

      {selectedStudent && (
        <StudentActivitiesModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  );
}