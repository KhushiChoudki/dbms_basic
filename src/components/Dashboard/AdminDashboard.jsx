import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = "0x4392c7cec90b3c2433520e5d0edd4d905a28a06a";
const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "usn",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "activityId",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "points",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "complaintId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "imageHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description",
        "type": "string"
      }
    ],
    "name": "approveComplaint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "usn",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "activityId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "points",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "complaintId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "imageHash",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "verifiedBy",
        "type": "address"
      }
    ],
    "name": "ComplaintApproved",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "complaints",
    "outputs": [
      {
        "internalType": "string",
        "name": "usn",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "activityId",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "points",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "complaintId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "imageHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "verifiedBy",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "complaintId",
        "type": "string"
      }
    ],
    "name": "getComplaint",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "usn",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "activityId",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "points",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "complaintId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "imageHash",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "description",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "verifiedBy",
            "type": "address"
          }
        ],
        "internalType": "struct ComplaintVerifier.Complaint",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
const ADMIN_PRIVATE_KEY = "43d36ec4762c36a83548883dbb8623fe234137dcca3a83fcb60ab73ed0f23534";
const RPC_URL = "https://rpc-amoy.polygon.technology/";

async function writeToBlockchain(usn, activityId, points, complaintId, imageHash, title, description) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
  const tx = await contract.approveComplaint(
    usn,
    activityId,
    points,
    complaintId,
    imageHash,
    title,
    description
  );
  const receipt = await tx.wait();
  return receipt.hash;
}

