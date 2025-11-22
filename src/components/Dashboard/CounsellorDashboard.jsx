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
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-900 shadow-xl rounded-lg p-7 min-w-[400px] border border-green-700 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-green-400 hover:text-green-200 text-xl">
          &times;
        </button>
        <h2 className="text-xl font-bold text-green-400 mb-2">
          Activities: {student.name} ({student.usn})
        </h2>
        {loading ? (
          <p className="text-green-300">Loading...</p>
        ) : activities.length > 0 ? (
          <table className="w-full bg-gray-800 rounded mb-2">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-green-300">Activity</th>
                <th className="px-3 py-2 text-left text-green-300">Points</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.activity_id} className="border-b border-gray-700">
                  <td className="px-3 py-2">{a.activities?.title || `Activity #${a.activity_id}`}</td>
                  <td className="px-3 py-2">{a.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-green-300">No activities yet.</p>
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

  useEffect(() => {
    async function fetchAllStudents() {
      setLoading(true);
      const { data: studentRows, error } = await supabase
        .from('students')
        .select('id, name, usn');
      if (error) {
        setStudents([]);
        setPointsMap({});
        setLoading(false);
        return;
      } else {
        setStudents(studentRows ?? []);
      }

      // Fetch all points for awarded activities by usn
      if (studentRows?.length > 0) {
        const usns = studentRows.map((s) => s.usn);
        const { data: actData, error: activityError } = await supabase
          .from('student_activities')
          .select('usn, points');
        if (activityError) {
          setPointsMap({});
        } else {
          const totals = {};
          usns.forEach((usn) => {
            totals[usn] = (actData ?? [])
              .filter((row) => row.usn === usn)
              .reduce((acc, r) => acc + r.points, 0);
          });
          setPointsMap(totals);
        }
      } else {
        setPointsMap({});
      }
      setLoading(false);
    }
    fetchAllStudents();
  }, []);

  return (
    <div className="bg-gray-900 min-h-screen text-green-200 px-6 py-8">
      <h1 className="text-2xl font-bold text-green-400 mb-4">Counsellor Dashboard</h1>
      <p className="mb-6 text-xl">
        <span className="text-gray-300">Welcome,</span>
        <span className="ml-1 text-green-300">{user.email}</span>
      </p>
      <section className="mb-6">
        <h2 className="font-bold text-green-300 text-lg mb-2">Students Under Guidance:</h2>
        {loading ? (
          <p className="text-green-300">Loading...</p>
        ) : students.length > 0 ? (
          <table className="w-full bg-gray-800 rounded overflow-hidden">
            <thead>
              <tr className="bg-green-900">
                <th className="px-3 py-2 text-left text-green-300">Name</th>
                <th className="px-3 py-2 text-left text-green-300">USN</th>
                <th className="px-3 py-2 text-left text-green-300">Total Activity Points</th>
                <th className="px-3 py-2 text-left text-green-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-gray-700 hover:bg-green-950 transition">
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2">{s.usn}</td>
                  <td className="px-3 py-2">{pointsMap[s.usn] || 0}</td>
                  <td className="px-3 py-2">
                    <button
                      className="bg-green-500 text-gray-900 px-3 py-1 rounded hover:bg-green-400"
                      onClick={() => setSelectedStudent(s)}
                    >
                      View Activities
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400">No students assigned yet.</p>
        )}
      </section>

      {selectedStudent && (
        <StudentActivitiesModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  );
}
