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

  // Modal state for upcoming events
  const [selectedEvent, setSelectedEvent] = useState(null);

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
        .select('activity_id, points, excel_url, activities (title)')
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
      <div className="bg-slate-50 min-h-screen flex flex-col items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-700 text-lg font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">
                Student Dashboard
              </h1>
              <p className="text-slate-600 text-sm">Academic Activity Tracking System</p>
            </div>
            {loading && (
              <span className="flex items-center gap-2 text-indigo-600 text-sm font-medium">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></div>
                Syncing data...
              </span>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex-1">
                <p className="text-slate-500 text-xs uppercase tracking-wide font-semibold mb-2">Student Information</p>
                <p className="text-slate-900 text-lg font-semibold mb-1">{user.email}</p>
                {usn && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 text-sm">University Seat Number:</span>
                    <span className="text-slate-900 font-mono font-semibold text-sm">{usn}</span>
                  </div>
                )}
              </div>
              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-6 shadow-md min-w-[200px]">
                <p className="text-slate-300 text-xs uppercase tracking-wide font-semibold mb-2">Total Activity Points</p>
                <p className="text-5xl font-bold text-white">{totalPoints}</p>
                <p className="text-slate-400 text-xs mt-2">Cumulative Score</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Breakdown Section */}
        <section className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Completed Activities</h2>
              <p className="text-slate-600 text-sm mt-1">Detailed record of your approved activities and earned points</p>
            </div>
            <div className="p-6">
              {activities.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-4 text-left text-slate-700 font-bold text-xs uppercase tracking-wider">
                          Activity Name
                        </th>
                        <th className="px-6 py-4 text-left text-slate-700 font-bold text-xs uppercase tracking-wider">
                          Points Awarded
                        </th>
                        <th className="px-6 py-4 text-left text-slate-700 font-bold text-xs uppercase tracking-wider">
                          Supporting Documentation
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activities.map(a => (
                        <tr key={a.activity_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-slate-800 font-medium text-sm">
                            {a.activities?.title || a.activity_id}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-4 py-1.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {a.points} pts
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {a.excel_url ? (
                              a.excel_url.startsWith('http') ? (
                                <a
                                  href={a.excel_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors text-sm"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  View Document
                                </a>
                              ) : a.excel_url.startsWith('0x') && a.excel_url.length === 66 ? (
                                <a
                                  href={`https://amoy.polygonscan.com/tx/${a.excel_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors text-sm"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  View Blockchain Record
                                </a>
                              ) : (
                                <span className="text-slate-700 text-sm font-mono">{a.excel_url}</span>
                              )
                            ) : (
                              <span className="text-slate-400 text-sm italic">No documentation available</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16 bg-slate-50 rounded-lg">
                  <svg className="mx-auto h-16 w-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-slate-700 text-lg font-semibold mb-1">No Activities Recorded</p>
                  <p className="text-slate-500 text-sm">Your completed activities will be displayed here once they are registered</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Upcoming Events Section */}
        <section className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Upcoming Events & Opportunities</h2>
              <p className="text-slate-600 text-sm mt-1">Scheduled academic and extracurricular events</p>
            </div>
            <div className="p-6">
              {events.length > 0 ? (
                <div className="space-y-3">
                  {events.map(e => (
                    <div
                      key={e.id}
                      onClick={() => setSelectedEvent(e)}
                      className="flex items-center justify-between p-5 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-300 transition-all hover:shadow-sm cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 bg-indigo-500 rounded-full flex-shrink-0 group-hover:scale-125 transition-transform"></div>
                        <div>
                          <span className="text-slate-800 font-semibold text-base block">{e.title || e.name}</span>
                          <span className="text-xs text-indigo-600 font-medium">Click for details</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-mono font-semibold">{e.event_date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-slate-50 rounded-lg">
                  <svg className="mx-auto h-16 w-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-slate-700 text-lg font-semibold mb-1">No Upcoming Events</p>
                  <p className="text-slate-500 text-sm">New opportunities will be posted here as they become available</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Complaint Form Section */}
        <section>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl mx-auto">
            <div className="bg-amber-50 px-6 py-4 border-b border-amber-100">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Submit Event Complaint</h2>
                  <p className="text-slate-600 text-sm mt-1">Report discrepancies, issues, or concerns regarding registered events and activities</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleComplaintSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-slate-700 text-sm font-bold mb-2 uppercase tracking-wide">
                  Complaint Title *
                </label>
                <input
                  type="text"
                  value={complaintTitle}
                  onChange={e => setComplaintTitle(e.target.value)}
                  placeholder="Brief summary of the issue"
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 text-sm font-bold mb-2 uppercase tracking-wide">
                  Detailed Description *
                </label>
                <textarea
                  value={complaintText}
                  onChange={e => setComplaintText(e.target.value)}
                  placeholder="Provide comprehensive details about your complaint, including dates, circumstances, and any relevant information"
                  rows={5}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 text-sm font-bold mb-2 uppercase tracking-wide">
                  Related Activity *
                </label>
                <select
                  value={activityId}
                  onChange={e => setActivityId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  required
                >
                  <option value="">Select the activity this complaint pertains to</option>
                  {allActivities.map(act => (
                    <option key={act.activity_id} value={act.activity_id}>
                      {act.activity_id} — {act.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 text-sm font-bold mb-2 uppercase tracking-wide">
                  Supporting Evidence (Image) *
                </label>
                <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-6 hover:border-indigo-400 transition-colors">
                  <input
                    type="file"
                    onChange={e => setComplaintFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept="image/*"
                    required
                  />
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-slate-600 text-sm font-medium mb-1">
                      {complaintFile ? complaintFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-slate-400 text-xs">PNG, JPG, or JPEG (MAX. 10MB)</p>
                  </div>
                </div>
                {complaintFile && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    File selected: <span className="font-semibold">{complaintFile.name}</span>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-6 rounded-lg focus:outline-none focus:ring-4 focus:ring-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-base uppercase tracking-wide"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing Submission...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Submit Complaint for Review
                    </span>
                  )}
                </button>
                <p className="text-slate-500 text-xs text-center mt-3">
                  All complaints are reviewed by administrative staff within 2-3 business days
                </p>
              </div>
            </form>
          </div>
        </section>

        {selectedEvent && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedEvent(null)}>
            <div className="bg-white shadow-xl rounded-xl p-6 w-full max-w-lg border border-slate-200 relative animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200 text-xl"
              >
                ×
              </button>

              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 mb-1 pr-6">
                  {selectedEvent.title || selectedEvent.name}
                </h2>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-mono">{selectedEvent.event_date}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1">Activity Points</p>
                  <p className="text-2xl font-bold text-indigo-900">{selectedEvent.points} Points</p>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">Description</p>
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedEvent.description || 'No description provided for this event.'}
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors text-sm"
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