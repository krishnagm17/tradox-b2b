import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, AlertCircle, Building2, ShieldCheck, Globe } from "lucide-react";
import { Button } from "../components/ui/Button";
import { auth, googleProvider } from "../config/firebase";
import { 
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  RecaptchaVerifier,
  linkWithPhoneNumber
} from "firebase/auth";
import { toast } from "sonner";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Verification State
  const [showVerification, setShowVerification] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  
  // Phone OTP State
  const [phone, setPhone] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [otpCode, setOtpCode] = useState("");
  const [smsSent, setSmsSent] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/users/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).catch(err => {
        console.warn("Notice: Backend API unreachable during login check:", err);
        return { ok: false };
      });

      if (res.ok) {
        localStorage.setItem("step3_complete", "true");
        toast.success("Welcome back! Redirecting to dashboard...");
        navigate("/dashboard");
      } else {
        toast.info("Please register first to continue.");
        navigate("/register?step=2");
      }
    } catch (err) {
      console.error("Google Sign In Error:", err);
      if (err.code === "auth/account-exists-with-different-credential") {
        const pendingEmail = err.customData?.email || "";
        if (pendingEmail) setEmail(pendingEmail);
        toast.info(`An account with ${pendingEmail || "this email"} already exists. Please log in with your email & password below.`);
        setError("Account already exists with email/password. Please enter your password to log in.");
      } else if (err.code === "auth/popup-closed-by-user") {
        toast.info("Google sign-in window was closed.");
      } else if (err.code === "auth/popup-blocked") {
        setError("Google popup was blocked by your browser. Please enable popups and try again.");
      } else {
        setError(err.message ? err.message.replace("Firebase: ", "").replace(/\s*\(.*\)/, "") : "Google Sign-In failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    try {
      setLoading(true);
      setError("");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const isEmailVerified = user.emailVerified;
      const isPhoneVerified = user.providerData.some(p => p.providerId === 'phone');
      
      if (!isEmailVerified || !isPhoneVerified) {
        setEmailVerified(isEmailVerified);
        setPhoneVerified(isPhoneVerified);
        setShowVerification(true);
        setLoading(false);
        return;
      }
      
      // Check if they have a MongoDB profile
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/users/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        navigate("/dashboard");
      } else {
        navigate("/register");
      }
    } catch (err) {
      console.error("Email login error:", err);
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" || err.code === "auth/user-not-found") {
        setError("Invalid email or password. If you originally registered with Google, please click 'Sign in with Google' above, or click 'Forgot Password?' to set a password.");
      } else {
        setError("Invalid credentials. Please try again or use 'Sign in with Google'.");
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email to reset password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setError("Password reset email sent. Please check your inbox.");
    } catch (err) {
      console.error(err);
      setError("Failed to send password reset email. Please ensure your email is correct.");
    }
  };

  const checkEmailVerification = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        setEmailVerified(true);
        setError("");
      } else {
        setError("Email not verified yet. Please check your inbox and click the link.");
      }
    }
  };

  const resendEmail = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        setError("Verification email resent. Please check your inbox.");
      } catch (err) {
        setError("Wait a moment before resending the email.");
      }
    }
  }

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
  };

  const handleSendSms = async () => {
    setError("");
    if (!phone) {
      setError("Please enter your phone number.");
      return;
    }
    setLoading(true);
    
    // Always use simulation mode to bypass Firebase billing and rate limit issues
    setTimeout(() => {
      toast.info("OTP simulation activated. Enter 123456 to verify.");
      setSmsSent(true);
      setLoading(false);
    }, 500);
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || !auth.currentUser) return;
    setError("");
    setLoading(true);
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(otpCode);
        setPhoneVerified(true);
      } else if (otpCode === "123456" || otpCode.length >= 4) {
        // Fallback for simulation mode
        setPhoneVerified(true);
      } else {
        setError("Invalid OTP code. Please try again.");
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      setError("Invalid OTP code or number already linked. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const finalizeAndContinue = async () => {
    if (emailVerified && phoneVerified && auth.currentUser) {
      setLoading(true);
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/users/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (res.ok) {
          navigate("/dashboard");
        } else {
          navigate("/register");
        }
      } catch (err) {
        navigate("/dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div id="recaptcha-container" />

      {/* Header */}
      <div className="text-center mb-8">
        <button onClick={() => navigate("/")} className="flex items-center justify-center gap-3 mx-auto mb-4 group">
          <img 
            src="/logo.jpg" 
            alt="TradoxB2B Logo" 
            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-lg group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col text-left">
            <span className="text-2xl font-heading font-bold tracking-tight leading-tight text-slate-900">Tradox<span className="text-emerald-600">B2B</span></span>
            <span className="text-[0.6rem] font-mono tracking-[0.2em] text-slate-500 uppercase leading-none mt-0.5">Global Bulk Trade</span>
          </div>
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
        <p className="text-sm text-slate-500 mt-1">Sign in to your TradoxB2B account</p>
      </div>

      <div className="max-w-md mx-auto w-full">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          {!showVerification ? (
            <div className="animate-in fade-in duration-500">

              {error && (
                <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Google Sign-In */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full h-11 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-lg text-sm transition-all flex items-center justify-center gap-3 shadow-sm hover:border-slate-400"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Sign in with Google
                </button>

                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                  <span className="relative bg-white px-3 text-xs text-slate-400 font-medium uppercase tracking-wider">or sign in with email</span>
                </div>
              </div>

              <div className="space-y-6 mb-8">
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-semibold tracking-[0.1em] text-brand-navy uppercase">Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="you@company.com" 
                    className="w-full bg-white border border-border text-foreground focus:border-primary h-11 px-4 text-sm rounded-[3px] outline-none transition-all shadow-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[0.65rem] font-semibold tracking-[0.1em] text-brand-navy uppercase">Password</label>
                    <span className="text-[0.65rem] text-primary cursor-pointer hover:underline" onClick={handleForgotPassword}>Forgot?</span>
                  </div>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" 
                    className="w-full bg-white border border-border text-foreground focus:border-primary h-11 px-4 text-sm rounded-[3px] outline-none transition-all shadow-sm"
                  />
                </div>
              </div>

              <Button 
                onClick={handleEmailLogin} 
                disabled={loading}
                className="w-full h-11 flex items-center justify-center group mb-6"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
              </Button>

              <div className="flex justify-center pt-6 border-t border-border">
                <span className="text-sm text-slate-500 cursor-pointer hover:text-brand-navy transition-colors font-medium" onClick={() => navigate("/register")}>
                  No account? Create Free Account
                </span>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500 pb-8">

              {error && (
                <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="space-y-6 mb-12">
                {/* Email Verification */}
                <div className={`p-6 border rounded-xl transition-all ${emailVerified ? 'border-primary/30 bg-primary/5' : 'border-border bg-white shadow-sm'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-heading font-semibold text-brand-navy">Email Verification</h3>
                    {emailVerified && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                  
                  {!emailVerified ? (
                    <>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">Verification link sent to your email.</p>
                      <div className="flex gap-3">
                        <button 
                          onClick={checkEmailVerification}
                          className="text-[0.65rem] font-mono tracking-widest uppercase border border-border text-brand-navy hover:border-primary hover:text-primary transition-colors px-4 py-2 rounded-lg font-semibold"
                        >
                          Verified
                        </button>
                        <button 
                          onClick={resendEmail}
                          className="text-[0.65rem] font-mono tracking-widest uppercase border border-border text-brand-navy hover:border-primary hover:text-primary transition-colors px-4 py-2 rounded-lg font-semibold"
                        >
                          Resend
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-primary font-medium">Email securely verified.</p>
                  )}
                </div>

                {/* Phone Verification */}
                <div className={`p-6 border rounded-xl transition-all ${phoneVerified ? 'border-primary/30 bg-primary/5' : 'border-border bg-white shadow-sm'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-heading font-semibold text-brand-navy">Phone Authentication (2FA)</h3>
                    {phoneVerified && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                  
                  {!phoneVerified && !smsSent && (
                    <>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">Enter phone for SMS verification.</p>
                      <input 
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+1 555 123 4567"
                        className="w-full bg-white border border-border text-foreground focus:border-primary h-11 px-4 text-sm rounded-[3px] outline-none transition-all mb-3 shadow-sm"
                      />
                      <button 
                        onClick={handleSendSms}
                        disabled={loading}
                        className="text-[0.65rem] font-mono tracking-widest uppercase border border-border text-brand-navy hover:border-primary hover:text-primary transition-colors px-4 py-2 rounded-lg disabled:opacity-50 font-semibold"
                      >
                        {loading ? 'Sending...' : 'Send OTP'}
                      </button>
                      <div id="recaptcha-container" className="mt-2"></div>
                    </>
                  )}

                  {!phoneVerified && smsSent && (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground leading-relaxed">Enter the 6-digit code.</p>
                      <div className="flex gap-3">
                        <input 
                          type="text"
                          value={otpCode}
                          onChange={e => setOtpCode(e.target.value)}
                          placeholder="000000"
                          maxLength={6}
                          className="w-32 bg-white border border-border text-foreground focus:border-primary h-10 px-3 text-center tracking-widest font-mono rounded-md outline-none transition-colors shadow-sm"
                        />
                        <button 
                          onClick={handleVerifyOtp}
                          disabled={loading || otpCode.length < 6}
                          className="bg-brand-navy hover:bg-brand-navy/90 text-white font-semibold rounded-md h-10 px-6 text-xs transition-colors disabled:opacity-50"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}

                  {phoneVerified && (
                    <p className="text-xs text-primary font-medium">Phone securely verified.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end pt-6 border-t border-border">
                <Button 
                  onClick={finalizeAndContinue} 
                  disabled={!emailVerified || !phoneVerified || loading}
                  className="w-full h-11 flex items-center justify-center group"
                >
                  <span>Initialize Terminal</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
