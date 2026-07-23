import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, X } from "lucide-react";
import Navbar from "../components/Navbar";
import { Button } from "../components/ui/Button";
import { auth } from "../config/firebase";

export default function LiveBoard() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [bidSuccess, setBidSuccess] = useState(false);
  const [myCompanyId, setMyCompanyId] = useState(null);
  
  useEffect(() => {
    // Fetch User Company ID
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/users/me", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setMyCompanyId(data.companyId);
          }
        } catch (e) {
          console.error("Failed to fetch user role", e);
        }
      }
    });

    fetchBoardData();

    return () => {
      unsubscribe();
    };
  }, []);

  const fetchBoardData = async () => {
    try {
      const [prodRes, rfqRes] = await Promise.all([
        fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/products"),
        fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/rfqs")
      ]);
      
      let allItems = [];

      if (prodRes.ok) {
        const products = await prodRes.json();
        const mappedProducts = products.map(p => ({
          id: p.id,
          type: 'SELL',
          commodity: p.name,
          companyId: p.companyId,
          price: `${p.price} ${p.currency}`,
          origin: p.country,
          destination: 'Any',
          volume: `${p.quantity} ${p.unit}`,
          incoterm: p.deliveryTerms,
          status: p.status,
          createdAt: new Date(p.createdAt)
        }));
        allItems = [...allItems, ...mappedProducts];
      }

      if (rfqRes.ok) {
        const rfqs = await rfqRes.json();
        const mappedRfqs = rfqs.map(r => ({
          id: r.id,
          type: 'BUY',
          commodity: r.product,
          companyId: r.companyId,
          price: r.targetPrice ? r.targetPrice.toString() : 'Negotiable',
          origin: 'Any',
          destination: r.destinationCountry,
          volume: `${r.quantity} ${r.unit}`,
          incoterm: 'FOB/CIF',
          status: r.status,
          createdAt: new Date(r.createdAt)
        }));
        allItems = [...allItems, ...mappedRfqs];
      }

      // Sort by newest
      allItems.sort((a, b) => b.createdAt - a.createdAt);
      setItems(allItems);

    } catch (err) {
      console.error("Failed to fetch board data", err);
    }
  };

  const handleActionClick = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        navigate("/login");
        return;
      }
      
      const payload = selectedItem.type === 'SELL' 
        ? { productId: selectedItem.id }
        : { rfqId: selectedItem.id };

      const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/negotiations/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const room = await res.json();
        console.log("RECEIVED ROOM FROM POST:", room);
        setBidSuccess(true);
        setTimeout(() => {
          navigate(`/negotiation/${room.id}`);
        }, 1500);
      } else {
        console.error("Failed to initiate negotiation", await res.text());
      }
    } catch (err) {
      console.error("Negotiation error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted text-foreground font-sans selection:bg-primary/30 flex flex-col">
      <Navbar 
        centerContent={
          <div className="flex items-center gap-2 text-primary font-mono text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
              <circle cx="12" cy="12" r="2"></circle>
              <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path>
            </svg>
            Live Board
          </div>
        }
      />

      <main className="flex-1 px-8 lg:px-16 pt-12 pb-24 max-w-[1400px] mx-auto w-full relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[0.65rem] font-mono tracking-widest text-primary uppercase">Live Negotiation Board</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-heading font-medium tracking-tight mb-3">
              Broadcasted lots <span className="text-muted-foreground">•</span> Global buyers & sellers
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Real-time trading floor. Buyers post requirements (RFQs). Sellers post inventory (Products). Negotiate instantly.
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <div className="text-[0.65rem] font-mono tracking-widest text-muted-foreground uppercase">
              Auto-refresh
            </div>
            <Button 
              onClick={() => navigate("/dashboard")}
              className="h-10 px-6 text-sm flex items-center"
            >
              Post to Market
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <button className="h-8 px-4 border border-primary/50 text-primary text-xs font-mono tracking-widest uppercase rounded-md bg-primary/5 flex items-center justify-center">
              All Lots
            </button>
          </div>
          <button onClick={fetchBoardData} className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border px-3 py-1.5 rounded-md">
            Refresh Data
          </button>
        </div>

        <div className="border border-border rounded-md overflow-hidden bg-card">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="py-4 px-6 text-[0.65rem] font-mono tracking-widest text-muted-foreground uppercase font-normal w-1/4">Commodity</th>
                  <th className="py-4 px-6 text-[0.65rem] font-mono tracking-widest text-muted-foreground uppercase font-normal text-right">Price</th>
                  <th className="py-4 px-6 text-[0.65rem] font-mono tracking-widest text-muted-foreground uppercase font-normal">Origin → Dest</th>
                  <th className="py-4 px-6 text-[0.65rem] font-mono tracking-widest text-muted-foreground uppercase font-normal text-right">Qty</th>
                  <th className="py-4 px-6 text-[0.65rem] font-mono tracking-widest text-muted-foreground uppercase font-normal">Incoterm</th>
                  <th className="py-4 px-6 text-[0.65rem] font-mono tracking-widest text-muted-foreground uppercase font-normal text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-sm text-muted-foreground">
                      No live lots currently posted.
                    </td>
                  </tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id} className="border-b border-border hover:bg-muted transition-colors group">
                      <td className="py-4 px-6">
                        <div className="text-sm font-medium text-foreground">{item.commodity}</div>
                        <div className="text-[0.65rem] text-muted-foreground font-mono mt-1 uppercase">
                          <span className={item.type === 'BUY' ? 'text-blue-400' : 'text-orange-400'}>
                            {item.type === 'BUY' ? 'BUY REQUEST (RFQ)' : 'SELL OFFER (PRODUCT)'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="text-sm font-medium text-emerald-400">{item.price}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-foreground">{item.origin} <span className="text-muted-foreground mx-1">→</span> {item.destination}</div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="text-sm text-foreground">{item.volume}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-muted-foreground">{item.incoterm || 'FOB'}</div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {myCompanyId && item.companyId === myCompanyId ? (
                          <span className="text-[0.65rem] text-muted-foreground uppercase font-mono px-3 py-1 bg-white/5 rounded">Your Listing</span>
                        ) : (
                          <Button 
                            onClick={() => setSelectedItem(item)}
                            className="h-8 px-4 text-xs font-medium bg-primary text-background hover:bg-primary/90 transition-all"
                          >
                            {item.type === 'BUY' ? 'Submit Bid' : 'Negotiate'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Action Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-md w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-teal-500"></div>
            
            <button 
              onClick={() => { setSelectedItem(null); setBidSuccess(false); }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8">
              {bidSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <h3 className="text-xl font-heading font-medium mb-2">Room Created</h3>
                  <p className="text-sm text-muted-foreground">Opening secure negotiation room...</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-heading font-medium mb-1">
                    {selectedItem.type === 'BUY' ? 'Submit Bid to Buyer' : 'Negotiate Purchase'}
                  </h2>
                  <p className="text-xs text-muted-foreground mb-6 font-mono uppercase tracking-wider">
                    Entering private negotiation room.
                  </p>
                  
                  <div className="bg-white/5 border border-border rounded-md p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-[0.65rem] font-mono text-muted-foreground uppercase mb-1">Commodity</div>
                        <div className="text-gray-200">{selectedItem.commodity}</div>
                      </div>
                      <div>
                        <div className="text-[0.65rem] font-mono text-muted-foreground uppercase mb-1">Volume</div>
                        <div className="text-gray-200">{selectedItem.volume}</div>
                      </div>
                      <div>
                        <div className="text-[0.65rem] font-mono text-muted-foreground uppercase mb-1">{selectedItem.type === 'BUY' ? 'Target Price' : 'Asking Price'}</div>
                        <div className="text-emerald-400 font-medium">{selectedItem.price}</div>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleActionClick}>
                    <Button 
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 flex items-center justify-center"
                    >
                      {loading ? 'Initializing...' : 'Enter Negotiation Room'}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
