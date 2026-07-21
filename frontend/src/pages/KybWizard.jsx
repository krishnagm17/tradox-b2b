import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { auth } from "../config/firebase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function KybWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tradeLicenseFile, setTradeLicenseFile] = useState(null);
  const [bclFile, setBclFile] = useState(null);

  const steps = [
    { title: "Corporate Metadata", desc: "Basic company information and registration numbers." },
    { title: "Trade Licenses", desc: "Upload commercial trade licenses and tax certificates." },
    { title: "Bank Comfort Letter", desc: "Upload proof of financial capability (BCL)." }
  ];

  const handleNext = async () => {
    if (step < 3) setStep(step + 1);
    else {
      setLoading(true);
      const toastId = toast.loading("Verifying business documents...");
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/users/kyb", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          toast.success("Business verified successfully!", { id: toastId });
          navigate("/dashboard");
        } else {
          toast.error("Verification failed.", { id: toastId });
        }
      } catch (err) {
        toast.error("Network error. Try again.", { id: toastId });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-6 left-6 cursor-pointer" onClick={() => navigate("/live-board")}>
        <span className="text-primary font-heading font-bold text-xl">TradoxB2B</span>
      </div>
      
      <div className="max-w-3xl w-full">
        <div className="mb-12 text-center">
          <Badge className="mb-4">KYB Compliance</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight mb-2">Know Your Business</h1>
          <p className="text-muted-foreground">We require strict verification before enabling trade capabilities to prevent fraud.</p>
        </div>

        <div className="flex gap-4 mb-8">
          {steps.map((s, i) => (
            <div key={i} className={`flex-1 border-t-2 pt-4 transition-colors ${step > i ? 'border-primary' : 'border-border'}`}>
              <div className={`text-xs font-mono uppercase tracking-widest mb-1 ${step > i ? 'text-primary' : 'text-muted-foreground'}`}>Step 0{i + 1}</div>
              <div className={`font-semibold ${step > i ? 'text-foreground' : 'text-muted-foreground'}`}>{s.title}</div>
            </div>
          ))}
        </div>

        <Card className="shadow-xl bg-card border-border">
          <CardHeader>
            <CardTitle>{steps[step-1].title}</CardTitle>
            <CardDescription>{steps[step-1].desc}</CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-mono tracking-widest uppercase text-muted-foreground">Legal Entity Name</label>
                    <Input placeholder="Acme Trading LLC" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-mono tracking-widest uppercase text-muted-foreground">Registration Number</label>
                    <Input placeholder="REG-123456789" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-mono tracking-widest uppercase text-muted-foreground">Tax ID / VAT</label>
                    <Input placeholder="VAT-987654321" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-mono tracking-widest uppercase text-muted-foreground">Year Established</label>
                    <Input type="number" placeholder="2015" />
                  </div>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <label className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:bg-muted/20 transition-colors cursor-pointer block">
                  <input type="file" className="hidden" onChange={(e) => setTradeLicenseFile(e.target.files[0])} />
                  <div className="flex justify-center mb-4 text-primary">
                    {tradeLicenseFile ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    )}
                  </div>
                  <h4 className="font-semibold mb-2">{tradeLicenseFile ? tradeLicenseFile.name : "Upload Trade License"}</h4>
                  <p className="text-sm text-muted-foreground">{tradeLicenseFile ? "File selected successfully." : "Drag and drop your PDF or JPG here, or click to browse."}</p>
                </label>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                 <label className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:bg-muted/20 transition-colors cursor-pointer block">
                  <input type="file" className="hidden" onChange={(e) => setBclFile(e.target.files[0])} />
                  <div className="flex justify-center mb-4 text-primary">
                    {bclFile ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    )}
                  </div>
                  <h4 className="font-semibold mb-2">{bclFile ? bclFile.name : "Upload Bank Comfort Letter (BCL)"}</h4>
                  <p className="text-sm text-muted-foreground">{bclFile ? "File selected successfully." : "Proof of funds from a top 50 global bank. Max 5MB PDF."}</p>
                </label>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border pt-6">
            <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : navigate("/live-board")} disabled={loading}>
              {step > 1 ? "Back" : "Cancel"}
            </Button>
            <Button onClick={handleNext} disabled={loading} className="flex items-center">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {step === 3 ? (loading ? "Verifying..." : "Submit for Verification") : "Continue"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
