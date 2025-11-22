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
];;
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

  // Fetch adminId, activities, and related complaints
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

  // Opportunity+Activity creation
  async function handleOpSubmit(e) {
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

    // Refresh activities
    const { data: actRows2 } = await supabase
      .from('activities')
      .select('*')
      .eq('organized_by', adminId)
      .order('event_date');
    setActivities(actRows2 ?? []);
    setLoading(false);
  }

  // Approve complaint (write to chain and propagate hash)
  async function approveComplaint(complaint, points) {
    setVerifying(complaint.complaint_id);
    try {
      // Write to Polygon
      const hash = await writeToBlockchain(
        complaint.usn,
        complaint.activity_id,
        points,
        complaint.complaint_id,
        complaint.image_hash,
        complaint.title,
        complaint.description
      );

      // Update complaint with blockchain tx hash and status
      await supabase.from('complaints').update({
        status: 'approved',
        points,
        verified_by: adminId,
        hash,
      }).eq('complaint_id', complaint.complaint_id);

      // Insert into student_activities (hash as excel_url)
      await supabase.from('student_activities').insert({
        usn: complaint.usn,
        activity_id: complaint.activity_id,
        points,
        excel_url: hash, // this is the blockchain hash for proof
      });

      // Update student's total points
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
    <div className="bg-gray-900 min-h-screen text-green-200 px-6 py-8">
      <h1 className="text-2xl font-bold text-green-400 mb-4">Admin Dashboard</h1>
      <p className="mb-6 text-xl">
        <span className="text-gray-300">Welcome,</span>
        <span className="ml-1 text-green-300">{user.email}</span>
        {adminId && <span className="ml-4 text-green-400">Admin ID: {adminId}</span>}
      </p>

      <form onSubmit={handleOpSubmit} className="bg-gray-800 p-5 rounded-lg mb-10 border border-green-800 max-w-lg">
        <h2 className="text-lg font-bold text-green-300 mb-3">Create Opportunity + Activity</h2>
        <input
          className="w-full mb-2 p-2 rounded bg-gray-900 border text-green-200"
          placeholder="Title"
          required
          value={opForm.title}
          onChange={e => setOpForm(f => ({ ...f, title: e.target.value }))}
        />
        <textarea
          className="w-full mb-2 p-2 rounded bg-gray-900 border text-green-200"
          placeholder="Description"
          required
          value={opForm.description}
          onChange={e => setOpForm(f => ({ ...f, description: e.target.value }))}
        />
        <input
          className="w-full mb-2 p-2 rounded bg-gray-900 border text-green-200"
          type="number"
          min="1"
          placeholder="Points"
          required
          value={opForm.points}
          onChange={e => setOpForm(f => ({ ...f, points: e.target.value }))}
        />
        <input
          className="w-full mb-3 p-2 rounded bg-gray-900 border text-green-200"
          type="date"
          required
          value={opForm.event_date}
          onChange={e => setOpForm(f => ({ ...f, event_date: e.target.value }))}
        />
        <input
          className="w-full mb-3 p-2 rounded bg-gray-900 border text-green-200"
          type="url"
          placeholder="Google Sheets URL (public)"
          value={opForm.excel_url}
          onChange={e => setOpForm(f => ({ ...f, excel_url: e.target.value }))}
        />
        <button
          className="bg-green-400 hover:bg-green-300 text-gray-900 font-bold px-3 py-2 rounded"
          type="submit"
          disabled={loading || !adminId}
        >
          {loading ? 'Submitting...' : 'Create + Reflect'}
        </button>
      </form>

      <h2 className="font-bold text-green-300 mb-2 text-xl">Your Activities (Excel Verification)</h2>
      <table className="w-full bg-gray-800 rounded overflow-hidden mb-10">
        <thead>
          <tr className="bg-green-900">
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Event Date</th>
            <th className="px-3 py-2">Points</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Approved By</th>
            <th className="px-3 py-2">Excel</th>
          </tr>
        </thead>
        <tbody>
          {[...activities].reverse().map(a => (
            <tr key={a.activity_id} className="border-b border-gray-700">
              <td className="px-3 py-2">{a.title}</td>
              <td className="px-3 py-2">{a.event_date}</td>
              <td className="px-3 py-2">{a.points}</td>
              <td className="px-3 py-2">{a.status}</td>
              <td className="px-3 py-2">{a.approved_by || '-'}</td>
              <td className="px-3 py-2">
                {a.excel_url
                  ? a.excel_url.startsWith('http') ? (
                    <a href={a.excel_url} target="_blank" rel="noopener noreferrer" className="underline text-green-400">
                      Google Sheet Link
                    </a>
                  ) : a.excel_url.startsWith('0x') && a.excel_url.length === 66 ? (
                    <a href={`https://amoy.polygonscan.com/tx/${a.excel_url}`}
                      target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                      View Blockchain Tx
                    </a>
                  ) : (
                    <span className="text-green-300">{a.excel_url}</span>
                  )
                : 'Not uploaded'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="font-bold text-green-300 mb-2 text-xl">Complaints to Verify</h2>
      <table className="w-full bg-gray-800 rounded overflow-hidden mb-10">
        <thead>
          <tr className="bg-green-900">
            <th className="px-3 py-2">Student USN</th>
            <th className="px-3 py-2">Activity</th>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2">Proof</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {complaints.map((complaint) => (
            <tr key={complaint.complaint_id} className="border-b border-gray-700">
              <td className="px-3 py-2">{complaint.usn}</td>
              <td className="px-3 py-2">{complaint.activity_id}</td>
              <td className="px-3 py-2">{complaint.title}</td>
              <td className="px-3 py-2">{complaint.description}</td>
              <td className="px-3 py-2">
                <a href={`https://gateway.pinata.cloud/ipfs/${complaint.image_hash}`}
                  target="_blank" rel="noopener noreferrer" className="text-green-400 underline">
                  View Image
                </a>
              </td>
              <td className="px-3 py-2">{complaint.status}</td>
              <td className="px-3 py-2">
                {complaint.status === "pending" && (
                  <>
                    <input
                      type="number"
                      className="w-16 mr-2 bg-gray-900 border border-green-700 rounded text-green-200 px-2 py-1"
                      placeholder="Points"
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
                      className="bg-green-500 hover:bg-green-400 text-gray-900 px-3 py-1 rounded mr-2"
                      onClick={() => approveComplaint(complaint, Number(pointsInputs[complaint.complaint_id]))}
                    >
                      {verifying === complaint.complaint_id ? "Approving..." : "Approve"}
                    </button>
                    <button
                      disabled={verifying === complaint.complaint_id}
                      className="bg-red-500 hover:bg-red-400 text-gray-900 px-3 py-1 rounded"
                      onClick={() => rejectComplaint(complaint.complaint_id)}
                    >
                      {verifying === complaint.complaint_id ? "Rejecting..." : "Reject"}
                    </button>
                  </>
                )}
                {complaint.status === "approved" && (
                  <>
                    <span className="text-green-300">Approved</span>
                    <br />
                    <span className="text-xs">Hash: {complaint.hash}</span>
                  </>
                )}
                {complaint.status === "rejected" && (
                  <span className="text-red-400">Rejected</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
