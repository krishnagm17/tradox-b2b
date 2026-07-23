import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Paperclip, MoreVertical, FileText, Check, CheckCheck } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../config/firebase";
import { API_BASE, WS_BASE } from "../utils/api";

export default function NegotiationRoom() {
  const { room_id: id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [ws, setWs] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [kybStatus, setKybStatus] = useState(null);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  // Phase 3: Offer State
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerData, setOfferData] = useState({
    price: "", quantity: "", moq: "", delivery_date: "", packaging: "",
    incoterm: "FOB", payment_terms: "LC at sight", validity_hours: "24",
    specifications: "", destination_port: ""
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        fetchRoomAndMessages(currentUser);
        setupWebSocket();
      }
    });

    return () => {
      unsubscribe();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const fetchRoomAndMessages = async (currentUser) => {
    try {
      const activeUser = currentUser || auth.currentUser;
      const token = await activeUser?.getIdToken();
      if (!token) return;

      const roomRes = await fetch(`${API_BASE}/api/negotiations/rooms/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (roomRes.ok) setRoom(await roomRes.json());

      const msgRes = await fetch(`${API_BASE}/api/negotiations/rooms/${id}/messages`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (msgRes.ok) setMessages(await msgRes.json());

      const userRes = await fetch(`${API_BASE}/api/users/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setKybStatus(userData.kybStatus || userData.company?.kybStatus || "PENDING");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const setupWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const socket = new WebSocket(`${WS_BASE}/ws/negotiations/${id}`);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "chat") {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          
          const filtered = prev.filter(m => !(
            typeof m.id === "string" && 
            m.id.startsWith("temp-") && 
            m.sender_id === data.message.sender_id && 
            m.content === data.message.content
          ));
          
          return [...filtered, data.message];
        });

        if (data.message.sender_id !== auth.currentUser?.uid) {
          setIsTyping(false);
        }
      } else if (data.type === "typing" && data.sender_id !== auth.currentUser?.uid) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    };
    
    socket.onerror = (err) => console.error("WebSocket error:", err);
    socket.onclose = () => console.log("WebSocket connection closed");

    wsRef.current = socket;
    setWs(socket);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage("");

    const currentUid = auth.currentUser?.uid;

    // Optimistically add message to UI
    const tempMsg = {
      id: "temp-" + Date.now(),
      room_id: id,
      sender_id: currentUid,
      content: content,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);

    const activeWs = wsRef.current || ws;

    // If WebSocket is open, send via WebSocket
    if (activeWs && activeWs.readyState === WebSocket.OPEN) {
      try {
        activeWs.send(JSON.stringify({
          type: "chat",
          sender_id: currentUid,
          content: content
        }));
        return;
      } catch (err) {
        console.error("WS send failed, using HTTP fallback", err);
      }
    }

    // Fallback to HTTP POST
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch(`${API_BASE}/api/negotiations/rooms/${id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ content: content })
      });

      if (res.ok) {
        const savedMsg = await res.json();
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? savedMsg : m));
      }
    } catch (err) {
      console.error("HTTP message post failed:", err);
    }
  };

  const handleTyping = () => {
    if (ws) {
      ws.send(JSON.stringify({
        type: "typing",
        sender_id: auth.currentUser?.uid
      }));
    }
  };

  const submitOffer = async (e) => {
    e.preventDefault();
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      
      const payload = {
        ...offerData,
        price: parseFloat(offerData.price),
        quantity: parseFloat(offerData.quantity),
        moq: parseFloat(offerData.moq),
        validity_hours: parseInt(offerData.validity_hours)
      };

      const res = await fetch(`${API_BASE}/api/negotiations/rooms/${id}/offers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowOfferForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptOffer = async (versionNum) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch(`${API_BASE}/api/negotiations/rooms/${id}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ version: versionNum })
      });

      if (res.ok) {
        const newOrder = await res.json();
        setRoom(prev => ({...prev, status: "ACCEPTED"}));
        navigate(`/deals/${newOrder.id}`);
      }
    } catch (err) {
      console.error("Failed to accept offer", err);
    }
  };

  if (!room) return <div className="min-h-screen bg-muted flex items-center justify-center text-primary font-mono text-sm">Connecting to secure terminal...</div>;

  const isBuyer = room.buyer_id === auth.currentUser?.uid;
  const partnerName = isBuyer ? "Verified Supplier" : "Verified Buyer";

  return (
    <div className="min-h-screen bg-muted text-foreground font-sans selection:bg-primary/30 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-medium text-lg">{partnerName}</h1>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            </div>
            <div className="text-[0.65rem] font-mono tracking-widest text-primary uppercase">
              Online Â· End-to-End Encrypted
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-[0.65rem] font-mono tracking-widest uppercase px-3 py-1.5 border border-border rounded-md hover:border-border transition-colors">
            View RFQ Details
          </button>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Chat History */}
        <div className="flex-1 flex flex-col bg-muted relative">
          <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:48px_48px]" />
          
          <div className="flex-1 overflow-y-auto p-6 z-10 space-y-6">
            <div className="text-center">
              <span className="text-[0.65rem] font-mono tracking-widest uppercase bg-white/5 text-muted-foreground px-3 py-1 rounded-full">
                Negotiation Room Created
              </span>
            </div>
            
            {room.status === "ACCEPTED" && (
              <div className="text-center">
                <span className="text-[0.65rem] font-mono tracking-widest uppercase bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                  Deal Sealed - Negotiation Closed
                </span>
              </div>
            )}

            {messages.map((msg, idx) => {
              const isMine = msg.sender_id === auth.currentUser?.uid;
              const isSystem = msg.sender_id === "system";

              if (isSystem) {
                return (
                  <div key={idx} className="flex justify-center my-4">
                    <div className="bg-primary/10 border border-primary/30 text-primary text-xs px-4 py-3 rounded-md text-center max-w-md">
                      <p className="font-semibold">{msg.content.split('Contract generated:')[0]}</p>
                      {msg.content.includes('Contract generated:') && (
                        <a href={`${import.meta.env.VITE_API_URL || "http://localhost:8000"}${msg.content.split('Contract generated: ')[1]}`} target="_blank" rel="noreferrer" className="inline-block mt-2 text-foreground bg-primary/20 hover:bg-primary hover:text-foreground px-3 py-1.5 rounded transition-colors font-mono uppercase tracking-widest text-[0.65rem]">
                          Download Sales Contract PDF
                        </a>
                      )}
                    </div>
                  </div>
                );
              }
              
              if (msg.offer_version) {
                const card = msg.offer_version.card;
                const totalValue = card.price * card.quantity;
                return (
                  <div key={idx} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className="bg-card border border-primary/30 rounded-md w-full max-w-[400px] overflow-hidden shadow-sm">
                      <div className="bg-primary/10 px-4 py-2 border-b border-primary/20 flex justify-between items-center">
                        <span className="text-xs font-mono text-primary uppercase tracking-widest">Formal Offer v{msg.offer_version.version}</span>
                        <span className="text-xs text-muted-foreground">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-[0.6rem] text-muted-foreground uppercase tracking-widest mb-1">Unit Price</div>
                            <div className="text-xl font-heading text-primary">${card.price}/MT</div>
                          </div>
                          <div>
                            <div className="text-[0.6rem] text-muted-foreground uppercase tracking-widest mb-1">Quantity</div>
                            <div className="text-xl font-heading text-foreground">{card.quantity} MT</div>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs text-foreground">
                          <div><span className="text-muted-foreground mr-2">Incoterms:</span>{card.incoterms}</div>
                          <div><span className="text-muted-foreground mr-2">Payment:</span>{card.payment_terms}</div>
                          <div><span className="text-muted-foreground mr-2">Delivery:</span>{card.delivery_date}</div>
                          <div><span className="text-muted-foreground mr-2">Dest:</span>{card.destination}</div>
                        </div>
                        <div className="pt-3 border-t border-primary/10 flex justify-between items-center">
                          <div className="text-[0.65rem] text-muted-foreground uppercase tracking-widest">Total Value</div>
                          <div className="text-base font-mono text-primary">${totalValue.toLocaleString()}</div>
                        </div>
                        {!isMine && room.status === "ACTIVE" && (
                          <div className="pt-3 grid grid-cols-2 gap-2">
                            <button className="h-8 bg-input hover:bg-white/5 border border-border text-foreground text-xs rounded-md transition-colors" onClick={() => {
                              setOfferData(card);
                              setShowOfferForm(true);
                            }}>
                              Counter
                            </button>
                            <button 
                              onClick={() => handleAcceptOffer(msg.offer_version.version)}
                              className="h-8 bg-primary hover:bg-primary/90 text-foreground font-semibold text-xs rounded-md transition-colors"
                            >
                              Accept
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={idx} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[70%] rounded-md p-4 ${isMine ? 'bg-primary text-foreground' : 'bg-input text-foreground border border-border'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div className={`text-[0.65rem] font-mono mt-2 flex items-center gap-1 justify-end ${isMine ? 'text-foreground/60' : 'text-muted-foreground'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isMine && <CheckCheck className="w-3 h-3 ml-1" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-start">
                <div className="bg-input border border-border text-muted-foreground rounded-md px-4 py-3 flex items-center gap-1">
                  <span className="animate-bounce inline-block w-1 h-1 bg-gray-400 rounded-full"></span>
                  <span className="animate-bounce inline-block w-1 h-1 bg-gray-400 rounded-full" style={{ animationDelay: '0.2s' }}></span>
                  <span className="animate-bounce inline-block w-1 h-1 bg-gray-400 rounded-full" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 bg-card border-t border-border z-10 shrink-0">
            {kybStatus !== "VERIFIED" ? (
              <div className="max-w-4xl mx-auto py-3 px-6 bg-warning/10 border border-warning/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-warning">KYB Verification Required</h4>
                    <p className="text-xs text-muted-foreground">You must complete business verification to participate in live negotiations.</p>
                  </div>
                </div>
                <button onClick={() => navigate("/onboarding/kyb")} className="bg-warning text-warning-foreground px-4 py-2 rounded-md text-xs font-semibold hover:bg-warning/90 transition-colors">
                  Complete KYB
                </button>
              </div>
            ) : (
              <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative flex items-center">
                <button type="button" disabled={room.status !== "ACTIVE"} className="absolute left-4 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  disabled={room.status !== "ACTIVE"}
                  placeholder={room.status === "ACTIVE" ? "Type a message or use structured offers..." : "Negotiation closed."}
                  className="w-full bg-input disabled:bg-card disabled:opacity-50 border border-border focus:border-primary/50 rounded-full h-12 pl-12 pr-16 text-sm text-foreground focus:outline-none transition-colors"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim() || room.status !== "ACTIVE"}
                  className="absolute right-2 bg-primary disabled:bg-primary/20 text-foreground w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Panel: Negotiation Tools (For Phase 3) */}
        <div className="hidden lg:flex w-96 bg-card border-l border-border flex-col shrink-0">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="text-sm font-heading font-medium">Negotiation Toolkit</h2>
            {showOfferForm && kybStatus === "VERIFIED" && (
              <button onClick={() => setShowOfferForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            )}
          </div>
          
          {kybStatus !== "VERIFIED" ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center opacity-70">
              <FileText className="w-8 h-8 text-warning mb-4" />
              <p className="text-xs text-warning font-mono tracking-widest uppercase mb-2">Restricted Access</p>
              <p className="text-xs text-muted-foreground">You cannot create or counter offers until your business is verified.</p>
            </div>
          ) : showOfferForm ? (
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={submitOffer} className="space-y-4">
                <div>
                  <label className="block text-[0.65rem] font-mono tracking-widest text-muted-foreground uppercase mb-1">Unit Price (USD) *</label>
                  <input type="number" required className="w-full bg-input border border-border rounded-md h-10 px-3 text-sm text-foreground" value={offerData.price} onChange={e => setOfferData({...offerData, price: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[0.65rem] font-mono tracking-widest text-muted-foreground uppercase mb-1">Quantity *</label>
                    <input type="number" required className="w-full bg-input border border-border rounded-md h-10 px-3 text-sm text-foreground" value={offerData.quantity} onChange={e => setOfferData({...offerData, quantity: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[0.65rem] font-mono tracking-widest text-muted-foreground uppercase mb-1">MOQ *</label>
                    <input type="number" required className="w-full bg-input border border-border rounded-md h-10 px-3 text-sm text-foreground" value={offerData.moq} onChange={e => setOfferData({...offerData, moq: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[0.65rem] font-mono tracking-widest text-muted-foreground uppercase mb-1">Incoterms</label>
                    <input type="text" className="w-full bg-input border border-border rounded-md h-10 px-3 text-sm text-foreground" value={offerData.incoterms} onChange={e => setOfferData({...offerData, incoterms: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[0.65rem] font-mono tracking-widest text-muted-foreground uppercase mb-1">Payment Terms</label>
                    <input type="text" className="w-full bg-input border border-border rounded-md h-10 px-3 text-sm text-foreground" value={offerData.payment_terms} onChange={e => setOfferData({...offerData, payment_terms: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-[0.65rem] font-mono tracking-widest text-muted-foreground uppercase mb-1">Delivery Date / Est</label>
                  <input type="text" className="w-full bg-input border border-border rounded-md h-10 px-3 text-sm text-foreground" value={offerData.delivery_date} onChange={e => setOfferData({...offerData, delivery_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[0.65rem] font-mono tracking-widest text-muted-foreground uppercase mb-1">Destination Port</label>
                  <input type="text" className="w-full bg-input border border-border rounded-md h-10 px-3 text-sm text-foreground" value={offerData.destination} onChange={e => setOfferData({...offerData, destination: e.target.value})} />
                </div>
                
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[0.65rem] font-mono text-muted-foreground uppercase">Est. Total</span>
                    <span className="text-primary font-mono">${((parseFloat(offerData.price) || 0) * (parseFloat(offerData.quantity) || 0)).toLocaleString()}</span>
                  </div>
                  <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold rounded-md h-10 transition-colors text-sm">
                    Sign & Submit Offer
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center opacity-50">
              <FileText className="w-8 h-8 text-muted-foreground mb-4" />
              <p className="text-xs text-muted-foreground font-mono tracking-widest uppercase">Structured Offers</p>
              <p className="text-xs text-muted-foreground mt-2">Create standard contract cards to officially propose terms.</p>
              <button 
                onClick={() => setShowOfferForm(true)}
                className="mt-6 border border-primary text-primary text-xs px-4 py-2 rounded-md hover:bg-primary/10 transition-colors"
              >
                Create New Offer
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
