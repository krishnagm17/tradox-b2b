import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, ArrowRight, Clock, CheckCircle2 } from "lucide-react";
import Navbar from "../components/Navbar";
import { auth } from "../config/firebase";

export default function Inbox() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/negotiations/rooms", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (err) {
      console.error("Failed to fetch inbox rooms", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'text-primary bg-primary/10 border-primary/20';
      case 'ACCEPTED': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-muted-foreground bg-gray-500/10 border-border/20';
    }
  };

  return (
    <div className="min-h-screen bg-muted text-foreground font-sans flex flex-col">
      <Navbar 
        bgColor="bg-card"
        centerContent={
          <div className="flex items-center gap-2 text-foreground font-mono text-sm">
            <MessageSquare className="w-4 h-4" />
            Inbox
          </div>
        }
      />

      <main className="flex-1 px-8 lg:px-16 pt-12 pb-24 max-w-[1200px] mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl lg:text-4xl font-heading font-medium tracking-tight mb-3">
            Active Negotiations
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Manage your ongoing deals, counter-offers, and contracts.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 border border-border bg-card rounded-md">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-heading font-medium text-foreground mb-2">No Active Negotiations</h3>
            <p className="text-sm text-muted-foreground">When you bid on a lot or receive a response to an RFQ, it will appear here.</p>
            <button 
              onClick={() => navigate("/live-board")}
              className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 text-foreground rounded-md text-sm transition-colors border border-border"
            >
              Go to Live Board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {rooms.map(room => (
              <div 
                key={room.id}
                onClick={() => navigate(`/negotiation/${room.id}`)}
                className="group cursor-pointer border border-border bg-card hover:bg-white/[0.03] transition-colors rounded-md p-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center shrink-0 border border-border group-hover:border-primary/30 transition-colors">
                    <MessageSquare className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-heading font-medium">
                        {room.deal_id ? 'Live Board Deal' : 'RFQ Response'}
                      </h3>
                      <span className={`text-[0.65rem] font-mono tracking-widest uppercase px-2 py-0.5 border rounded-md ${getStatusColor(room.status)}`}>
                        {room.status}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(room.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-muted-foreground">|</span>
                      <span>Room ID: {room.id.substring(0, 8)}...</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center bg-white/5 group-hover:bg-primary group-hover:border-primary transition-all">
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
