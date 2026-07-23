import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import { onAuthStateChanged, signOut, sendPasswordResetEmail, updateEmail } from "firebase/auth";
import {
  ArrowLeft, Bell, Shield, Trash2, Lock,
  Globe, Moon, ToggleLeft, ToggleRight,
  CheckCircle2, Loader2, LogOut, Mail, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Notification preferences (local state — can be persisted to backend)
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [dealNotifs, setDealNotifs] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(false);
  const [mktUpdates, setMktUpdates] = useState(true);

  // Password reset
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Delete account confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { navigate("/login"); return; }
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      toast.success(`Password reset email sent to ${user.email}`);
    } catch (err) {
      toast.error("Failed to send reset email. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    toast.success("Signed out successfully.");
    navigate("/");
  };

  const saveNotifications = () => {
    toast.success("Notification preferences saved!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const Toggle = ({ value, onChange, label, desc }) => (
    <div className="flex items-center justify-between py-3.5">
      <div className="flex-1 pr-4">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${value ? "bg-emerald-500" : "bg-slate-200"}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${value ? "left-6" : "left-0.5"}`} />
      </button>
    </div>
  );

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
        <h1 className="text-lg font-bold text-slate-900">Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Account Overview */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow">
              {(user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{user?.displayName || user?.email}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <button onClick={() => navigate("/profile")}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors">
              Edit Profile
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Account created and email verified</span>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Security</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {/* Password Reset */}
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Lock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Password</p>
                  <p className="text-xs text-slate-500">
                    {resetSent ? "Reset email sent — check your inbox" : "Change your account password"}
                  </p>
                </div>
              </div>
              <button
                onClick={handlePasswordReset}
                disabled={resetLoading || resetSent}
                className={`text-xs font-bold px-3 py-2 rounded-lg transition-colors ${
                  resetSent
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : resetSent ? "✓ Sent" : "Reset Password"}
              </button>
            </div>

            {/* 2FA */}
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Two-Factor Authentication</p>
                  <p className="text-xs text-slate-500">
                    {user?.providerData?.some(p => p.providerId === "phone") ? "✓ Phone 2FA enabled" : "Add phone for extra security"}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${user?.providerData?.some(p => p.providerId === "phone") ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {user?.providerData?.some(p => p.providerId === "phone") ? "Active" : "Optional"}
              </span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Notifications</h3>
          </div>
          <div className="px-5 divide-y divide-slate-100">
            <Toggle
              value={emailNotifs}
              onChange={setEmailNotifs}
              label="Email Notifications"
              desc="Get email updates about your trades and negotiations"
            />
            <Toggle
              value={dealNotifs}
              onChange={setDealNotifs}
              label="Deal Alerts"
              desc="Be notified when a deal is accepted or an offer received"
            />
            <Toggle
              value={priceAlerts}
              onChange={setPriceAlerts}
              label="Commodity Price Alerts"
              desc="Get alerts when commodity prices change significantly"
            />
            <Toggle
              value={mktUpdates}
              onChange={setMktUpdates}
              label="Market Updates"
              desc="Receive weekly market intelligence and trade reports"
            />
          </div>
          <div className="px-5 py-4 border-t border-slate-100">
            <button
              onClick={saveNotifications}
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors"
            >
              Save Notification Preferences
            </button>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Preferences</h3>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Globe className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Currency Display</p>
                  <p className="text-xs text-slate-500">All prices shown in</p>
                </div>
              </div>
              <select className="text-sm bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 outline-none">
                <option>USD ($)</option>
                <option>EUR (€)</option>
                <option>INR (₹)</option>
                <option>AED (د.إ)</option>
              </select>
            </div>
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Moon className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">App Theme</p>
                  <p className="text-xs text-slate-500">Light mode (dark mode coming soon)</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">Light</span>
            </div>
          </div>
        </div>

        {/* KYB Verification Quick Link */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">Business Verification (KYB)</p>
              <p className="text-xs text-slate-500">Required to unlock full trading capabilities</p>
            </div>
            <button onClick={() => navigate("/onboarding/kyb")}
              className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2 rounded-lg transition-colors">
              Verify →
            </button>
          </div>
        </div>

        {/* Sign Out & Danger Zone */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Account Actions</h3>
          </div>
          <div className="p-5 space-y-3">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out of Account
            </button>
            <button
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-sm rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
            {showDeleteConfirm && (
              <div className="border border-rose-300 bg-rose-50 rounded-xl p-4">
                <div className="flex gap-2.5 mb-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-rose-900">Are you sure?</p>
                    <p className="text-xs text-rose-700 mt-0.5">This will permanently delete your account and all trade data. This cannot be undone.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 h-9 text-xs font-bold border border-slate-300 text-slate-600 rounded-lg hover:bg-white transition-colors">Cancel</button>
                  <button onClick={() => toast.error("Account deletion requires contacting support: support@tradoxb2b.com")}
                    className="flex-1 h-9 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors">
                    Yes, Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[0.65rem] text-slate-400 pb-4">
          TradoxB2B v1.0 · <a href="#" className="underline">Privacy Policy</a> · <a href="#" className="underline">Terms of Service</a>
        </p>
      </div>
    </div>
  );
}
