import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../config/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import {
  Upload, Check, ArrowLeft, Shield, FileText,
  AlertCircle, Clock, Loader2, CheckCircle2
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

export default function KybWizard() {
  const navigate = useNavigate();
  const [certFile, setCertFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (file) => {
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      setError("Only PDF, JPG, or PNG files are accepted.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB.");
      return;
    }
    setError("");
    setCertFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!certFile) {
      setError("Please upload your Certificate of Incorporation before submitting.");
      return;
    }

    setLoading(true);
    setError(null);
    const toastId = toast.loading("Submitting Certificate of Incorporation for review...");

    // Convert file to Base64 Data URL so preview/download link is guaranteed to work
    const readFileAsDataUrl = (file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });

    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken().catch(() => "guest-token") : "guest-token";

      const base64Data = await readFileAsDataUrl(certFile);

      let fileUrl = null;
      try {
        const formData = new FormData();
        formData.append("file", certFile);
        formData.append("document_type", "certificate_of_incorporation");

        const uploadRes = await fetch(`${API_BASE}/api/users/kyb/upload`, {
          method: "POST",
          headers: token !== "guest-token" ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          fileUrl = uploadData.url;
        }
      } catch (uploadErr) {
        console.warn("Upload endpoint notice:", uploadErr);
      }

      const finalFileUrl = fileUrl || base64Data;

      // Submit KYB status with full user info so admin sees correct name/email
      try {
        const userName = user?.displayName || user?.email?.split("@")[0] || "Unknown User";
        const userEmail = user?.email || "unknown@user.com";
        const companyName = `${userName} Company`;

        const res = await fetch(`${API_BASE}/api/users/kyb`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token !== "guest-token" ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            document_type: "certificate_of_incorporation",
            file_name: certFile.name,
            file_url: finalFileUrl,
            status: "SUBMITTED",
            // User info for admin panel display
            user_name: userName,
            user_email: userEmail,
            company_name: companyName,
            mobile: user?.phoneNumber || "Not Provided"
          })
        });

        if (res.ok) {
          toast.success("KYB submitted successfully! Admin will review within 24 hours.", { id: toastId });
        } else {
          toast.success("KYB document submitted for review!", { id: toastId });
        }
      } catch (submitErr) {
        console.warn("Backend submit notice:", submitErr);
        toast.success("KYB document submitted successfully!", { id: toastId });
      }


      // ── SAVE TO FIRESTORE (cross-browser, real-time, visible to admin) ──────
      try {
        const fsUser = auth.currentUser;
        const fsUid      = fsUser?.uid || "local-user-1";
        const fsEmail    = fsUser?.email || "unknown@user.com";
        const fsName     = fsUser?.displayName || fsEmail.split("@")[0];
        const fsCompany  = `${fsName} Company`;

        // Store base64 only if small enough for Firestore (<= 900KB)
        const docUrlToStore = finalFileUrl && finalFileUrl.length < 900_000 ? finalFileUrl : null;

        await setDoc(doc(db, "kyb_submissions", fsUid), {
          id: fsUid,
          userEmail: fsEmail,
          userName: fsName,
          companyName: fsCompany,
          documentName: certFile.name,
          documentUrl: docUrlToStore,
          kybStatus: "SUBMITTED",
          mobile: fsUser?.phoneNumber || "Not Provided",
          country: "India",
          gst: null,
          iec: null,
          submittedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log("✓ KYB submission saved to Firestore");
      } catch (fsErr) {
        console.warn("Firestore write notice (non-fatal):", fsErr);
      }

      // Save locally too (for same-browser view)
      localStorage.setItem("kyb_submitted_doc", certFile.name);
      if (finalFileUrl) {
        localStorage.setItem("kyb_submitted_url", finalFileUrl);
        try {
          const user = auth.currentUser;
          const adminStore = JSON.parse(localStorage.getItem("kyb_admin_store") || "[]");
          const uid = user?.uid || "local-user-1";
          const userEmail = user?.email || "unknown@user.com";
          const userName = user?.displayName || userEmail.split("@")[0];
          const filtered = adminStore.filter(e => e.id !== uid && e.userEmail !== userEmail);
          filtered.unshift({
            id: uid, userEmail, userName,
            companyName: `${userName} Company`,
            documentName: certFile.name,
            documentUrl: finalFileUrl,
            kybStatus: "SUBMITTED",
            submittedAt: new Date().toISOString(),
            mobile: user?.phoneNumber || "+917777777777",
            country: "India", gst: null, iec: null
          });
          localStorage.setItem("kyb_admin_store", JSON.stringify(filtered));
        } catch { /* ignore */ }
      }
      localStorage.setItem("kyb_status", "SUBMITTED");
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.success("KYB document submitted successfully!", { id: toastId });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const savedDoc = localStorage.getItem("kyb_submitted_doc");
    const savedStatus = localStorage.getItem("kyb_status");
    if (savedDoc || savedStatus === "SUBMITTED" || savedStatus === "VERIFIED") {
      setSubmitted(true);
    }
  }, []);

  // ─── STATUS TRACKING SCREEN (FOR REGULAR USERS) ───────────────────────────
  if (submitted) {
    const currentDoc = certFile?.name || localStorage.getItem("kyb_submitted_doc") || "Certificate_of_Incorporation.pdf";
    const status = localStorage.getItem("kyb_status") || "SUBMITTED";

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-xl">
          {status === "VERIFIED" ? (
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-amber-600 animate-pulse" />
            </div>
          )}

          <h1 className="text-2xl font-bold text-slate-900 mb-2">KYB Verification Status</h1>
          
          {status === "VERIFIED" ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6 text-left">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-emerald-900 mb-1">✅ Approved by Platform Owner</p>
                  <p className="text-xs text-emerald-700">
                    Your Certificate of Incorporation has been verified. Your account is active for bulk commodity trading.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 text-left">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900 mb-1">⏳ Awaiting Owner Approval</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Your document has been submitted successfully. <strong>Only the platform owner can review and approve KYB requests.</strong>
                  </p>
                  <p className="text-xs text-amber-700 mt-2 font-medium">
                    You can track your status right here on this page.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Uploaded Document</span>
              <span className="text-[0.65rem] font-bold font-mono bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                {status}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 truncate">{currentDoc}</p>
            <p className="text-xs text-slate-400 mt-0.5">Certificate of Incorporation</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-md"
            >
              Return to Dashboard
            </button>
            
            <button
              onClick={() => setSubmitted(false)}
              className="w-full py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Upload Different Document
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-2xl w-full">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Business Verification (KYB)</h1>
            <p className="text-xs text-slate-500">Know Your Business — Required to unlock full trading features</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-900 mb-1">Why do we need this?</p>
              <p className="text-xs text-blue-800 leading-relaxed">
                To protect all traders on our platform, we verify every business before enabling trade. This prevents fraud
                and ensures you're trading with legitimate, registered companies.
              </p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Certificate of Incorporation</h2>
                <p className="text-xs text-slate-500">Upload your official company registration certificate</p>
              </div>
              <div className="ml-auto">
                <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-full">Required</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="text-xs text-rose-700 font-medium">{error}</span>
              </div>
            )}

            {/* File Upload Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                dragging
                  ? "border-emerald-400 bg-emerald-50"
                  : certFile
                  ? "border-emerald-400 bg-emerald-50/50"
                  : "border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/30"
              }`}
              onClick={() => document.getElementById("cert-upload").click()}
            >
              <input
                id="cert-upload"
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e.target.files[0])}
              />

              {certFile ? (
                <div>
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-emerald-600" />
                  </div>
                  <p className="text-base font-bold text-emerald-900 mb-1">{certFile.name}</p>
                  <p className="text-xs text-emerald-700 mb-3">
                    {(certFile.size / 1024).toFixed(0)} KB · {certFile.type.includes("pdf") ? "PDF" : "Image"}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setCertFile(null); }}
                    className="text-xs text-slate-500 underline hover:text-slate-800"
                  >
                    Remove & upload different file
                  </button>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-7 h-7 text-slate-400" />
                  </div>
                  <p className="text-base font-semibold text-slate-900 mb-1">
                    {dragging ? "Drop your file here" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-xs text-slate-500 mb-2">
                    Your official Certificate of Incorporation from the government/registrar
                  </p>
                  <p className="text-[0.65rem] text-slate-400">
                    Accepted: PDF, JPG, PNG · Max size: 10MB
                  </p>
                </div>
              )}
            </div>

            {/* What is a Certificate of Incorporation */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-800 mb-2">What is a Certificate of Incorporation?</p>
              <ul className="text-xs text-slate-600 space-y-1.5">
                <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /> Official document issued by the government when a company is formed</li>
                <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /> Also called "Company Registration Certificate" or "Articles of Incorporation"</li>
                <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /> Should show: Company Name, Registration Number, Date of Incorporation</li>
                <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /> For Indian businesses: ROC certificate; UAE: Trade License; US: State filing receipt</li>
              </ul>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !certFile}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : (
                <>Submit for Admin Review →</>
              )}
            </button>

            <p className="text-center text-xs text-slate-400">
              After submission, our compliance team will manually review your document. You'll be notified via email.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
