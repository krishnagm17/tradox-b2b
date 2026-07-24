import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import { supabase } from "../config/supabase";
import { toast } from "sonner";
import {
  Shield, CheckCircle2, XCircle, Clock, ArrowLeft,
  Building2, FileText, User, Download, Loader2, Search,
  Phone, Mail, Eye, Lock, Key, UserPlus, Trash2, RefreshCw
} from "lucide-react";
import Sidebar from "../components/Sidebar";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

export default function AdminKyb() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [activeTab, setActiveTab] = useState("Pending"); // Pending, Approved, Rejected
  const [searchQuery, setSearchQuery] = useState("");
  
  // Permissions state
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const [showPermModal, setShowPermModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");

  // Modals state
  const [previewDoc, setPreviewDoc] = useState(null); // URL of document
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      
      const [kybRes, permRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/kyb`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/admin/list`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (kybRes.ok) {
        const data = await kybRes.json();
        setSubmissions(data.data || []);
      }
      
      if (permRes.ok) {
        const data = await permRes.json();
        setAdminList(data.data || []);
        setIsAdmin(true);
        setIsOwner(data.role === "OWNER");
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error("Admin fetch error:", err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        fetchData();
      } else {
        navigate("/auth");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Realtime subscription for list
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase.channel('admin-kyb-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kyb_requests' }, () => {
        // Just refetch data to keep it simple and accurate
        fetchData();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [isAdmin]);

  const handleApprove = async (id) => {
    const toastId = toast.loading("Approving KYB...");
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/admin/kyb/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("KYB Approved successfully!", { id: toastId });
        fetchData();
      } else {
        throw new Error("Failed to approve");
      }
    } catch (err) {
      toast.error(err.message, { id: toastId });
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectReason) return;
    const toastId = toast.loading("Rejecting KYB...");
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/admin/kyb/${rejectingId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectReason })
      });
      if (res.ok) {
        toast.success("KYB Rejected successfully!", { id: toastId });
        setRejectingId(null);
        setRejectReason("");
        fetchData();
      } else {
        throw new Error("Failed to reject");
      }
    } catch (err) {
      toast.error(err.message, { id: toastId });
    }
  };

  const handleViewDoc = async (id) => {
    const toastId = toast.loading("Generating secure document link...");
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/admin/kyb/${id}/document`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewDoc(data.url);
        toast.dismiss(toastId);
      } else {
        throw new Error("Document not found");
      }
    } catch (err) {
      toast.error(err.message, { id: toastId });
    }
  };

  const handleGrantAdmin = async () => {
    if (!newAdminEmail) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/admin/grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: newAdminEmail })
      });
      if (res.ok) {
        toast.success("Admin granted successfully!");
        setNewAdminEmail("");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to grant admin");
      }
    } catch (err) {
      toast.error("Error granting admin");
    }
  };

  const handleRevokeAdmin = async (id) => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/admin/revoke/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Admin revoked successfully!");
        fetchData();
      } else {
        throw new Error("Failed to revoke");
      }
    } catch (err) {
      toast.error("Error revoking admin");
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-[#10B981]" /></div>;
  if (!isAdmin) return <div className="flex-1 flex items-center justify-center min-h-screen"><p className="text-xl text-red-600 font-bold">Unauthorized Access</p></div>;

  const filtered = submissions.filter(s => s.status === activeTab && 
    (s.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     s.user_email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans selection:bg-[#10B981]/20">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#0B1220] flex items-center gap-3">
                <Shield className="w-8 h-8 text-[#10B981]" />
                KYB Verifications
              </h1>
              <p className="text-slate-500 mt-1">Review and manage business verifications for TradoxB2B.</p>
            </div>
            {isOwner && (
              <button onClick={() => setShowPermModal(true)} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition">
                <Key className="w-4 h-4" /> Manage Permissions
              </button>
            )}
          </div>

          {/* Stats & Search */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex w-full sm:w-auto gap-2 p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {["Pending", "Approved", "Rejected"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search company or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981]"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Company Details</th>
                  <th className="p-4">Contact Person</th>
                  <th className="p-4">Submitted At</th>
                  <th className="p-4">Document</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-[#10B981]" />
                        </div>
                        <div>
                          <p className="font-bold text-[#0B1220]">{sub.company_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">{sub.gst_number || "NO GST"}</span>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">{sub.iec_number || "NO IEC"}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-900">{sub.user_name}</p>
                      <p className="text-sm text-slate-500">{sub.user_email}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-700">{new Date(sub.submitted_at).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4">
                      <button onClick={() => handleViewDoc(sub.id)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-bold">
                        <FileText className="w-4 h-4" /> View Doc
                      </button>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {activeTab === "Pending" && (
                        <>
                          <button onClick={() => handleApprove(sub.id)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-bold text-sm transition">Approve</button>
                          <button onClick={() => setRejectingId(sub.id)} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-bold text-sm transition">Reject</button>
                        </>
                      )}
                      {activeTab === "Approved" && <span className="text-emerald-600 font-bold flex justify-end gap-1"><CheckCircle2 className="w-5 h-5"/> Approved</span>}
                      {activeTab === "Rejected" && <span className="text-red-600 font-bold flex justify-end gap-1"><XCircle className="w-5 h-5"/> Rejected</span>}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">
                      No {activeTab.toLowerCase()} submissions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Permissions Modal */}
      {showPermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Key className="w-5 h-5 text-indigo-600"/> Admin Permissions</h2>
            <div className="flex gap-2 mb-6">
              <input 
                type="email" 
                placeholder="New admin email..." 
                value={newAdminEmail}
                onChange={e => setNewAdminEmail(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-xl"
              />
              <button onClick={handleGrantAdmin} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Add</button>
            </div>
            <div className="space-y-2">
              {adminList.map(a => (
                <div key={a.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-bold">{a.email}</p>
                    <p className="text-xs text-slate-500">Role: {a.role}</p>
                  </div>
                  {a.role !== "OWNER" && (
                    <button onClick={() => handleRevokeAdmin(a.id)} className="text-red-600 hover:bg-red-100 p-2 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setShowPermModal(false)} className="mt-6 w-full py-2 bg-slate-100 text-slate-800 rounded-xl font-bold hover:bg-slate-200">Close</button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4 text-red-600">Reject Verification</h2>
            <textarea 
              placeholder="Provide a reason for rejection..." 
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full h-32 px-4 py-3 border rounded-xl mb-4"
            ></textarea>
            <div className="flex gap-3">
              <button onClick={() => setRejectingId(null)} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl text-slate-700">Cancel</button>
              <button onClick={handleReject} className="flex-1 py-3 bg-red-600 font-bold rounded-xl text-white">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-sm">
          <div className="flex justify-end p-4">
            <button onClick={() => setPreviewDoc(null)} className="text-white hover:bg-white/20 p-2 rounded-full"><XCircle className="w-8 h-8" /></button>
          </div>
          <div className="flex-1 p-4 flex justify-center">
            {previewDoc.toLowerCase().includes(".pdf") || previewDoc.includes("token=") ? (
              <iframe src={previewDoc} className="w-full max-w-5xl h-full bg-white rounded-xl"></iframe>
            ) : (
              <img src={previewDoc} alt="Document" className="max-w-5xl h-auto object-contain rounded-xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
