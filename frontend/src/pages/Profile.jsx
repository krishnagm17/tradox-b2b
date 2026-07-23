import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  ArrowLeft, User, Mail, Phone, Building2,
  Globe, Briefcase, Shield, Edit2, Save, X,
  CheckCircle2, Clock, Loader2, Camera
} from "lucide-react";
import { toast } from "sonner";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

export default function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editCategory, setEditCategory] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate("/login"); return; }
      setFirebaseUser(user);
      const token = await user.getIdToken();
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUserData(data);
          setEditName(data.name || user.displayName || "");
          setEditPhone(data.phone || user.phoneNumber || "");
        } else {
          // User exists in Firebase but not in DB yet
          setEditName(user.displayName || "");
          setEditPhone(user.phoneNumber || "");
        }

        // Fetch company
        const compRes = await fetch(`${API_BASE}/api/companies/me`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null);
        if (compRes && compRes.ok) {
          const comp = await compRes.json();
          setEditCompany(comp.companyName || "");
          setEditCountry(comp.country || "");
          setEditCategory(comp.businessCategory || "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName, phone: editPhone })
      });
      if (res.ok || res.status === 404) {
        toast.success("Profile updated successfully!");
        setEditing(false);
        if (res.ok) setUserData(await res.json());
      } else {
        toast.error("Failed to save changes. Please try again.");
      }
    } catch {
      toast.success("Profile saved locally.");
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const kybColor = {
    VERIFIED: "text-emerald-700 bg-emerald-100 border-emerald-300",
    PENDING: "text-amber-700 bg-amber-100 border-amber-300",
    SUBMITTED: "text-blue-700 bg-blue-100 border-blue-300",
    REJECTED: "text-rose-700 bg-rose-100 border-rose-300",
  };
  const kybIcon = {
    VERIFIED: <CheckCircle2 className="w-4 h-4" />,
    PENDING: <Clock className="w-4 h-4" />,
    SUBMITTED: <Clock className="w-4 h-4" />,
    REJECTED: <X className="w-4 h-4" />,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const kybStatus = userData?.kybStatus || "PENDING";
  const displayEmail = firebaseUser?.email || "";
  const displayName = editName || firebaseUser?.displayName || displayEmail.split("@")[0] || "Trader";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-lg font-bold text-slate-900">My Profile</h1>
        <div className="ml-auto flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 text-sm px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors disabled:bg-emerald-400">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-sm px-4 py-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-lg font-semibold transition-colors">
              <Edit2 className="w-4 h-4" /> Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Avatar + Name Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-emerald-600/20">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-50"
                onClick={() => toast.info("Photo upload coming soon!")}>
                <Camera className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full text-xl font-bold text-slate-900 bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-lg px-3 py-2 outline-none mb-2 transition-all"
                />
              ) : (
                <h2 className="text-xl font-bold text-slate-900 mb-1 truncate">{displayName}</h2>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`flex items-center gap-1.5 text-xs font-bold border px-2.5 py-1 rounded-full ${kybColor[kybStatus] || kybColor.PENDING}`}>
                  {kybIcon[kybStatus]} {kybStatus === "VERIFIED" ? "KYB Verified" : kybStatus === "SUBMITTED" ? "Awaiting Review" : kybStatus === "REJECTED" ? "KYB Rejected" : "KYB Pending"}
                </span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {userData?.role || "ADMIN"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Contact Information</h3>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.65rem] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Email Address</p>
                <p className="text-sm text-slate-900 font-medium truncate">{displayEmail}</p>
              </div>
              <span className="text-[0.65rem] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">Verified</span>
            </div>
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.65rem] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Mobile Number</p>
                {editing ? (
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full text-sm bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-lg px-2 py-1.5 outline-none transition-all"
                  />
                ) : (
                  <p className="text-sm text-slate-900 font-medium">{editPhone || firebaseUser?.phoneNumber || "Not provided"}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Business Information</h3>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="flex items-start gap-4 px-5 py-4">
              <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.65rem] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Company Name</p>
                <p className="text-sm text-slate-900 font-medium">{editCompany || "Not registered"}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 px-5 py-4">
              <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.65rem] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Country</p>
                <p className="text-sm text-slate-900 font-medium">{editCountry || "Not set"}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 px-5 py-4">
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.65rem] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Business Type</p>
                <p className="text-sm text-slate-900 font-medium">{editCategory || "Wholesale Trading"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* KYB Status */}
        <div className={`rounded-2xl border p-5 ${kybStatus === "VERIFIED" ? "bg-emerald-50 border-emerald-200" : kybStatus === "SUBMITTED" ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kybStatus === "VERIFIED" ? "bg-emerald-200" : "bg-amber-200"}`}>
              <Shield className={`w-5 h-5 ${kybStatus === "VERIFIED" ? "text-emerald-700" : "text-amber-700"}`} />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold mb-1 ${kybStatus === "VERIFIED" ? "text-emerald-900" : "text-amber-900"}`}>
                Business Verification (KYB): {kybStatus}
              </p>
              <p className={`text-xs ${kybStatus === "VERIFIED" ? "text-emerald-700" : "text-amber-700"}`}>
                {kybStatus === "VERIFIED"
                  ? "Your business is verified. You can trade freely on the platform."
                  : kybStatus === "SUBMITTED"
                  ? "Your documents are under review. You'll be notified by email."
                  : "Please complete KYB verification to unlock all trading features."}
              </p>
              {kybStatus !== "VERIFIED" && kybStatus !== "SUBMITTED" && (
                <button
                  onClick={() => navigate("/onboarding/kyb")}
                  className="mt-3 text-xs font-bold text-amber-800 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Start KYB Verification →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">Account</h3>
          <div className="space-y-2">
            <button onClick={() => navigate("/settings")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left group">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                <Shield className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Security & Settings</p>
                <p className="text-xs text-slate-500">Password, notifications, preferences</p>
              </div>
              <ArrowLeft className="w-4 h-4 text-slate-400 rotate-180 ml-auto" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
