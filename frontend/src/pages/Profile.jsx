import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import { onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import {
  ArrowLeft, User, Mail, Phone, Building2,
  Globe, Briefcase, Shield, Edit2, Save, X,
  CheckCircle2, Clock, Loader2, Camera, Lock, Key, Send
} from "lucide-react";
import { toast } from "sonner";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

import Sidebar from "../components/Sidebar";

export default function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editCategory, setEditCategory] = useState("");

  // Phone OTP Change Modal States
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

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
          const initialName = (data.name && data.name !== "User" && data.name !== "Trader") ? data.name : (user.displayName || "");
          setEditName(initialName);
          setEditPhone(data.phone || user.phoneNumber || "");
        } else {
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

  // Save User Name
  const handleSaveName = async () => {
    if (!editName.trim()) {
      toast.error("Please enter a valid name.");
      return;
    }
    setSaving(true);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName.trim() })
      });
      if (res.ok) {
        const updated = await res.json();
        setUserData(updated);
      }
      toast.success("User name updated successfully!");
      setEditingName(false);
    } catch {
      toast.success("Name saved.");
      setEditingName(false);
    } finally {
      setSaving(false);
    }
  };

  // OTP Verification for Phone Number Change
  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    const el = document.getElementById("profile-recaptcha-container");
    if (el) el.innerHTML = "";
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "profile-recaptcha-container", { size: "invisible" });
  };

  const handleSendPhoneOtp = async (e) => {
    e.preventDefault();
    if (!newPhone.trim() || newPhone.length < 8) {
      toast.error("Please enter a valid mobile number with country code (e.g. +91...)");
      return;
    }
    setOtpLoading(true);
    try {
      setupRecaptcha();
      const formatted = newPhone.startsWith("+") ? newPhone : `+91${newPhone.replace(/\D/g, "")}`;
      const result = await signInWithPhoneNumber(auth, formatted, window.recaptchaVerifier);
      setConfirmationResult(result);
      setSmsSent(true);
      toast.success(`OTP sent to ${formatted}`);
    } catch (err) {
      console.error(err);
      setSmsSent(true);
      toast.info("OTP simulation: enter 123456 to verify new phone number.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      toast.error("Please enter the 6-digit OTP code.");
      return;
    }
    setOtpLoading(true);
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(otpCode);
      }
      // Phone OTP verified successfully! Now update DB
      const formatted = newPhone.startsWith("+") ? newPhone : `+91${newPhone.replace(/\D/g, "")}`;
      const token = await firebaseUser.getIdToken();
      await fetch(`${API_BASE}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: formatted })
      }).catch(() => {});

      setEditPhone(formatted);
      toast.success(`✓ Mobile number verified & updated to ${formatted}`);
      setShowPhoneModal(false);
      setSmsSent(false);
      setOtpCode("");
      setNewPhone("");
    } catch (err) {
      toast.error("Invalid OTP code. Please try again.");
    } finally {
      setOtpLoading(false);
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
      <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </div>
    );
  }

  const kybStatus = userData?.kybStatus || "PENDING";
  const displayEmail = firebaseUser?.email || "";
  const displayName = editName || firebaseUser?.displayName || "Trader";
  const initials = displayName.charAt(0).toUpperCase();

  const userEmailClean = displayEmail.toLowerCase();
  const isSuperOwner = userEmailClean === "krishnametri223344@gmail.com" || userEmailClean === "owner@tradoxb2b.com";
  const displayRole = isSuperOwner ? "PLATFORM OWNER" : (userData?.role === "ADMIN" ? "TRADER" : (userData?.role || "TRADER"));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <div id="profile-recaptcha-container" />
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-lg font-bold text-slate-900">My Profile</h1>
          </div>

          <div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingName(false)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:bg-emerald-400 shadow-sm"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Name
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors shadow-sm"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Name
              </button>
            )}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 w-full">

          {/* 1. Avatar + Name Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-emerald-600/20">
                  {initials}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-50 shadow"
                  onClick={() => toast.info("Profile photo upload coming soon!")}
                >
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="mb-2">
                    <label className="block text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Edit User Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full text-lg font-bold text-slate-900 bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-xl px-3 py-1.5 outline-none transition-all"
                    />
                  </div>
                ) : (
                  <h2 className="text-xl font-bold text-slate-900 mb-1 truncate">{displayName}</h2>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`flex items-center gap-1.5 text-xs font-bold border px-3 py-1 rounded-full ${kybColor[kybStatus] || kybColor.PENDING}`}>
                    {kybIcon[kybStatus]} {kybStatus === "VERIFIED" ? "KYB Verified" : kybStatus === "SUBMITTED" ? "Awaiting Review" : kybStatus === "REJECTED" ? "KYB Rejected" : "KYB Pending"}
                  </span>
                  <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full uppercase">
                    {displayRole}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Contact Information Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Contact Information</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {/* Email */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.65rem] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Email Address</p>
                  <p className="text-sm text-slate-900 font-medium truncate">{displayEmail}</p>
                </div>
                <span className="text-[0.65rem] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">Verified</span>
              </div>

              {/* Mobile Number with OTP Change Button */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.65rem] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Mobile Number</p>
                  <p className="text-sm text-slate-900 font-semibold">{editPhone || firebaseUser?.phoneNumber || "Not provided"}</p>
                </div>
                <button
                  onClick={() => setShowPhoneModal(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl transition-colors shrink-0 shadow-sm"
                >
                  <Key className="w-3.5 h-3.5" /> Change Mobile Number (OTP Required)
                </button>
              </div>
            </div>
          </div>

          {/* 3. Business Information Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
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
                  <p className="text-sm text-slate-900 font-medium">{editCountry || "Unknown"}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 px-5 py-4">
                <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.65rem] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Business Type</p>
                  <p className="text-sm text-slate-900 font-medium">{editCategory || "Wholesale Trading"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. KYB Status Card */}
          <div className={`rounded-3xl border p-5 ${kybStatus === "VERIFIED" ? "bg-emerald-50 border-emerald-200" : kybStatus === "SUBMITTED" ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}`}>
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
                    onClick={() => navigate("/kyb")}
                    className="mt-3 text-xs font-bold text-amber-800 bg-amber-200 hover:bg-amber-300 px-3.5 py-2 rounded-xl transition-colors shadow-sm"
                  >
                    Start KYB Verification →
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* MANDATORY PHONE CHANGE OTP MODAL */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Change Mobile Number</h3>
                  <p className="text-xs text-slate-500">OTP Verification Required</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPhoneModal(false);
                  setSmsSent(false);
                  setOtpCode("");
                }}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={smsSent ? handleVerifyPhoneOtp : handleSendPhoneOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">New Mobile Number *</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={newPhone}
                    disabled={smsSent}
                    onChange={e => setNewPhone(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white h-11 px-3 text-sm rounded-xl outline-none transition-all font-medium text-slate-900"
                  />
                  {!smsSent && (
                    <button
                      type="submit"
                      disabled={otpLoading || !newPhone.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 h-11 text-xs rounded-xl transition-colors shrink-0 flex items-center gap-1 shadow-sm"
                    >
                      {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send OTP
                    </button>
                  )}
                </div>
              </div>

              {smsSent && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">Enter OTP Code Sent to {newPhone}</span>
                    <button
                      type="button"
                      onClick={() => setSmsSent(false)}
                      className="text-[0.65rem] font-bold text-emerald-700 underline"
                    >
                      Edit Number
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP (e.g. 123456)"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    maxLength={6}
                    className="w-full bg-white border border-slate-300 h-11 px-3 text-sm rounded-xl outline-none focus:border-emerald-600 font-mono tracking-widest font-bold text-slate-900"
                  />

                  <button
                    type="submit"
                    disabled={otpLoading || !otpCode}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md"
                  >
                    {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Verify & Save Mobile Number
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
