import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowRight, CheckCircle2, AlertCircle, ShieldCheck, Globe } from "lucide-react";
import { Button } from "../components/ui/Button";
import { auth } from "../config/firebase";
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  RecaptchaVerifier, 
  linkWithPhoneNumber
} from "firebase/auth";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  // Form State
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState(auth.currentUser?.email || "");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");

  // New Company Fields
  const [businessCategory, setBusinessCategory] = useState("Trading Company");
  const [gst, setGst] = useState("");
  const [iec, setIec] = useState("");
  const [address, setAddress] = useState("");

  // Verification State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [otpCode, setOtpCode] = useState("");
  const [smsSent, setSmsSent] = useState(false);

  const handleCreateAccount = async () => {
    setErrorMsg("");
    if (!email || (!password && !auth.currentUser) || !companyName || !fullName || !country || !address) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      if (auth.currentUser && auth.currentUser.email === email) {
        // User is already signed in with Firebase, skip account creation step
        await sendEmailVerification(auth.currentUser).catch(() => {});
        setStep(2);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        setStep(2);
      }
    } catch (error) {
      console.error("Error creating account:", error);
      if (error.code === "auth/email-already-in-use" && auth.currentUser) {
        // User exists and is currently signed in
        setStep(2);
      } else {
        setErrorMsg(error.message.replace("Firebase: ", ""));
      }
    } finally {
      setLoading(false);
    }
  };

  const checkEmailVerification = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        setEmailVerified(true);
        setErrorMsg("");
      } else {
        setErrorMsg("Email not verified yet. Please check your inbox and click the link.");
      }
    }
  };

  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    
    const container = document.getElementById('recaptcha-container');
    if (container) {
      container.innerHTML = '';
    }

    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible'
    });
  };

  const handleSendSms = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      setupRecaptcha();
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`;
      const result = await linkWithPhoneNumber(auth.currentUser, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(result);
      setSmsSent(true);
    } catch (error) {
      console.error("Error sending SMS:", error);
      let errMsg = error.message.replace("Firebase: ", "");
      if (errMsg.includes("invalid-phone-number")) {
        errMsg = "Invalid phone number format. Please include country code (e.g. +1).";
      } else if (errMsg.includes("too-many-requests")) {
        errMsg = "Too many SMS requests. Please wait a few minutes.";
      }
      setErrorMsg(errMsg);
      
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || !confirmationResult || !auth.currentUser) return;
    setErrorMsg("");
    setLoading(true);
    try {
      await confirmationResult.confirm(otpCode);
      setPhoneVerified(true);
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setErrorMsg("Invalid OTP code or number already linked. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const finalizeRegistration = async () => {
    if (emailVerified && phoneVerified && auth.currentUser) {
      setLoading(true);
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch(API_BASE + "/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            firebase_uid: auth.currentUser.uid,
            email: email,
            name: fullName,
            companyName: companyName,
            phone: phone,
            country: country,
            businessCategory: businessCategory,
            gst: gst,
            iec: iec,
            address: address
          })
        });
        
        if (response.ok) {
          navigate("/dashboard");
        } else {
          setErrorMsg("Failed to save company profile to database.");
        }
      } catch (error) {
        console.error("Error finalizing registration:", error);
        setErrorMsg("Network error saving profile.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-white text-foreground font-sans selection:bg-primary/30">
      
      {/* Left side branding (SaaS Split Screen) */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-brand-navy text-white p-12 relative overflow-hidden h-screen sticky top-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex flex-col gap-0.5 cursor-pointer mb-20" onClick={() => navigate("/")}>
            <div className="font-cinzel text-lg text-white tracking-[0.08em] leading-none uppercase">
              <span className="text-[1.3em]">T</span>radox <span className="text-[1.3em]">B2B</span>
            </div>
            <div className="text-[0.45rem] text-primary tracking-[0.3em] uppercase font-semibold">Enterprise Terminal</div>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-md">
            <div className="text-[0.65rem] font-mono tracking-widest text-primary uppercase mb-6 font-semibold">Company Registration</div>
            <h1 className="text-4xl font-heading font-semibold leading-tight tracking-tight mb-12 text-white">
              Join 18,000+ verified companies trading globally.
            </h1>
            
            <div className="space-y-6">
              <StepItem num="01" text="Register your company profile." active={step === 1} />
              <StepItem num="02" text="Secure terminal access via 2FA." active={step === 2} />
            </div>
          </div>

          <div className="relative z-10 mt-auto pt-12 border-t border-white/10 flex items-center justify-between text-xs text-slate-500 font-mono uppercase tracking-widest">
            <span>Â© 2024 TradoxB2B</span>
            <span>Enterprise Secure</span>
          </div>
        </div>
      </div>

      {/* Right side form */}
      <div className="w-full lg:w-[55%] flex flex-col p-8 lg:p-16 overflow-y-auto min-h-screen bg-white relative">
        
        {/* Mobile Logo */}
        <div className="lg:hidden flex flex-col gap-0.5 cursor-pointer absolute top-8 left-6" onClick={() => navigate("/")}>
          <div className="font-cinzel text-lg text-brand-navy tracking-[0.08em] leading-none uppercase">
            <span className="text-[1.3em]">T</span>radox <span className="text-[1.3em]">B2B</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full mt-12 lg:mt-0">
          
          <div className="flex items-center gap-4 mb-10 w-full">
            <div className="text-[0.65rem] font-mono tracking-widest text-slate-400 uppercase shrink-0 font-semibold">
              Step {step} of 2
            </div>
            <div className="h-[1px] w-full bg-border"></div>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{errorMsg}</p>
            </div>
          )}

          {/* Step 1: Company Profile */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-8">
              <h2 className="text-3xl font-heading font-semibold tracking-tight text-brand-navy mb-2">Company Registration</h2>
              <p className="text-muted-foreground text-sm mb-10">
                Create a unified account to buy and sell on Tradox.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-semibold tracking-[0.1em] text-brand-navy uppercase">Company Name *</label>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Trading LLC" className="w-full bg-white border border-border text-foreground focus:border-primary h-11 px-4 text-sm rounded-[3px] outline-none transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-semibold tracking-[0.1em] text-brand-navy uppercase">Contact Person *</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" className="w-full bg-white border border-border text-foreground focus:border-primary h-11 px-4 text-sm rounded-[3px] outline-none transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-semibold tracking-[0.1em] text-brand-navy uppercase">Business Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="w-full bg-white border border-border text-foreground focus:border-primary h-11 px-4 text-sm rounded-[3px] outline-none transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-semibold tracking-[0.1em] text-brand-navy uppercase">Phone (with country code) *</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 0000" className="w-full bg-white border border-border text-foreground focus:border-primary h-11 px-4 text-sm rounded-[3px] outline-none transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-semibold tracking-[0.1em] text-brand-navy uppercase">Country *</label>
                  <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Select country" className="w-full bg-white border border-border text-foreground focus:border-primary h-11 px-4 text-sm rounded-[3px] outline-none transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-semibold tracking-[0.1em] text-brand-navy uppercase">Business Category *</label>
                  <input type="text" value={businessCategory} onChange={e => setBusinessCategory(e.target.value)} placeholder="Trading Company" className="w-full bg-white border border-border text-foreground focus:border-primary h-11 px-4 text-sm rounded-[3px] outline-none transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-semibold tracking-[0.1em] text-brand-navy uppercase">GST Number (Optional)</label>
                  <input type="text" value={gst} onChange={e => setGst(e.target.value)} placeholder="GST Number" className="w-full bg-white border border-border text-foreground focus:border-primary h-11 px-4 text-sm rounded-[3px] outline-none transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-semibold tracking-[0.1em] text-brand-navy uppercase">IEC Number (Optional)</label>
                  <input type="text" value={iec} onChange={e => setIec(e.target.value)} placeholder="Import/Export Code" className="w-full bg-white border border-border text-foreground focus:border-primary h-11 px-4 text-sm rounded-[3px] outline-none transition-all shadow-sm" />
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-[0.65rem] font-semibold tracking-[0.1em] text-brand-navy uppercase">Company Address *</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Full Address" className="w-full bg-white border border-border text-foreground focus:border-primary h-24 p-4 text-sm rounded-[3px] outline-none transition-all shadow-sm resize-none"></textarea>
              </div>

              <div className="space-y-2 mb-8">
                <label className="text-[0.65rem] font-semibold tracking-[0.1em] text-brand-navy uppercase">Create Password *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" className="w-full bg-white border border-border text-foreground focus:border-primary h-11 px-4 text-sm rounded-[3px] outline-none transition-all shadow-sm" />
              </div>

              <Button 
                onClick={handleCreateAccount} 
                disabled={loading}
                className="w-full h-11 flex items-center justify-center group mb-6"
              >
                <span>{loading ? 'Creating Account...' : 'Continue to Verification'}</span>
                {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
              </Button>
              <div className="flex justify-center pt-6 border-t border-border">
                <span className="text-sm text-slate-500 cursor-pointer hover:text-brand-navy transition-colors font-medium" onClick={() => navigate("/login")}>
                  Already registered? Sign in
                </span>
              </div>
            </div>
          )}

          {/* Step 2: Verification */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-8">
              <h2 className="text-3xl font-heading font-semibold tracking-tight text-brand-navy mb-2">Verify your identity</h2>
              <p className="text-muted-foreground text-sm mb-10">
                Institutional-grade security requires dual-factor verification.
              </p>

              <div className="space-y-6 mb-12">
                {/* Email Verification */}
                <div className={`p-6 border rounded-xl transition-all ${emailVerified ? 'border-primary/30 bg-primary/5' : 'border-border bg-white shadow-sm'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-heading font-semibold text-brand-navy">Email Verification</h3>
                        {emailVerified && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                        {emailVerified 
                          ? "Your email is securely verified." 
                          : `We sent a verification link to ${email}. Click the link to verify.`}
                      </p>
                      {!emailVerified && (
                        <button 
                          onClick={checkEmailVerification}
                          className="text-[0.65rem] font-mono tracking-widest uppercase border border-border text-brand-navy hover:border-primary hover:text-primary transition-colors px-4 py-2 rounded-lg font-semibold"
                        >
                          I've verified my email
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phone Verification */}
                <div className={`p-6 border rounded-xl transition-all ${phoneVerified ? 'border-primary/30 bg-primary/5' : 'border-border bg-white shadow-sm'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-heading font-semibold text-brand-navy">Phone Verification</h3>
                    {phoneVerified && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                  
                  {!phoneVerified && !smsSent && (
                    <>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                        We will send a 6-digit OTP code to <span className="font-semibold text-brand-navy">{phone}</span>.
                      </p>
                      <button 
                        onClick={handleSendSms}
                        disabled={loading}
                        className="text-[0.65rem] font-mono tracking-widest uppercase border border-border text-brand-navy hover:border-primary hover:text-primary transition-colors px-4 py-2 rounded-lg disabled:opacity-50 font-semibold"
                      >
                        {loading ? 'Sending...' : 'Send SMS Code'}
                      </button>
                      <div id="recaptcha-container" className="mt-4"></div>
                    </>
                  )}

                  {!phoneVerified && smsSent && (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Enter the 6-digit code sent to your phone.
                      </p>
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
                    <p className="text-xs text-primary font-medium">Your phone number has been successfully verified.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end pt-6 border-t border-border">
                <Button 
                onClick={finalizeRegistration} 
                disabled={!emailVerified || !phoneVerified || loading}
                className="w-full h-11 flex items-center justify-center group"
              >
                <span>Complete Registration</span>
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

function StepItem({ num, text, active }) {
  return (
    <div className={`flex gap-5 transition-all duration-300 ${active ? 'opacity-100 translate-x-2' : 'opacity-40'}`}>
      <span className="font-mono text-primary font-bold text-lg shrink-0">{num}</span>
      <p className="text-white text-base font-medium">{text}</p>
    </div>
  );
}
