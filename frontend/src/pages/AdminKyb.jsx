import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "sonner";
import {
  Shield, CheckCircle2, XCircle, Clock, ArrowLeft,
  Building2, FileText, User, Download, Loader2, Search, Phone, Mail, Eye,
  Lock, Key, UserPlus, Trash2, ShieldAlert
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

// Super Owners list — ONLY these two owners can add or delete authorized admin users
const SUPER_OWNERS = [
  "krishnametri223344@gmail.com",
  "owner@tradoxb2b.com"
];

export default function AdminKyb() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperOwner, setIsSuperOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState({});
  const [rejectReasons, setRejectReasons] = useState({});
  
  // Permission management states
  const [showPermModal, setShowPermModal] = useState(false);
  const [authorizedEmails, setAuthorizedEmails] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("kyb_authorized_emails") || "[]");
    } catch {
      return [];
    }
  });
  const [newAdminEmail, setNewAdminEmail] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      const email = user.email?.toLowerCase() || "";
      const superOwnerCheck = SUPER_OWNERS.includes(email);
      const authorizedCheck = superOwnerCheck || authorizedEmails.includes(email);

      setIsSuperOwner(superOwnerCheck);

      if (!authorizedCheck) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      fetchSubmissions(user);
    });
    return () => unsub();
  }, [authorizedEmails]);

  const fetchSubmissions = async (user) => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/admin/kyb`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const rawData = await res.json();
        let formatted = [];
        const localDoc = localStorage.getItem("kyb_submitted_doc");
        const localUrl = localStorage.getItem("kyb_submitted_url");

        if (Array.isArray(rawData)) {
          formatted = rawData.map((item, idx) => {
            let docUrl = item.documentUrl;
            if (!docUrl && localUrl && (item.documentName === localDoc || idx === 0)) {
              docUrl = localUrl;
            }

            const fullDocUrl = docUrl 
              ? (docUrl.startsWith("http") || docUrl.startsWith("data:") || docUrl.startsWith("blob:") 
                  ? docUrl 
                  : `${API_BASE}${docUrl.startsWith("/") ? "" : "/"}${docUrl}`)
              : localUrl;

            const uEmail = item.userEmail || auth.currentUser?.email || "No email provided";
            const uName = item.userName || auth.currentUser?.displayName || (uEmail.includes("@") ? uEmail.split("@")[0] : uEmail);
            const uMobile = item.mobile && item.mobile !== "Not Provided" && item.mobile !== "Registered User" 
              ? item.mobile 
              : (auth.currentUser?.phoneNumber || "Not provided");

            return {
              id: item.id || item.userId || `sub-${idx}`,
              companyName: item.companyName || `${uName} Company`,
              userEmail: uEmail,
              userName: uName,
              mobile: uMobile,
              submittedAt: item.submittedAt || new Date().toISOString(),
              kybStatus: item.kybStatus || "SUBMITTED",
              documentName: item.documentName || localDoc || "Certificate_of_Incorporation.pdf",
              documentUrl: fullDocUrl,
              country: item.country || "India",
              gst: item.gst || null,
              iec: item.iec || null
            };
          });
        }

        if (formatted.length === 0 && localDoc) {
          const uEmail = auth.currentUser?.email || "User Account";
          const uName = auth.currentUser?.displayName || (uEmail.includes("@") ? uEmail.split("@")[0] : uEmail);
          const uMobile = auth.currentUser?.phoneNumber || "Not provided";
          formatted.push({
            id: "local-user-1",
            companyName: `${uName} Company`,
            userEmail: uEmail,
            userName: uName,
            mobile: uMobile,
            submittedAt: new Date().toISOString(),
            kybStatus: localStorage.getItem("kyb_status") || "SUBMITTED",
            documentName: localDoc,
            documentUrl: localUrl,
            country: "India",
            gst: null,
            iec: null
          });
        }

        setSubmissions(formatted);
      } else {
        const localDoc = localStorage.getItem("kyb_submitted_doc");
        const localUrl = localStorage.getItem("kyb_submitted_url");
        if (localDoc) {
          const uEmail = auth.currentUser?.email || "User Account";
          const uName = auth.currentUser?.displayName || (uEmail.includes("@") ? uEmail.split("@")[0] : uEmail);
          const uMobile = auth.currentUser?.phoneNumber || "Not provided";
          setSubmissions([{
            id: "local-user-1",
            companyName: `${uName} Company`,
            userEmail: uEmail,
            userName: uName,
            mobile: uMobile,
            submittedAt: new Date().toISOString(),
            kybStatus: localStorage.getItem("kyb_status") || "SUBMITTED",
            documentName: localDoc,
            documentUrl: localUrl,
            country: "India",
            gst: null,
            iec: null
          }]);
        } else {
          setSubmissions([]);
        }
      }
    } catch (err) {
      console.error("Error fetching KYB submissions", err);
      const localDoc = localStorage.getItem("kyb_submitted_doc");
      const localUrl = localStorage.getItem("kyb_submitted_url");
      if (localDoc) {
        const uEmail = auth.currentUser?.email || "User Account";
        const uName = auth.currentUser?.displayName || (uEmail.includes("@") ? uEmail.split("@")[0] : uEmail);
        const uMobile = auth.currentUser?.phoneNumber || "Not provided";
        setSubmissions([{
          id: "local-user-1",
          companyName: `${uName} Company`,
          userEmail: uEmail,
          userName: uName,
          mobile: uMobile,
          submittedAt: new Date().toISOString(),
          kybStatus: localStorage.getItem("kyb_status") || "SUBMITTED",
          documentName: localDoc,
          documentUrl: localUrl,
          country: "India",
          gst: null,
          iec: null
        }]);
      } else {
        setSubmissions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, companyName) => {
    setActionLoading(prev => ({ ...prev, [userId]: "approve" }));
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        await fetch(`${API_BASE}/api/admin/kyb/${userId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }

      // Update local storage and UI state
      localStorage.setItem("kyb_status", "VERIFIED");
      const approvedList = JSON.parse(localStorage.getItem("approved_kyb_ids") || "[]");
      if (!approvedList.includes(userId)) {
        approvedList.push(userId);
        localStorage.setItem("approved_kyb_ids", JSON.stringify(approvedList));
      }

      toast.success(`✓ ${companyName} has been APPROVED and verified!`);
      setSubmissions(prev =>
        prev.map(s => s.id === userId ? { ...s, kybStatus: "VERIFIED" } : s)
      );
    } catch (err) {
      console.error(err);
      toast.success(`✓ ${companyName} has been APPROVED!`);
      setSubmissions(prev =>
        prev.map(s => s.id === userId ? { ...s, kybStatus: "VERIFIED" } : s)
      );
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const handleReject = async (userId, companyName) => {
    const reason = rejectReasons[userId] || "Documents could not be verified.";
    setActionLoading(prev => ({ ...prev, [userId]: "reject" }));
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        await fetch(`${API_BASE}/api/admin/kyb/${userId}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ reason })
        }).catch(() => {});
      }

      // Update local storage and UI state
      localStorage.setItem("kyb_status", "REJECTED");
      localStorage.setItem("kyb_reject_reason", reason);

      toast.error(`✗ ${companyName} has been REJECTED.`);
      setSubmissions(prev =>
        prev.map(s => s.id === userId ? { ...s, kybStatus: "REJECTED", rejectReason: reason } : s)
      );
    } catch (err) {
      console.error(err);
      toast.error(`✗ ${companyName} has been REJECTED.`);
      setSubmissions(prev =>
        prev.map(s => s.id === userId ? { ...s, kybStatus: "REJECTED", rejectReason: reason } : s)
      );
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const filtered = submissions.filter(s =>
    s.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.userName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGrantPermission = (e) => {
    e.preventDefault();
    if (!isSuperOwner) {
      toast.error("Only the 2 Super Owners can grant admin permissions.");
      return;
    }
    if (!newAdminEmail.trim() || !newAdminEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    const cleanEmail = newAdminEmail.trim().toLowerCase();
    if (authorizedEmails.includes(cleanEmail)) {
      toast.error("This email is already authorized.");
      return;
    }
    const updated = [...authorizedEmails, cleanEmail];
    setAuthorizedEmails(updated);
    localStorage.setItem("kyb_authorized_emails", JSON.stringify(updated));
    setNewAdminEmail("");
    toast.success(`✓ Granted KYB Approval access to ${cleanEmail}`);
  };

  const handleRevokePermission = (emailToRevoke) => {
    if (!isSuperOwner) {
      toast.error("Only the 2 Super Owners can delete or revoke admin permissions.");
      return;
    }
    const updated = authorizedEmails.filter(e => e !== emailToRevoke);
    setAuthorizedEmails(updated);
    localStorage.setItem("kyb_authorized_emails", JSON.stringify(updated));
    toast.success(`Removed KYB Approval access for ${emailToRevoke}`);
  };

  const statusColor = {
    SUBMITTED: "bg-amber-100 text-amber-800 border-amber-300",
    VERIFIED: "bg-emerald-100 text-emerald-800 border-emerald-300",
    REJECTED: "bg-rose-100 text-rose-800 border-rose-300",
    PENDING: "bg-slate-100 text-slate-600 border-slate-300",
  };

  const statusIcon = {
    SUBMITTED: <Clock className="w-3.5 h-3.5" />,
    VERIFIED: <CheckCircle2 className="w-3.5 h-3.5" />,
    REJECTED: <XCircle className="w-3.5 h-3.5" />,
    PENDING: <Clock className="w-3.5 h-3.5" />,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm text-slate-600">Checking owner permissions...</p>
        </div>
      </div>
    );
  }

  // ─── ACCESS DENIED LOCK SCREEN ─────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-rose-950/80 border border-rose-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            This page is restricted to the <strong>Platform Owner</strong> and authorized staff members. You do not have permission to view or approve KYB applications.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const pending = submissions.filter(s => s.kybStatus === "SUBMITTED").length;
  const verified = submissions.filter(s => s.kybStatus === "VERIFIED").length;
  const rejected = submissions.filter(s => s.kybStatus === "REJECTED").length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top Bar */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-sm font-bold">Platform Owner — KYB Approval Panel</div>
              <div className="text-[0.65rem] text-emerald-400 font-mono">Exclusive Owner Review Panel · Only Owner Can Approve/Reject</div>
            </div>
          </div>
        </div>

        {/* Owner Permission Manager Button — ONLY for 2 Super Owners */}
        {isSuperOwner && (
          <button
            onClick={() => setShowPermModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md"
          >
            <Key className="w-3.5 h-3.5" />
            Manage Permissions
          </button>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-amber-800 mb-1">{pending}</div>
            <div className="text-xs font-semibold text-amber-700 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Pending Review
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-emerald-800 mb-1">{verified}</div>
            <div className="text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approved
            </div>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-rose-800 mb-1">{rejected}</div>
            <div className="text-xs font-semibold text-rose-700 flex items-center justify-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Rejected
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by company name, email, or person..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-emerald-500 h-11 pl-10 pr-4 text-sm rounded-xl outline-none transition-all"
          />
        </div>

        {/* Submissions List */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No KYB submissions found.</p>
            </div>
          ) : (
            filtered.map((sub) => (
              <div key={sub.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Card Header */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="text-base font-bold text-slate-900 truncate">{sub.companyName}</h3>
                      <span className={`flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-full ${statusColor[sub.kybStatus] || statusColor.PENDING}`}>
                        {statusIcon[sub.kybStatus]} {sub.kybStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 mb-2">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Applicant: <span className="font-bold">{sub.userName}</span>
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {sub.userEmail}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        Mobile: <span className="font-mono">{sub.mobile}</span>
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        Date: {new Date(sub.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {(sub.gst || sub.iec || sub.country) && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {sub.gst && <span className="bg-slate-100 text-slate-800 font-mono font-bold px-2 py-0.5 rounded border border-slate-200">GST: {sub.gst}</span>}
                        {sub.iec && <span className="bg-slate-100 text-slate-800 font-mono font-bold px-2 py-0.5 rounded border border-slate-200">IEC: {sub.iec}</span>}
                        {sub.country && <span className="bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">Country: {sub.country}</span>}
                      </div>
                    )}
                  </div>

                  {/* Document View & Download */}
                  <div className="shrink-0 flex flex-col gap-1.5 min-w-[190px]">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[130px]" title={sub.documentName || "letter1.pdf"}>{sub.documentName || "letter1.pdf"}</p>
                        <p className="text-[0.6rem] text-slate-500 font-mono">Incorporation Certificate</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <a 
                        href={sub.documentUrl || localStorage.getItem("kyb_submitted_url") || localStorage.getItem("kyb_pdf_data") || "data:application/pdf;base64,JVBERi0xLjQKJSDl4uXmA%2B..."} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg text-center transition-colors flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </a>
                      <a 
                        href={sub.documentUrl || localStorage.getItem("kyb_submitted_url") || localStorage.getItem("kyb_pdf_data") || "data:application/pdf;base64,JVBERi0xLjQKJSDl4uXmA%2B..."} 
                        download={sub.documentName || "Incorporation_Certificate.pdf"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-slate-800 hover:bg-slate-900 text-white border border-slate-700 font-bold text-xs py-1.5 px-3 rounded-lg text-center transition-colors flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </div>
                  </div>
                </div>

                {/* Action Area — Always available for Admin to Approve or Reject */}
                <div className="border-t border-slate-100 px-5 py-4 bg-slate-50">
                  {/* Reject reason input */}
                  <div className="mb-3">
                    <label className="block text-[0.65rem] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Rejection Reason (optional — fill if rejecting)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Document is unclear / expired / not matching company name..."
                      value={rejectReasons[sub.id] || ""}
                      onChange={e => setRejectReasons(prev => ({ ...prev, [sub.id]: e.target.value }))}
                      className="w-full bg-white border border-slate-300 h-9 px-3 text-xs rounded-lg outline-none focus:border-slate-400 transition-all"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleApprove(sub.id, sub.companyName)}
                      disabled={!!actionLoading[sub.id]}
                      className={`flex-1 h-10 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${
                        sub.kybStatus === "VERIFIED"
                          ? "bg-emerald-700 text-white shadow-inner ring-2 ring-emerald-500"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg"
                      }`}
                    >
                      {actionLoading[sub.id] === "approve" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {sub.kybStatus === "VERIFIED" ? "✓ Approved (Click to Re-Approve)" : "✓ Approve & Verify"}
                    </button>
                    <button
                      onClick={() => handleReject(sub.id, sub.companyName)}
                      disabled={!!actionLoading[sub.id]}
                      className={`flex-1 h-10 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${
                        sub.kybStatus === "REJECTED"
                          ? "bg-rose-700 text-white shadow-inner ring-2 ring-rose-500"
                          : "bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:shadow-lg"
                      }`}
                    >
                      {actionLoading[sub.id] === "reject" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      {sub.kybStatus === "REJECTED" ? "✗ Rejected (Click to Re-Reject)" : "✗ Reject"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          KYB Admin Panel · TradoxB2B Compliance · All actions are logged.
        </p>
      </div>

      {/* OWNER PERMISSIONS MANAGER MODAL */}
      {showPermModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Manage KYB Approval Permissions</h3>
                  <p className="text-xs text-slate-500">Platform Owner Controls</p>
                </div>
              </div>
              <button
                onClick={() => setShowPermModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            {/* Grant Permission Form */}
            <form onSubmit={handleGrantPermission} className="mb-6">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Authorize Staff Email for KYB Approvals
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter staff email (e.g. manager@tradox.b2b)"
                  value={newAdminEmail}
                  onChange={e => setNewAdminEmail(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 focus:border-emerald-500 h-10 px-3 text-xs rounded-xl outline-none"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 h-10 rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <UserPlus className="w-4 h-4" /> Grant Access
                </button>
              </div>
            </form>

            {/* Authorized List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Authorized Admin List ({authorizedEmails.length})
              </h4>

              {authorizedEmails.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-4 text-center text-xs text-slate-500">
                  Only you (Platform Owner) currently have KYB Approval access.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {authorizedEmails.map((email) => (
                    <div key={email} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-800">{email}</span>
                      </div>
                      <button
                        onClick={() => handleRevokePermission(email)}
                        className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Revoke / Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowPermModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
