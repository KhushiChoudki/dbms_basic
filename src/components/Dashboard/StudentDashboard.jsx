import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';

// Pinata JWT (replace as needed)
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjM2RhZmM0NS01NWI3LTRkMjktODIyNS04OGVhNGE3ZmNjMmQiLCJlbWFpbCI6ImtodXNoaWNob3Vka2kuaXMyM0BydmNlLmVkdS5pbiIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiIzOWY4NzFjNTEzMmM4YjMyZDBmZSIsInNjb3BlZEtleVNlY3JldCI6IjUyMTBkNmMyNWMwYjllNjE3MjlhMjJhMzBlNzdjMDMwMjhkMWM4Nzg0Mzc0YTQ3YmZkYTg1YmU2NjlmMGRjOTgiLCJleHAiOjE3OTQ4NTk2MDF9.g_8_0W5csB_YvsqA_U4diGEH1IlhH691NpA8dLZBoI0";

export default function StudentDashboard({ user }) {
  const [usn, setUsn] = useState(() =>
    sessionStorage.getItem('student_usn') || user.usn || null
  );
  const [initialLoading, setInitialLoading] = useState(!usn);
  const [loading, setLoading] = useState(false);

  const [points, setPoints] = useState(0);
  const [activities, setActivities] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [events, setEvents] = useState([]);

  // Complaint form states
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintText, setComplaintText] = useState('');
  const [complaintFile, setComplaintFile] = useState(null);
  const [activityId, setActivityId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // All activities for dropdown
  const [allActivities, setAllActivities] = useState([]);

  useEffect(() => {
    if (usn) {
      sessionStorage.setItem('student_usn', usn);
      setInitialLoading(false);
      return;
    }
    async function fetchUsnOnce() {
      try {
        const { data } = await supabase
          .from('students')
          .select('usn')
          .eq('email', user.email)
          .single();
        if (data?.usn) {
          setUsn(data.usn);
          sessionStorage.setItem('student_usn', data.usn);
        }
      } finally {
        setInitialLoading(false);
      }
    }
    fetchUsnOnce();
  }, [user.email, usn]);

  // Fetch activities (dropdown)
  useEffect(() => {
    async function fetchAllActivities() {
      const { data, error } = await supabase
        .from('activities')
        .select('activity_id, title');
      if (!error && data) setAllActivities(data);
    }
    fetchAllActivities();
  }, []);

  // Fetch student_activities, sum points
  async function fetchData() {
    if (!usn) return;
    setLoading(true);
    try {
      const { data: acts } = await supabase
        .from('student_activities')
        .select('activity_id, points, excel_url')
        .eq('usn', usn);
      const actsList = acts ?? [];
      const total = actsList.reduce((sum, a) => sum + (a.points || 0), 0);
      setActivities(actsList);
      setPoints(total);
      setTotalPoints(total);
      await supabase.from('students').update({ total_points: total }).eq('usn', usn);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!usn) return;
    fetchData();
    function handleVisibilityChange() {
      if (!document.hidden) fetchData();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [usn]);

  useEffect(() => {
    async function fetchEvents() {
      const today = new Date().toISOString().split('T')[0];
      try {
        const { data: opps } = await supabase
          .from('opportunities')
          .select('*')
          .gte('event_date', today)
          .order('event_date');
        setEvents(opps ?? []);
      } catch {
        setEvents([]);
      }
    }
    fetchEvents();
  }, []);

  async function uploadFileToPinata(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload to Pinata");
    const data = await res.json();
    return data.IpfsHash;
  }

  async function handleComplaintSubmit(e) {
    e.preventDefault();
    if (!complaintFile || !complaintText || !complaintTitle || !activityId) {
      alert('Please enter title, description, select an image, and select activity.');
      return;
    }
    setIsSubmitting(true);
    try {
      const complaint_id = crypto.randomUUID();
      const ipfsHash = await uploadFileToPinata(complaintFile);
      await supabase.from('complaints').insert({
        complaint_id,
        usn,
        activity_id: activityId,
        title: complaintTitle,
        description: complaintText,
        image_hash: ipfsHash,
        status: 'pending',
        email: user.email
      });
      alert('Complaint submitted for admin verification!');
      setComplaintText('');
      setComplaintTitle('');
      setComplaintFile(null);
      setActivityId('');
    } catch (err) {
      alert(`Complaint submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="bg-gray-900 min-h-screen text-green-400 flex flex-col items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen text-green-200 px-6 py-8">
      {loading && <p className="text-green-400 text-sm mb-2">Updating data...</p>}
      <h1 className="text-2xl font-bold text-green-500 mb-4">Student Dashboard</h1>
      <p className="mb-2">
        <span className="text-gray-300">Welcome,</span>
        <span className="ml-1 text-green-300">{user.email}</span>
        {usn && <span className="ml-4 text-green-400">USN: {usn}</span>}
      </p>
      <p className="mb-6 text-xl">
        Total Activity Points:{' '}
        <span className="font-extrabold text-green-400">{totalPoints}</span>
      </p>
      <section className="mb-6">
        <h2 className="font-bold text-green-300 text-lg mb-2">Activity Breakdown:</h2>
        {activities.length > 0 ? (
          <table className="w-full bg-gray-800 rounded overflow-hidden">
            <thead>
              <tr className="bg-green-900">
                <th className="px-3 py-2 text-left text-green-300">Activity ID</th>
                <th className="px-3 py-2 text-left text-green-300">Points</th>
                <th className="px-3 py-2 text-left text-green-300">Excel / Proof Link</th>
              </tr>
            </thead>
            <tbody>
              {activities.map(a => (
                <tr key={a.activity_id} className="border-b border-gray-700">
                  <td className="px-3 py-2">{a.activity_id}</td>
                  <td className="px-3 py-2">{a.points}</td>
                  <td className="px-3 py-2">
                    {a.excel_url ? (
                      a.excel_url.startsWith('http') ? (
                        <a
                          href={a.excel_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 underline"
                        >
                          Excel
                        </a>
                      ) : a.excel_url.startsWith('0x') && a.excel_url.length === 66 ? (
                        <a
                          href={`https://amoy.polygonscan.com/tx/${a.excel_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 underline"
                        >
                          View Blockchain Tx
                        </a>
                      ) : (
                        <span className="text-green-300">{a.excel_url}</span>
                      )
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400">No activities yet.</p>
        )}
      </section>
      <section className="mb-6">
        <h2 className="font-bold text-green-300 text-lg mb-2">Upcoming Events:</h2>
        {events.length > 0 ? (
          <ul>
            {events.map(e => (
              <li key={e.id} className="mb-1">
                <span className="text-green-400">{e.title || e.name}</span>
                <span className="ml-2 text-gray-200">— {e.event_date}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">No upcoming events at the moment.</p>
        )}
      </section>
      <form
        onSubmit={handleComplaintSubmit}
        className="bg-gray-800 border border-green-800 rounded p-4 max-w-xl mx-auto"
      >
        <h2 className="font-bold text-green-300 mb-2">Submit Event Complaint:</h2>
        <input
          type="text"
          value={complaintTitle}
          onChange={e => setComplaintTitle(e.target.value)}
          placeholder="Complaint Title"
          className="block w-full mb-2 border border-green-700 bg-gray-900 text-green-100 p-2 rounded"
          required
        />
        <textarea
          value={complaintText}
          onChange={e => setComplaintText(e.target.value)}
          placeholder="Describe your complaint/event issue"
          className="block w-full mb-2 border border-green-700 bg-gray-900 text-green-100 p-2 rounded"
          required
        />
        <select
          value={activityId}
          onChange={e => setActivityId(e.target.value)}
          className="block w-full mb-2 border border-green-700 bg-gray-900 text-green-100 p-2 rounded"
          required
        >
          <option value="">Select Activity</option>
          {allActivities.map(act => (
            <option key={act.activity_id} value={act.activity_id}>
              {act.activity_id} ({act.title})
            </option>
          ))}
        </select>
        <input
          type="file"
          onChange={e => setComplaintFile(e.target.files[0])}
          className="block mb-4 text-green-400"
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-green-500 text-gray-800 px-4 py-2 rounded hover:bg-green-400 transition"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
        </button>
      </form>
    </div>
  );
}