export default function AdminDashboard({ user }) {
  const [adminId, setAdminId] = useState(null);
  const [opForm, setOpForm] = useState({
    title: '',
    description: '',
    points: '',
    event_date: '',
    excel_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [verifying, setVerifying] = useState(null);
  const [pointsInputs, setPointsInputs] = useState({});

  useEffect(() => {
    async function fetchAdminIdAndActivities() {
      const { data: adminRow } = await supabase
        .from('admins')
        .select('admin_id')
        .eq('id', user.id)
        .single();
      const foundAdminId = adminRow?.admin_id;
      setAdminId(foundAdminId || null);

      if (foundAdminId) {
        const { data: actRows } = await supabase
          .from('activities')
          .select('*')
          .eq('organized_by', foundAdminId)
          .order('event_date');
        setActivities(actRows ?? []);

        const activityIds = (actRows ?? []).map(a => a.activity_id);
        if (activityIds.length > 0) {
          const { data: compRows } = await supabase
            .from('complaints')
            .select('*')
            .in('activity_id', activityIds)
            .order('status', { ascending: true });
          setComplaints(compRows ?? []);
        } else {
          setComplaints([]);
        }
      } else {
        setActivities([]);
        setComplaints([]);
      }
    }
    fetchAdminIdAndActivities();
  }, [user.id]);

  const handleOpSubmit = async (e) => {
    e.preventDefault();
    if (!adminId) return alert('Admin identity error. Please login again.');
    setLoading(true);
    const id = uuidv4();

    const { error: oppError } = await supabase.from('opportunities').insert([
      {
        id,
        title: opForm.title,
        description: opForm.description,
        organizer_admin_id: adminId,
        points: Number(opForm.points),
        event_date: opForm.event_date,
      },
    ]);

    const { error: actError } = await supabase.from('activities').insert([
      {
        activity_id: id,
        title: opForm.title,
        description: opForm.description,
        points: Number(opForm.points),
        organized_by: adminId,
        status: 'Pending',
        approved_by: null,
        event_date: opForm.event_date,
        excel_url: opForm.excel_url || null,
      },
    ]);

    if (oppError || actError) {
      alert(
        'Error creating opportunity/activity:\n' +
        (oppError?.message || '') +
        '\n' +
        (actError?.message || '')
      );
    } else {
      alert('Created and reflected in activities!');
    }

    setOpForm({ title: '', description: '', points: '', event_date: '', excel_url: '' });

    const { data: actRows2 } = await supabase
      .from('activities')
      .select('*')
      .eq('organized_by', adminId)
      .order('event_date');
    setActivities(actRows2 ?? []);
    setLoading(false);
  };

  async function approveComplaint(complaint, points) {
    setVerifying(complaint.complaint_id);
    try {
      const hash = await writeToBlockchain(
        complaint.usn,
        complaint.activity_id,
        points,
        complaint.complaint_id,
        complaint.image_hash,
        complaint.title,
        complaint.description
      );

      await supabase.from('complaints').update({
        status: 'approved',
        points,
        verified_by: adminId,
        hash,
      }).eq('complaint_id', complaint.complaint_id);

      await supabase.from('student_activities').insert({
        usn: complaint.usn,
        activity_id: complaint.activity_id,
        points,
        excel_url: hash,
      });

      await supabase.rpc('increment_student_total_points', { add_points: points, student_usn: complaint.usn });

      alert('Complaint approved, blockchain tx recorded!');
      setComplaints(
        complaints.map(c =>
          c.complaint_id === complaint.complaint_id
            ? { ...c, status: 'approved', points, verified_by: adminId, hash }
            : c
        )
      );
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    }
    setVerifying(null);
    setPointsInputs((curr) => ({ ...curr, [complaint.complaint_id]: '' }));
  }

  async function rejectComplaint(complaint_id) {
    setVerifying(complaint_id);
    try {
      await supabase.from('complaints').update({ status: "rejected" }).eq('complaint_id', complaint_id);
      alert('Complaint rejected.');
      setComplaints(complaints.map(c =>
        c.complaint_id === complaint_id
          ? { ...c, status: 'rejected' }
          : c
      ));
    } catch (err) {
      alert(`Rejection failed: ${err.message}`);
    }
    setVerifying(null);
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-10 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3 text-slate-900">Admin Dashboard</h1>
          <p className="text-lg text-slate-600">
            <span>Welcome, </span>
            <span className="font-semibold text-slate-900">{user.email}</span>
            {adminId && <span className="ml-4 font-medium text-slate-500">Admin ID: {adminId}</span>}
          </p>
        </div>

        {/* Create Form */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mb-12 max-w-2xl">
          <h2 className="text-2xl font-bold mb-6 text-slate-800">Create Opportunity + Activity</h2>
          <div>
            <input
              className="w-full mb-4 px-4 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Title"
              required
              value={opForm.title}
              onChange={e => setOpForm(f => ({ ...f, title: e.target.value }))}
            />
            <textarea
              className="w-full mb-4 px-4 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm min-h-[100px]"
              placeholder="Description"
              required
              value={opForm.description}
              onChange={e => setOpForm(f => ({ ...f, description: e.target.value }))}
            />
            <input
              className="w-full mb-4 px-4 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              type="number"
              min="1"
              placeholder="Points"
              required
              value={opForm.points}
              onChange={e => setOpForm(f => ({ ...f, points: e.target.value }))}
            />
            <input
              className="w-full mb-4 px-4 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              type="date"
              required
              value={opForm.event_date}
              onChange={e => setOpForm(f => ({ ...f, event_date: e.target.value }))}
            />
            <input
              className="w-full mb-6 px-4 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              type="url"
              placeholder="Google Sheets URL (public)"
              value={opForm.excel_url}
              onChange={e => setOpForm(f => ({ ...f, excel_url: e.target.value }))}
            />
            <button
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              onClick={handleOpSubmit}
              disabled={loading || !adminId}
            >
              {loading ? 'Submitting...' : 'Create + Reflect'}
            </button>
          </div>
        </div>

        {/* Activities Table */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-slate-800">Your Activities (Excel Verification)</h2>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full bg-white text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Event Date</th>
                    <th className="px-6 py-3">Points</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Approved By</th>
                    <th className="px-6 py-3">Excel/Blockchain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {[...activities].reverse().map((a) => (
                    <tr key={a.activity_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{a.title}</td>
                      <td className="px-6 py-4">{a.event_date}</td>
                      <td className="px-6 py-4">{a.points}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${a.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{a.approved_by || '-'}</td>
                      <td className="px-6 py-4">
                        {a.excel_url
                          ? a.excel_url.startsWith('http') ? (
                            <a href={a.excel_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900 hover:underline">
                              Google Sheet Link
                            </a>
                          ) : a.excel_url.startsWith('0x') && a.excel_url.length === 66 ? (
                            <a href={`https://amoy.polygonscan.com/tx/${a.excel_url}`}
                              target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900 hover:underline">
                              View Blockchain Tx
                            </a>
                          ) : (
                            <span>{a.excel_url}</span>
                          )
                          : <span className="text-slate-400">Not uploaded</span>}
                      </td>
                    </tr>
                  ))}
                  {activities.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-slate-500">No activities found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-slate-800">Complaints to Verify</h2>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full bg-white text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Student USN</th>
                    <th className="px-6 py-3">Activity</th>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Proof</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {complaints.map((complaint) => (
                    <tr key={complaint.complaint_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs">{complaint.usn}</td>
                      <td className="px-6 py-4">{complaint.activity_id}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{complaint.title}</td>
                      <td className="px-6 py-4 max-w-xs truncate" title={complaint.description}>{complaint.description}</td>
                      <td className="px-6 py-4">
                        <a href={`https://gateway.pinata.cloud/ipfs/${complaint.image_hash}`}
                          target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900 hover:underline">
                          View Image
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${complaint.status === 'approved' ? 'bg-green-100 text-green-800' :
                            complaint.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {complaint.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {complaint.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              className="w-20 px-2 py-1 border border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                              placeholder="Pts"
                              value={pointsInputs[complaint.complaint_id] || ''}
                              onChange={e =>
                                setPointsInputs((curr) => ({
                                  ...curr,
                                  [complaint.complaint_id]: e.target.value,
                                }))
                              }
                            />
                            <button
                              disabled={verifying === complaint.complaint_id || !pointsInputs[complaint.complaint_id]}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                              onClick={() => approveComplaint(complaint, Number(pointsInputs[complaint.complaint_id]))}
                            >
                              {verifying === complaint.complaint_id ? "..." : "Approve"}
                            </button>
                            <button
                              disabled={verifying === complaint.complaint_id}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                              onClick={() => rejectComplaint(complaint.complaint_id)}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {complaint.status === "approved" && (
                          <div className="text-xs">
                            <div className="font-semibold text-green-700">Done</div>
                            <div className="text-slate-400 truncate w-24" title={complaint.hash}>Tx: {complaint.hash}</div>
                          </div>
                        )}
                        {complaint.status === "rejected" && (
                          <span className="font-semibold text-red-700 text-xs">Rejected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {complaints.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-500">No complaints found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}