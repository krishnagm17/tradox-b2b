import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { auth } from "../config/firebase";
import { Loader2 } from "lucide-react";

export default function DealTracker() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch(`http://localhost:8000/api/orders/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setOrder(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const advanceStage = async () => {
    if (!order) return;
    setAdvancing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const newStage = Math.min(order.stage + 1, 5);
      const res = await fetch(`http://localhost:8000/api/orders/${id}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ stage: newStage })
      });
      if (res.ok) {
        setOrder(prev => ({ ...prev, stage: newStage }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdvancing(false);
    }
  };

  const stages = [
    { name: "Verification", desc: "KYB & Trade Licenses verified." },
    { name: "Price Discovery", desc: "Target price published to market." },
    { name: "Live Negotiation", desc: "Counter-offers received and accepted." },
    { name: "Payment Escrow", desc: "Funds locked in secure LC/Escrow." },
    { name: "Dispatch", desc: "Commodity loaded onto vessel (BL issued)." },
    { name: "Delivery", desc: "Goods arrived at destination port." }
  ];

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!order) return <div className="min-h-screen bg-background flex items-center justify-center">Order not found</div>;

  const currentStep = order.stage || 3;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans p-6">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>← Back to Dashboard</Button>
          <h1 className="text-2xl font-heading font-semibold">Deal Lifecycle: {id.substring(0,8)}...</h1>
          {currentStep === 5 ? (
             <Badge className="ml-auto bg-emerald-500/20 text-emerald-600 border-emerald-500/50">DELIVERED</Badge>
          ) : (
             <Badge className="ml-auto bg-blue-500/20 text-blue-500 border-blue-500/50">IN PROGRESS</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono tracking-widest text-muted-foreground uppercase">Commodity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{order.commodity || "Agreed Commodity"}</div>
              <div className="text-sm text-muted-foreground">{order.quantity} MT</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono tracking-widest text-muted-foreground uppercase">Trade Route</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{order.destination}</div>
              <div className="text-sm text-muted-foreground">{order.incoterms} terms</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono tracking-widest text-muted-foreground uppercase">Final Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-mono text-primary font-bold">${order.price?.toLocaleString()} / MT</div>
              <div className="text-sm text-muted-foreground">Total: ${(order.totalAmount || (order.price * order.quantity))?.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Progression Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mt-4">
              <div className="absolute left-6 top-4 bottom-4 w-px bg-border"></div>
              
              <div className="space-y-8">
                {stages.map((stage, idx) => {
                  const isCompleted = idx < currentStep;
                  const isActive = idx === currentStep;
                  
                  return (
                    <div key={idx} className="relative flex items-start gap-6">
                      <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-card ${isCompleted ? 'border-primary text-primary' : isActive ? 'border-blue-500 text-blue-500' : 'border-border text-muted-foreground'}`}>
                        {isCompleted ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        ) : (
                          <span className="font-mono font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <div className="pt-2">
                        <h3 className={`font-semibold text-lg ${isActive ? 'text-blue-500' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>{stage.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{stage.desc}</p>
                        
                        {isActive && idx < 5 && (
                          <div className="mt-4 p-4 rounded-md border border-blue-500/30 bg-blue-500/10">
                            <h4 className="font-medium text-blue-500 mb-2">Action Required</h4>
                            <p className="text-sm mb-4">Please advance to the next stage once the offline process is complete.</p>
                            <Button size="sm" onClick={advanceStage} disabled={advancing} className="bg-blue-600 hover:bg-blue-700">
                                {advancing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Advance to Next Stage
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
