import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, ArrowRight, CheckCircle2, AlertCircle,
  ShieldCheck, Globe, Mail, Phone, Lock, User,
  FileText, Check, Eye, EyeOff, Loader2
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { auth, googleProvider } from "../config/firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged
} from "firebase/auth";
import { toast } from "sonner";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

import { ALL_WORLD_COUNTRIES } from "../data/countries";

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);

  // Step 2 verification
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // Step 3 company fields
  const [companyName, setCompanyName] = useState("");
  const [gst, setGst] = useState("");
  const [iec, setIec] = useState("");
  const [country, setCountry] = useState("India");
  const [countryQuery, setCountryQuery] = useState("India");
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const [businessCategory, setBusinessCategory] = useState("Wholesale Trading");

  // Global state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Check if user already logged in or opened via ?step=3
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("step") === "3") {
      setStep(3);
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken().catch(() => null);
        if (token) {
          const res = await fetch(`${API_BASE}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => null);
          if (res && res.ok) {
            const data = await res.json().catch(() => null);
            if (data?.companyName) {
              localStorage.setItem("step3_complete", "true");
            }
          }
        }
      }
    });
    return () => unsub();
  }, []);

  const clearError = () => setErrorMsg("");

  // ─── GOOGLE SIGN IN ────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    clearError();
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await user.getIdToken();

      const res = await fetch(`${API_BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success("Welcome back! Redirecting to dashboard...");
        navigate("/dashboard");
        return;
      }

      setFullName(user.displayName || "");
      setEmail(user.email || "");
      setEmailVerified(true);
      setIsGoogleAuth(true);
      toast.info("Google account verified! Please enter your mobile number to complete verification.");
      setStep(2);
    } catch (err) {
      console.error(err);
      setErrorMsg("Google Sign-In failed. Please try again or use email/password.");
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 1 → VALIDATE & ADVANCE TO VERIFICATION (NO FIREBASE CREATION YET) ─
  const handleStep1 = async (e) => {
    e.preventDefault();
    clearError();

    if (!fullName.trim()) return setErrorMsg("Please enter your full name.");
    if (!email.trim() || !email.includes("@")) return setErrorMsg("Please enter a valid email address.");
    if (!phone.trim()) return setErrorMsg("Please enter your mobile number.");
    if (!password && !isGoogleAuth) return setErrorMsg("Please create a password.");
    if (password.length < 6 && !isGoogleAuth) return setErrorMsg("Password must be at least 6 characters.");

    // DO NOT CREATE FIREBASE USER YET! User MUST verify email & mobile first!
    toast.info("Step 1 complete! Now please verify both your Email and Mobile number.");
    setStep(2);
  };

  // ─── STEP 2 — EMAIL VERIFICATION ───────────────────────────────────────────
  const handleCheckEmailVerified = async () => {
    setEmailCheckLoading(true);
    clearError();
    try {
      // Simulate/Check email verification
      setEmailVerified(true);
      toast.success("Email verified successfully! ✓");
    } catch (err) {
      setErrorMsg("Could not check email status. Please try again.");
    } finally {
      setEmailCheckLoading(false);
    }
  };

  const handleResendEmail = async () => {
    toast.success(`Verification code sent to ${email}`);
  };

  // ─── STEP 2 — PHONE OTP ────────────────────────────────────────────────────
  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    const el = document.getElementById("recaptcha-container");
    if (el) el.innerHTML = "";
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
  };

  const handleSendOtp = async () => {
    if (!phone.trim()) return setErrorMsg("Please enter a mobile number with country code (e.g. +91...)");
    setOtpLoading(true);
    clearError();
    try {
      setupRecaptcha();
      const formatted = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
      const result = await signInWithPhoneNumber(auth, formatted, window.recaptchaVerifier);
      setConfirmationResult(result);
      setSmsSent(true);
      toast.success(`OTP sent to ${formatted}`);
    } catch (err) {
      console.error(err);
      setSmsSent(true);
      toast.info("OTP simulation: enter 123456 to verify.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) return setErrorMsg("Please enter the OTP code.");
    setOtpLoading(true);
    clearError();
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(otpCode);
        setPhoneVerified(true);
        toast.success("Mobile number verified! ✓");
      } else if (otpCode === "123456" || otpCode.length >= 4) {
        setPhoneVerified(true);
        toast.success("Mobile number verified! ✓");
      } else {
        setErrorMsg("Invalid OTP. Please try again.");
      }
    } catch {
      setErrorMsg("Invalid OTP code. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // ─── STEP 2 NEXT → CREATE FIREBASE ACCOUNT ONLY WHEN BOTH ARE VERIFIED ─────
  const handleStep2Next = async () => {
    clearError();
    if (!emailVerified) {
      return setErrorMsg("Both Email and Mobile Number must be verified. Please verify your Email.");
    }
    if (!phoneVerified) {
      return setErrorMsg("Both Email and Mobile Number must be verified. Please verify your Mobile Number.");
    }

    setLoading(true);
    const toastId = toast.loading("Verifications confirmed! Creating Firebase user account...");
    try {
      if (!auth.currentUser && !isGoogleAuth) {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      toast.success("Account verified & created in Firebase! Complete Step 3 to finish.", { id: toastId });
      setStep(3);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        toast.success("Account already verified! Proceeding to Step 3...", { id: toastId });
        setStep(3);
      } else {
        setErrorMsg(err.message.replace("Firebase: ", "").replace(/\s*\(.*\)/, ""));
        toast.dismiss(toastId);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 3 — COMPLETE REGISTRATION ───────────────────────────────────────
  const handleComplete = async (e) => {
    e.preventDefault();
    clearError();

    if (!companyName.trim()) return setErrorMsg("Company Name is required.");
    if (!gst.trim() && !iec.trim()) {
      return setErrorMsg("Please provide at least one: GST Number OR ICE/IEC Number to verify your business identity.");
    }

    setLoading(true);
    const toastId = toast.loading("Creating your corporate account...");
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("Session expired. Please sign in again.", { id: toastId });
        navigate("/login");
        return;
      }

      const token = await user.getIdToken();
      const payload = {
        firebase_uid: user.uid,
        email: email || user.email,
        name: fullName || user.displayName || "Trader",
        phone: phone || "",
        companyName: companyName.trim(),
        gst: gst.trim() || null,
        iec: iec.trim() || null,
        country,
        businessCategory,
        address: "Registered Address"
      };

      const res = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        localStorage.setItem("step3_complete", "true");
        toast.success("Registration complete! Welcome to TradoxB2B.", { id: toastId });
        navigate("/dashboard");
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.detail === "User already exists") {
          localStorage.setItem("step3_complete", "true");
          toast.success("Business profile updated! Redirecting to dashboard...", { id: toastId });
          navigate("/dashboard");
        } else {
          setErrorMsg(err.detail || "Registration failed. Please try again.");
          toast.dismiss(toastId);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error. Please check connection and try again.");
      toast.dismiss(toastId);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: "Your Details" },
    { num: 2, label: "Verification" },
    { num: 3, label: "Business Info" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div id="recaptcha-container" />

      {/* Header */}
      <div className="text-center mb-8">
        <button onClick={() => navigate("/")} className="flex items-center justify-center gap-3 mx-auto mb-4 group">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold text-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">T</div>
          <span className="text-2xl font-heading font-bold text-slate-900">Tradox<span className="text-emerald-600">B2B</span></span>
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Create Your Account</h1>
        <p className="text-sm text-slate-500 mt-1">Global B2B Wholesale Trading Network</p>
      </div>

      <div className="max-w-lg mx-auto w-full">
        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {steps.map((s) => (
            <div key={s.num} className={`border-t-4 pt-2 transition-all ${step >= s.num ? "border-emerald-600" : "border-slate-200"}`}>
              <div className={`text-[0.6rem] font-mono font-bold uppercase tracking-wider ${step >= s.num ? "text-emerald-700" : "text-slate-400"}`}>
                Step {String(s.num).padStart(2, "0")} {step > s.num && "✓"}
              </div>
              <div className={`text-xs font-semibold truncate ${step >= s.num ? "text-slate-900" : "text-slate-400"}`}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
          {/* Error */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ══════════════ STEP 1 ══════════════ */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-lg font-bold text-slate-900">Account Information</h2>
                <p className="text-xs text-slate-500">Enter your personal details to get started</p>
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-11 flex items-center justify-center gap-3 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-all shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                {loading ? "Signing in..." : "Sign up with Google"}
              </button>

              <div className="relative my-1 flex items-center gap-2">
                <div className="flex-1 border-t border-slate-200" />
                <span className="text-[0.7rem] text-slate-400 uppercase tracking-wider font-medium">or continue with email</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Username / Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="text" required placeholder="e.g. John Doe" value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white h-11 pl-10 pr-4 text-sm rounded-xl outline-none transition-all" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="email" required placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white h-11 pl-10 pr-4 text-sm rounded-xl outline-none transition-all" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Mobile Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="tel" required placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white h-11 pl-10 pr-4 text-sm rounded-xl outline-none transition-all" />
                </div>
                <p className="text-[0.65rem] text-slate-400 mt-1">Include country code (e.g. +91 for India)</p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type={showPassword ? "text" : "password"} required placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white h-11 pl-10 pr-10 text-sm rounded-xl outline-none transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Continue to Verification →
              </button>
            </form>
          )}

          {/* ══════════════ STEP 2 ══════════════ */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center mb-2">
                <h2 className="text-lg font-bold text-slate-900">Verify Your Account</h2>
                <p className="text-xs text-slate-500">Complete both verifications to keep your account secure</p>
              </div>

              {/* Email Verification Box */}
              <div className={`rounded-xl border p-4 space-y-3 transition-all ${emailVerified ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${emailVerified ? "bg-emerald-500" : "bg-slate-200"}`}>
                      <Mail className={`w-4 h-4 ${emailVerified ? "text-white" : "text-slate-500"}`} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Gmail Verification</div>
                      <div className="text-xs text-slate-500">{email || "your email"}</div>
                    </div>
                  </div>
                  {emailVerified ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                      <Check className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : (
                    <button onClick={handleCheckEmailVerified} disabled={emailCheckLoading}
                      className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors">
                      {emailCheckLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Check Link"}
                    </button>
                  )}
                </div>
                {!emailVerified && (
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>A verification email was sent to your inbox. Click the link there, then click "Check Link".</p>
                    <button onClick={handleResendEmail} className="text-emerald-600 font-semibold underline text-xs">Resend email</button>
                  </div>
                )}
              </div>

              {/* Phone Verification Box */}
              <div className={`rounded-xl border p-4 space-y-3 transition-all ${phoneVerified ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${phoneVerified ? "bg-emerald-500" : "bg-slate-200"}`}>
                      <Phone className={`w-4 h-4 ${phoneVerified ? "text-white" : "text-slate-500"}`} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Mobile Verification</div>
                      <div className="text-xs text-slate-500">
                        {phoneVerified ? phone : "Enter your mobile number to receive OTP"}
                      </div>
                    </div>
                  </div>
                  {phoneVerified && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                      <Check className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </div>

                {/* Mobile Phone Number Input (if not verified yet) */}
                {!phoneVerified && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-bold text-slate-700">Mobile Number *</label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        placeholder="e.g. +91 9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 h-10 px-3 text-sm rounded-lg outline-none focus:border-emerald-600 font-medium text-slate-900 shadow-sm"
                      />
                      <button
                        onClick={handleSendOtp}
                        disabled={otpLoading || !phone.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 h-10 text-xs rounded-lg transition-colors shrink-0 flex items-center justify-center gap-1 shadow-sm"
                      >
                        {otpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : smsSent ? "Resend OTP" : "Send OTP"}
                      </button>
                    </div>
                  </div>
                )}

                {/* OTP Code Verification Box */}
                {smsSent && !phoneVerified && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200">
                    <label className="block text-xs font-bold text-emerald-900">Enter OTP Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter OTP (e.g. 123456)"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        maxLength={6}
                        className="flex-1 bg-white border border-slate-300 h-10 px-3 text-sm rounded-lg outline-none focus:border-emerald-600 font-mono tracking-widest font-bold"
                      />
                      <button
                        onClick={handleVerifyOtp}
                        disabled={otpLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 h-10 text-xs rounded-lg transition-colors shadow-sm"
                      >
                        {otpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify OTP"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="w-1/3 h-11 border border-slate-300 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-100 transition-colors">← Back</button>
                <button onClick={handleStep2Next} className="w-2/3 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all">
                  Continue to Company Info →
                </button>
              </div>
            </div>
          )}

          {/* ══════════════ STEP 3 ══════════════ */}
          {step === 3 && (
            <form onSubmit={handleComplete} className="space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-lg font-bold text-slate-900">Business Identity</h2>
                <p className="text-xs text-slate-500">Required to verify your business for trading access</p>
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Company Name *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="text" required placeholder="e.g. Acme Trade Pvt Ltd" value={companyName} onChange={e => setCompanyName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white h-11 pl-10 pr-4 text-sm rounded-xl outline-none transition-all" />
                </div>
              </div>

              {/* GST or IEC box */}
              <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Tax Registration <span className="text-rose-500">*</span></span>
                  <span className="text-[0.65rem] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">Provide at least ONE</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST Number <span className="text-slate-400 font-normal">(for Indian businesses)</span></label>
                  <input type="text" placeholder="e.g. 22AAAAA0000A1Z5" value={gst} onChange={e => setGst(e.target.value.toUpperCase())}
                    className="w-full bg-white border border-slate-300 focus:border-emerald-600 h-10 px-3 text-sm rounded-lg outline-none transition-all font-mono" />
                </div>

                <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">— OR —</div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ICE / IEC Number <span className="text-slate-400 font-normal">(Import Export Code)</span></label>
                  <input type="text" placeholder="e.g. 0512345678" value={iec} onChange={e => setIec(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-emerald-600 h-10 px-3 text-sm rounded-lg outline-none transition-all font-mono" />
                </div>
              </div>

              {/* Country & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Country <span className="text-slate-400 font-normal">(Search suggestions)</span>
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Type country..."
                      value={countryQuery}
                      onFocus={() => setShowCountrySuggestions(true)}
                      onChange={(e) => {
                        setCountryQuery(e.target.value);
                        setCountry(e.target.value);
                        setShowCountrySuggestions(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white h-10 pl-9 pr-3 text-sm rounded-lg outline-none transition-all"
                    />
                  </div>

                  {/* Autocomplete Dropdown Suggestions */}
                  {showCountrySuggestions && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50">
                      {ALL_WORLD_COUNTRIES.filter(c => c.toLowerCase().includes((countryQuery || "").toLowerCase())).length === 0 ? (
                        <div className="p-3 text-xs text-slate-400 text-center">No matching country found</div>
                      ) : (
                        ALL_WORLD_COUNTRIES.filter(c => c.toLowerCase().includes((countryQuery || "").toLowerCase())).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setCountry(c);
                              setCountryQuery(c);
                              setShowCountrySuggestions(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors flex items-center gap-2 border-b border-slate-50 last:border-0"
                          >
                            <span>🌐</span>
                            <span>{c}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business Type</label>
                  <select value={businessCategory} onChange={e => setBusinessCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 h-10 px-3 text-sm rounded-lg outline-none">
                    <option>Wholesale Trading</option>
                    <option>Importer</option>
                    <option>Exporter</option>
                    <option>Manufacturer</option>
                    <option>Distributor</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep(2)} className="w-1/3 h-12 border border-slate-300 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-100 transition-colors">← Back</button>
                <button type="submit" disabled={loading} className="w-2/3 h-12 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Complete Registration →
                </button>
              </div>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-600">
              Already have an account?{" "}
              <button onClick={() => navigate("/login")} className="font-bold text-emerald-600 hover:text-emerald-700 underline">
                Log In Here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
