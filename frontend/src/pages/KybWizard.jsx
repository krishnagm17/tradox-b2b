import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import { supabase } from "../config/supabase";
import { toast } from "sonner";
import {
  Upload, Check, ArrowLeft, Shield, FileText,
  AlertCircle, Clock, Loader2, CheckCircle2, XCircle
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

export default function KybWizard() {
  const navigate = useNavigate();
  const [certFile, setCertFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // Status: "Not Submitted", "Pending", "Approved", "Rejected"
  const [status, setStatus] = useState("Not Submitted");
  const [kybData, setKybData] = useState(null);
  const [error, setError] = useState("");
  
  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [iecNumber, setIecNumber] = useState("");

  const fetchStatus = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      
      const res = await fetch(`${API_BASE}/api/kyb/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status && data.status !== "Not Submitted") {
          setStatus(data.status);
          setKybData(data);
        } else {
          setStatus("Not Submitted");
        }
      }
    } catch (err) {
      console.error("Failed to fetch KYB status:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCompanyName(`${user.displayName || user.email.split("@")[0]} Company`);
        fetchStatus();
      } else {
        setFetching(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Supabase Realtime subscription
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kyb_requests',
          filter: `firebase_uid=eq.${user.uid}`
        },
        (payload) => {
          console.log("Realtime update received:", payload);
          if (payload.new && payload.new.status) {
            setStatus(payload.new.status);
            setKybData(payload.new);
            if (payload.new.status === "Approved") {
              toast.success("Your KYB verification has been approved!");
            } else if (payload.new.status === "Rejected") {
              toast.error("Your KYB verification was rejected.");
            }
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    if (!companyName) {
      setError("Company Name is required.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Submitting verification documents...");

    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();

      const formData = new FormData();
      formData.append("file", certFile);
      formData.append("company_name", companyName);
      if (gstNumber) formData.append("gst_number", gstNumber);
      if (iecNumber) formData.append("iec_number", iecNumber);

      const res = await fetch(`${API_BASE}/api/kyb/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        toast.success("KYB submitted successfully! Admin will review within 24 hours.", { id: toastId });
        setStatus("Pending");
        setKybData({
          document_name: certFile.name,
          submitted_at: new Date().toISOString()
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Submission failed");
      }
    } catch (submitErr) {
      console.error("KYB submit error:", submitErr);
      setError(submitErr.message || "Failed to submit KYB. Please try again.");
      toast.error("Failed to submit KYB.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#10B981] animate-spin" />
      </div>
    );
  }

  // --- STATUS VIEWS ---
  if (status === "Pending") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#0B1220] mb-2">KYB Verification Status</h2>
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8 text-left">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-amber-900">Awaiting Owner Approval</h3>
            </div>
            <p className="text-amber-800 text-sm leading-relaxed">
              Your document has been submitted successfully. <strong>Only the platform owner can review and approve KYB requests.</strong>
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between bg-slate-50 mb-8 text-left">
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">UPLOADED DOCUMENT</p>
              <p className="font-medium text-[#0B1220]">{kybData?.document_name || "Document.pdf"}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Submitted: {kybData?.submitted_at ? new Date(kybData.submitted_at).toLocaleDateString() : "Just now"}
              </p>
            </div>
            <div className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
              PENDING
            </div>
          </div>

          <button onClick={() => navigate("/dashboard")} className="w-full py-3.5 bg-[#10B981] text-white font-bold rounded-xl shadow-lg hover:bg-[#0EA5E9] transition-all">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (status === "Approved") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle2 className="w-10 h-10 text-[#10B981]" />
          </div>
          <h2 className="text-2xl font-bold text-[#0B1220] mb-2">KYB Approved!</h2>
          <p className="text-slate-600 mb-8">Your business has been successfully verified. You now have full access to trading tools.</p>
          <button onClick={() => navigate("/dashboard")} className="w-full py-3.5 bg-[#10B981] text-white font-bold rounded-xl shadow-lg hover:bg-[#0EA5E9] transition-all">
            Enter Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (status === "Rejected") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#0B1220] mb-2">Verification Rejected</h2>
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-8 text-left">
            <p className="text-red-800 text-sm leading-relaxed mb-2">
              Unfortunately, your recent KYB submission was rejected.
            </p>
            <p className="text-red-900 text-sm font-semibold">
              Reason: {kybData?.rejection_reason || "No specific reason provided by admin."}
            </p>
          </div>
          <button onClick={() => { setStatus("Not Submitted"); setCertFile(null); }} className="w-full py-3.5 bg-[#10B981] text-white font-bold rounded-xl shadow-lg hover:bg-[#0EA5E9] mb-3 transition-all">
            Submit New Document
          </button>
          <button onClick={() => navigate("/dashboard")} className="w-full py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl shadow hover:bg-slate-200 transition-all">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // --- DEFAULT UPLOAD VIEW (Not Submitted) ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="w-full bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors group">
            <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-900" />
          </button>
          <h1 className="text-xl font-bold text-[#0B1220] flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#10B981]" />
            KYB Verification
          </h1>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-[#0B1220] mb-2">Submit Business Details</h2>
              <p className="text-slate-500 mb-8">Upload your incorporation certificate to unlock full platform features.</p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Company Name *</label>
                    <input 
                      type="text" 
                      required
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] transition-all"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">GST Number (Optional)</label>
                      <input 
                        type="text" 
                        value={gstNumber}
                        onChange={e => setGstNumber(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">IEC Number (Optional)</label>
                      <input 
                        type="text" 
                        value={iecNumber}
                        onChange={e => setIecNumber(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Upload Certificate *</label>
                  {!certFile ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleDrop}
                      className={`relative w-full h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 transition-all duration-200 ${
                        dragging ? "border-[#10B981] bg-[#10B981]/5" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="file"
                        onChange={(e) => handleFileChange(e.target.files[0])}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                        <Upload className={`w-6 h-6 ${dragging ? "text-[#10B981]" : "text-slate-400"}`} />
                      </div>
                      <p className="text-sm font-semibold text-slate-700 mb-1">
                        Drag & drop or <span className="text-[#10B981]">click to upload</span>
                      </p>
                      <p className="text-xs text-slate-500">PDF, JPG, PNG (Max 10MB)</p>
                    </div>
                  ) : (
                    <div className="w-full p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between group">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="truncate pr-4">
                          <p className="text-sm font-bold text-emerald-900 truncate">{certFile.name}</p>
                          <p className="text-xs text-emerald-600">
                            {(certFile.size / 1024 / 1024).toFixed(2)} MB • Ready to submit
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCertFile(null)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={loading || !certFile}
                    className="w-full py-3.5 bg-[#0B1220] hover:bg-[#1f2937] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting securely...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Submit Verification
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
