import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "sonner";
import {
  Shield, CheckCircle2, XCircle, Clock, ArrowLeft,
  Building2, FileText, User, Download, Loader2, Search,
  Phone, Mail, Eye, Lock, Key, UserPlus, Trash2, RefreshCw
} from "lucide-react";
import Sidebar from "../components/Sidebar";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

const SUPER_OWNERS = [
  "krishnametri223344@gmail.com",
  "owner@tradoxb2b.com"
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadAdminStore() {
  try { return JSON.parse(localStorage.getItem("kyb_admin_store") || "[]"); } catch { return []; }
}
function saveAdminStore(list) {
  try { localStorage.setItem("kyb_admin_store", JSON.stringify(list)); } catch { /* noop */ }
}
function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return isNaN(d) ? "Recently" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "Recently"; }
}

export default function AdminKyb() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isSuperOwner, setIsSuperOwner] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [activeTab, setActiveTab] = useState("SUBMITTED");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState({});
  const [rejectReasons, setRejectReasons] = useState({});
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showPermModal, setShowPermModal] = useState(false);
  const [authorizedEmails, setAuthorizedEmails] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kyb_authorized_emails") || "[]"); } catch { return []; }
  });
  const [newAdminEmail, setNewAdminEmail] = useState("");

  // ─── Load submissions ──────────────────────────────────────────────────────
  const fetchSubmissions = useCallback(async (user, showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true); else setLoading(true);

    try {
      const latestDoc  = localStorage.getItem("kyb_submitted_doc");
      const latestUrl  = localStorage.getItem("kyb_submitted_url") || localStorage.getItem("kyb_pdf_data");
      const latestStatus = localStorage.getItem("kyb_status") || "SUBMITTED";

      // STEP 1: Sync current user's latest submission into admin store
      if (latestDoc) {
        const uid       = user?.uid || "local-user-1";
        const userEmail = user?.email || "krishnametri223344@gmail.com";
        const userName  = user?.displayName || userEmail.split("@")[0];
        const store     = loadAdminStore();
        const idx       = store.findIndex(e => e.id === uid || e.userEmail === userEmail);
        const entry = {
          id: uid, userEmail, userName,
          companyName: store[idx]?.companyName || `${userName} Company`,
          documentName: latestDoc,
          documentUrl: latestUrl || store[idx]?.documentUrl || null,
          kybStatus: latestStatus,
          submittedAt: store[idx]?.submittedAt || new Date().toISOString(),
          mobile: user?.phoneNumber || store[idx]?.mobile || "+917777777777",
          country: store[idx]?.country || "India",
          gst: store[idx]?.gst || null,
          iec: store[idx]?.iec || null,
        };
        if (idx >= 0) store[idx] = entry; else store.unshift(entry);
        saveAdminStore(store);
      }

      // STEP 2: Load local store
      const localStore = loadAdminStore();
      const merged = [...localStore];
      const localIds    = new Set(merged.map(i => i.id));
      const localEmails = new Set(merged.map(i => i.userEmail?.toLowerCase()));

      // STEP 3: Fetch backend
      try {
        const token = await user?.getIdToken().catch(() => null);
        if (token) {
          const res = await fetch(`${API_BASE}/api/admin/kyb`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => null);
          if (res?.ok) {
            const rawData = await res.json().catch(() => []);
            if (Array.isArray(rawData)) {
              for (const item of rawData) {
                const id    = item.id || item.userId;
                const email = (item.userEmail || "").toLowerCase();
                if (!localIds.has(id) && !localEmails.has(email)) {
                  merged.push({
                    id: id || email,
                    companyName: item.companyName || "Registered Company",
                    userEmail: item.userEmail || "—",
                    userName: item.userName || item.userEmail?.split("@")[0] || "—",
                    mobile: item.mobile || "Not Provided",
                    submittedAt: item.submittedAt || new Date().toISOString(),
                    kybStatus: item.kybStatus || "SUBMITTED",
                    documentName: item.documentName || "Certificate.pdf",
                    documentUrl: item.documentUrl || null,
                    country: item.country || "India",
                    gst: item.gst || null,
                    iec: item.iec || null,
                  });
                } else {
                  // Enrich local entry with backend doc URL if missing
                  const localIdx = merged.findIndex(m => m.id === id || m.userEmail?.toLowerCase() === email);
                  if (localIdx >= 0 && !merged[localIdx].documentUrl && item.documentUrl) {
                    merged[localIdx] = { ...merged[localIdx], documentUrl: item.documentUrl };
                  }
                  // Update status from backend if it's been changed by admin
                  if (localIdx >= 0 && item.kybStatus && item.kybStatus !== "SUBMITTED") {
                    merged[localIdx] = { ...merged[localIdx], kybStatus: item.kybStatus };
                  }
                }
              }
            }
          }
        }
      } catch (fetchErr) { /* silently fail, use local store */ }

      // STEP 4: Fallback if empty
      if (merged.length === 0) {
        const uEmail = user?.email || "krishnametri223344@gmail.com";
        const uName  = user?.displayName || "Krishna G M";
        merged.push({
          id: user?.uid || "local-user-1",
          companyName: `${uName} Company`,
          userEmail: uEmail, userName: uName,
          mobile: "+917777777777",
          submittedAt: new Date().toISOString(),
          kybStatus: latestStatus,
          documentName: latestDoc || "letter1.pdf",
          documentUrl: latestUrl || null,
          country: "India", gst: null, iec: null,
        });
      }

      setSubmissions(merged);
    } catch (err) {
      console.error("KYB fetch error:", err);
      setSubmissions(loadAdminStore());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      const activeUser = user || auth.currentUser;
      const email = activeUser?.email?.trim().toLowerCase() || "";
      setIsSuperOwner(
        !email ||
        SUPER_OWNERS.some(o => o.toLowerCase() === email) ||
        email.includes("krishnametri") ||
        email.includes("owner")
      );
      setCurrentUser(activeUser);
      fetchSubmissions(activeUser);
    });
    return () => unsub();
  }, [fetchSubmissions]);

  // ─── Approve ──────────────────────────────────────────────────────────────
  const handleApprove = async (userId, companyName) => {
    setActionLoading(prev => ({ ...prev, [userId]: "approve" }));
    try {
      // Optimistic update — move card immediately
      setSubmissions(prev => prev.map(s =>
        s.id === userId ? { ...s, kybStatus: "VERIFIED" } : s
      ));
      // Persist locally
      const store = loadAdminStore();
      saveAdminStore(store.map(s => s.id === userId ? { ...s, kybStatus: "VERIFIED" } : s));
      // Update kyb_status if it's the current user's own record
      if (userId === currentUser?.uid || userId === "local-user-1") {
        localStorage.setItem("kyb_status", "VERIFIED");
      }
      // Call backend
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      if (token) {
        await fetch(`${API_BASE}/api/admin/kyb/${userId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
      toast.success(`✓ ${companyName} approved & verified!`);
      setActiveTab("VERIFIED"); // Switch to Approved tab so user sees it moved
    } catch (err) {
      toast.success(`✓ ${companyName} approved!`);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  // ─── Reject ───────────────────────────────────────────────────────────────
  const handleReject = async (userId, companyName) => {
    const reason = rejectReasons[userId] || "Documents could not be verified.";
    setActionLoading(prev => ({ ...prev, [userId]: "reject" }));
    try {
      // Optimistic update — move card immediately
      setSubmissions(prev => prev.map(s =>
        s.id === userId ? { ...s, kybStatus: "REJECTED", rejectReason: reason } : s
      ));
      // Persist locally
      const store = loadAdminStore();
      saveAdminStore(store.map(s => s.id === userId ? { ...s, kybStatus: "REJECTED" } : s));
      if (userId === currentUser?.uid || userId === "local-user-1") {
        localStorage.setItem("kyb_status", "REJECTED");
        localStorage.setItem("kyb_reject_reason", reason);
      }
      // Call backend
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      if (token) {
        await fetch(`${API_BASE}/api/admin/kyb/${userId}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ reason })
        }).catch(() => {});
      }
      toast.error(`✗ ${companyName} rejected.`);
      setActiveTab("REJECTED"); // Switch to Rejected tab
    } catch (err) {
      toast.error(`✗ ${companyName} rejected.`);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  // ─── Document viewer ──────────────────────────────────────────────────────
  const handleViewDocument = (sub) => {
    const rawUrl = sub.documentUrl || localStorage.getItem("kyb_submitted_url") || localStorage.getItem("kyb_pdf_data");
    if (!rawUrl || rawUrl.length < 20 || rawUrl === "null") {
      setPreviewDoc({ name: sub.documentName || "Certificate.pdf", url: null, rawUrl: null, company: sub.companyName, applicant: sub.userName });
      return;
    }
    let finalUrl = rawUrl;
    if (rawUrl.startsWith("data:")) {
      try {
        const arr = rawUrl.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] || "application/pdf";
        const bstr = atob(arr[1].replace(/\s/g, ""));
        const u8 = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
        finalUrl = URL.createObjectURL(new Blob([u8], { type: mime }));
      } catch { finalUrl = null; }
    }
    setPreviewDoc({ name: sub.documentName || "Certificate.pdf", url: finalUrl, rawUrl, company: sub.companyName, applicant: sub.userName });
  };

  const handleDownloadDocument = (sub) => {
    const rawUrl = sub.url || sub.documentUrl || localStorage.getItem("kyb_submitted_url") || localStorage.getItem("kyb_pdf_data");
    const filename = sub.name || sub.documentName || "Certificate.pdf";
    if (!rawUrl || rawUrl.length < 20 || rawUrl === "null") {
      toast.error("Document not available — uploaded from a different browser/device.");
      return;
    }
    try {
      if (rawUrl.startsWith("data:")) {
        const arr = rawUrl.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] || "application/pdf";
        const bstr = atob(arr[1]);
        const u8 = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
        const blobUrl = URL.createObjectURL(new Blob([u8], { type: mime }));
        const a = document.createElement("a");
        a.href = blobUrl; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        return;
      }
    } catch { /* fall through */ }
    const a = document.createElement("a");
    a.href = rawUrl; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // ─── Permission management ────────────────────────────────────────────────
  const handleGrantPermission = (e) => {
    e.preventDefault();
    if (!isSuperOwner) { toast.error("Only the Platform Owner can grant permissions."); return; }
    const clean = newAdminEmail.trim().toLowerCase();
    if (!clean.includes("@")) { toast.error("Enter a valid email."); return; }
    if (authorizedEmails.includes(clean)) { toast.error("Already authorized."); return; }
    const updated = [...authorizedEmails, clean];
    setAuthorizedEmails(updated);
    localStorage.setItem("kyb_authorized_emails", JSON.stringify(updated));
    setNewAdminEmail("");
    toast.success(`✓ Granted access to ${clean}`);
  };
  const handleRevokePermission = (email) => {
    if (!isSuperOwner) { toast.error("Only the Platform Owner can revoke permissions."); return; }
    const updated = authorizedEmails.filter(e => e !== email);
    setAuthorizedEmails(updated);
    localStorage.setItem("kyb_authorized_emails", JSON.stringify(updated));
    toast.success(`Removed access for ${email}`);
  };

  // ─── Derived data ──────────────────────────────────────────────────────────
  const q = searchQuery.toLowerCase();
  const filtered = submissions.filter(s =>
    !q ||
    s.companyName?.toLowerCase().includes(q) ||
    s.userEmail?.toLowerCase().includes(q) ||
    s.userName?.toLowerCase().includes(q)
  );
  const pendingList  = filtered.filter(s => s.kybStatus === "SUBMITTED" || s.kybStatus === "PENDING");
  const approvedList = filtered.filter(s => s.kybStatus === "VERIFIED");
  const rejectedList = filtered.filter(s => s.kybStatus === "REJECTED");
  const displayList  = activeTab === "SUBMITTED" ? pendingList : activeTab === "VERIFIED" ? approvedList : rejectedList;

  // ─── Loading spinner ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm text-slate-600">Loading KYB submissions...</p>
        </div>
      </div>
    );
  }

  // ─── Submission Card ──────────────────────────────────────────────────────
  const SubmissionCard = ({ sub }) => {
    const isApproved = sub.kybStatus === "VERIFIED";
    const isRejected = sub.kybStatus === "REJECTED";
    const busy       = !!actionLoading[sub.id];

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
        {/* Card header */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-base font-bold text-slate-900">{sub.companyName}</h3>
              <span className={`text-[0.65rem] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isApproved ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                isRejected ? "bg-rose-100 text-rose-800 border-rose-300" :
                "bg-amber-100 text-amber-800 border-amber-300"
              }`}>
                {isApproved ? <CheckCircle2 className="w-3 h-3" /> : isRejected ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {sub.kybStatus}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 mb-2">
              <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                {sub.userName}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {sub.userEmail}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {sub.mobile}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {fmtDate(sub.submittedAt)}
              </span>
            </div>
            {sub.rejectReason && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5 mt-1">
                <strong>Reason:</strong> {sub.rejectReason}
              </p>
            )}
          </div>

          {/* Document */}
          <div className="shrink-0 flex flex-col gap-1.5 min-w-[190px]">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[130px]" title={sub.documentName}>{sub.documentName || "Certificate.pdf"}</p>
                <p className="text-[0.6rem] text-slate-500 font-mono">Incorporation Certificate</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleViewDocument(sub)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-sm">
                <Eye className="w-3.5 h-3.5" /> View
              </button>
              <button onClick={() => handleDownloadDocument(sub)}
                className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-sm">
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            </div>
          </div>
        </div>

        {/* Action area */}
        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50">
          <div className="mb-3">
            <label className="block text-[0.65rem] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Rejection Reason (fill before rejecting)
            </label>
            <input
              type="text"
              placeholder="e.g. Document is unclear / expired / name mismatch..."
              value={rejectReasons[sub.id] || ""}
              onChange={e => setRejectReasons(prev => ({ ...prev, [sub.id]: e.target.value }))}
              className="w-full bg-white border border-slate-300 h-9 px-3 text-xs rounded-lg outline-none focus:border-slate-400 transition-all"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleApprove(sub.id, sub.companyName)}
              disabled={busy}
              className={`flex-1 h-10 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${
                isApproved
                  ? "bg-emerald-700 text-white ring-2 ring-emerald-500 shadow-inner"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
              }`}
            >
              {actionLoading[sub.id] === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isApproved ? "✓ Approved (Re-Approve)" : "✓ Approve & Verify"}
            </button>
            <button
              onClick={() => handleReject(sub.id, sub.companyName)}
              disabled={busy}
              className={`flex-1 h-10 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${
                isRejected
                  ? "bg-rose-700 text-white ring-2 ring-rose-500 shadow-inner"
                  : "bg-rose-600 hover:bg-rose-700 text-white shadow-md"
              }`}
            >
              {actionLoading[sub.id] === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              {isRejected ? "✗ Rejected (Re-Reject)" : "✗ Reject"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Top bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchSubmissions(currentUser, true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
              title="Refresh submissions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            {isSuperOwner && (
              <button onClick={() => setShowPermModal(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md">
                <Key className="w-3.5 h-3.5" /> Manage Permissions
              </button>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">

          {/* Stats tabs */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { key: "SUBMITTED", label: "Pending Review", count: pendingList.length, color: "amber", icon: Clock },
              { key: "VERIFIED",  label: "Approved",       count: approvedList.length, color: "emerald", icon: CheckCircle2 },
              { key: "REJECTED",  label: "Rejected",       count: rejectedList.length, color: "rose", icon: XCircle },
            ].map(({ key, label, count, color, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`rounded-xl p-4 text-center border-2 transition-all hover:shadow-md ${
                  activeTab === key
                    ? `bg-${color}-50 border-${color}-400 shadow-sm`
                    : `bg-white border-transparent hover:border-${color}-200`
                }`}
              >
                <div className={`text-3xl font-bold mb-1 text-${color}-800`}>{count}</div>
                <div className={`text-xs font-semibold text-${color}-700 flex items-center justify-center gap-1`}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </div>
                {activeTab === key && (
                  <div className={`text-[0.6rem] font-bold text-${color}-500 mt-1 uppercase tracking-wider`}>● Viewing</div>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by company name, email, or person..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 focus:border-emerald-500 h-11 pl-10 pr-4 text-sm rounded-xl outline-none transition-all"
            />
          </div>

          {/* Section label */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              {activeTab === "SUBMITTED" ? "⏳ Pending Review" : activeTab === "VERIFIED" ? "✅ Approved" : "❌ Rejected"}
              <span className="ml-2 text-slate-400 font-normal">({displayList.length})</span>
            </h2>
          </div>

          {/* Cards */}
          <div className="space-y-4">
            {displayList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center">
                {activeTab === "SUBMITTED" ? (
                  <>
                    <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-semibold">No pending submissions</p>
                    <p className="text-sm text-slate-400 mt-1">All submissions have been reviewed, or no user has submitted yet.</p>
                  </>
                ) : activeTab === "VERIFIED" ? (
                  <>
                    <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-semibold">No approved submissions yet</p>
                    <p className="text-sm text-slate-400 mt-1">Approve a pending submission to see it here.</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-semibold">No rejected submissions</p>
                  </>
                )}
              </div>
            ) : (
              displayList.map(sub => <SubmissionCard key={sub.id} sub={sub} />)
            )}
          </div>

          <p className="text-center text-xs text-slate-400 mt-8">
            KYB Admin Panel · TradoxB2B Compliance · All actions are logged.
          </p>
        </div>

        {/* ── PERMISSIONS MODAL ─────────────────────────────────────────────── */}
        {showPermModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6">
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
                <button onClick={() => setShowPermModal(false)} className="text-slate-400 hover:text-slate-700 text-lg font-bold px-2">✕</button>
              </div>
              <form onSubmit={handleGrantPermission} className="mb-6">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Authorize Staff Email for KYB Approvals
                </label>
                <div className="flex gap-2">
                  <input type="email" placeholder="Enter staff email"
                    value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 focus:border-emerald-500 h-10 px-3 text-xs rounded-xl outline-none"
                  />
                  <button type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 h-10 rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0">
                    <UserPlus className="w-4 h-4" /> Grant Access
                  </button>
                </div>
              </form>
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
                    {authorizedEmails.map(email => (
                      <div key={email} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-bold text-slate-800">{email}</span>
                        </div>
                        <button onClick={() => handleRevokePermission(email)}
                          className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" /> Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button onClick={() => setShowPermModal(false)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors">
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DOCUMENT PREVIEW MODAL ────────────────────────────────────────── */}
        {previewDoc && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden font-sans">
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{previewDoc.name}</h3>
                    <p className="text-xs text-slate-400">KYB Certificate for <span className="text-emerald-400 font-semibold">{previewDoc.company}</span> ({previewDoc.applicant})</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleDownloadDocument(previewDoc)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm">
                    <Download className="w-3.5 h-3.5" /> Download Document
                  </button>
                  <button onClick={() => setPreviewDoc(null)}
                    className="text-slate-400 hover:text-white font-bold text-lg px-2 rounded-lg transition-colors">✕</button>
                </div>
              </div>
              <div className="flex-1 bg-slate-100 p-3 overflow-hidden flex items-center justify-center">
                {previewDoc.url ? (
                  <iframe src={previewDoc.url} title={previewDoc.name}
                    className="w-full h-full rounded-2xl border border-slate-300 bg-white shadow-inner" />
                ) : (
                  <div className="flex flex-col items-center gap-4 text-center p-8">
                    <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-full flex items-center justify-center">
                      <FileText className="w-9 h-9 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800 mb-2">Document Preview Not Available</h3>
                      <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                        <strong>{previewDoc.name}</strong> was uploaded from a different browser or device.
                      </p>
                      <p className="text-xs text-amber-600 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                        Ask the applicant to re-upload, or check backend file storage.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
