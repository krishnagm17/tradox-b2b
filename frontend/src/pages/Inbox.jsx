import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, ArrowRight, Clock, Search,
  Package, ShoppingCart, Building2, CheckCircle2, XCircle,
  ArrowLeft, Bell
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "../components/Navbar";
import { auth } from "../config/firebase";
import { API_BASE } from "../utils/api";

export default function Inbox() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [myCompanyId, setMyCompanyId] = useState(null);
  const [lastMessages, setLastMessages] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Get user info for company context
        const token = await currentUser.getIdToken();
        try {
          const userRes = await fetch(`${API_BASE}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            setMyCompanyId(userData.companyId);
          }
        } catch { /* ignore */ }

        fetchRooms(currentUser);
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchRooms = async (currentUser) => {
    try {
      const activeUser = currentUser || auth.currentUser;
      const token = await activeUser?.getIdToken();
      if (!token) return;

      const res = await fetch(`${API_BASE}/api/negotiations/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        // Sort by most recent (assume createdAt)
        const sorted = data.sort((a, b) =>
          new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0)
        );
        setRooms(sorted);

        // Fetch last message for each room
        await Promise.all(
          sorted.slice(0, 10).map(async (room) => {
            try {
              const msgRes = await fetch(`${API_BASE}/api/negotiations/rooms/${room.id}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (msgRes.ok) {
                const msgs = await msgRes.json();
                if (msgs.length > 0) {
                  const lastMsg = msgs[msgs.length - 1];
                  setLastMessages(prev => ({ ...prev, [room.id]: lastMsg }));
                }
              }
            } catch { /* ignore */ }
          })
        );
      }
    } catch (err) {
      console.error("Failed to fetch inbox rooms", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return <span className="flex items-center gap-1 text-[0.65rem] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block" />Active</span>;
      case "ACCEPTED":
        return <span className="flex items-center gap-1 text-[0.65rem] font-bold text-blue-700 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" />Deal Accepted</span>;
      case "CLOSED":
        return <span className="flex items-center gap-1 text-[0.65rem] font-bold text-slate-600 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />Closed</span>;
      default:
        return <span className="text-[0.65rem] font-bold text-slate-600 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  const getRoomLabel = (room) => {
    if (room.rfqId) {
      return {
        icon: <ShoppingCart className="w-5 h-5 text-blue-600" />,
        bg: "bg-blue-100",
        type: "BUY Negotiation",
        description: `Negotiating on RFQ · Room ${room.id.substring(0, 8)}`
      };
    }
    if (room.productId) {
      return {
        icon: <Package className="w-5 h-5 text-orange-600" />,
        bg: "bg-orange-100",
        type: "SELL Negotiation",
        description: `Negotiating on Product · Room ${room.id.substring(0, 8)}`
      };
    }
    return {
      icon: <MessageSquare className="w-5 h-5 text-slate-600" />,
      bg: "bg-slate-100",
      type: "Trade Negotiation",
      description: `Room ${room.id.substring(0, 8)}`
    };
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  const getCounterparty = (room) => {
    if (!myCompanyId) return room.buyerCompanyId || "Counterparty";
    if (room.buyerCompanyId === myCompanyId) {
      return `Supplier: ${(room.supplierCompanyId || "Unknown").substring(0, 12)}...`;
    }
    return `Buyer: ${(room.buyerCompanyId || "Unknown").substring(0, 12)}...`;
  };

  const filtered = rooms.filter(room => {
    const label = getRoomLabel(room);
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      label.type.toLowerCase().includes(q) ||
      room.id.toLowerCase().includes(q) ||
      (room.rfqId || "").toLowerCase().includes(q) ||
      (room.productId || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-foreground font-sans flex flex-col">
      <Navbar
        bgColor="bg-white border-b border-slate-200"
        centerContent={
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
            <MessageSquare className="w-4 h-4" />
            Negotiations Inbox
          </div>
        }
      />

      <main className="flex-1 px-4 sm:px-8 lg:px-12 pt-8 pb-24 max-w-[900px] mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Your Negotiations</h1>
            <p className="text-xs text-slate-500">All your active and completed trade negotiations</p>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg">
            <Bell className="w-4 h-4" />
            <span>{rooms.filter(r => r.status === "ACTIVE").length} Active</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search negotiations by type, room ID, or commodity..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-emerald-500 h-11 pl-10 pr-4 text-sm rounded-xl outline-none transition-all"
          />
        </div>

        {/* How to use banner (shown when empty rooms) */}
        {!loading && rooms.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">No Negotiations Yet</h2>
            <p className="text-sm text-slate-500 mb-2 max-w-xs mx-auto">
              When you negotiate on a listing from the Live Board, your conversations will appear here.
            </p>
            <p className="text-xs text-slate-400 mb-6">Each negotiation has a private chat room with structured offers.</p>
            <button
              onClick={() => navigate("/live-board")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Go to Live Board →
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500">Loading your negotiations...</p>
            </div>
          </div>
        )}

        {/* Rooms List */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(room => {
              const label = getRoomLabel(room);
              const lastMsg = lastMessages[room.id];
              const timeStr = formatTime(room.createdAt || room.created_at);

              return (
                <div
                  key={room.id}
                  onClick={() => navigate(`/negotiation/${room.id}`)}
                  className="group cursor-pointer bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-sm rounded-2xl p-5 flex items-start gap-4 transition-all"
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl ${label.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                    {label.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-900">{label.type}</span>
                      {getStatusBadge(room.status)}
                    </div>

                    {/* Counterparty */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500 font-mono">{getCounterparty(room)}</span>
                    </div>

                    {/* Last message preview */}
                    {lastMsg && (
                      <p className="text-xs text-slate-500 truncate">
                        {lastMsg.offer_version
                          ? `📋 Formal Offer v${lastMsg.offer_version.version} — $${lastMsg.offer_version.card?.price?.toLocaleString() || "N/A"}`
                          : (lastMsg.sender_id === "system"
                            ? `🔔 ${lastMsg.content}`
                            : `💬 ${lastMsg.content}`)}
                      </p>
                    )}

                    {!lastMsg && (
                      <p className="text-xs text-slate-400 italic">No messages yet — start the negotiation</p>
                    )}
                  </div>

                  {/* Right side: time + arrow */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {timeStr && (
                      <span className="text-[0.65rem] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />{timeStr}
                      </span>
                    )}
                    <div className="w-8 h-8 rounded-full border border-slate-200 group-hover:border-emerald-400 group-hover:bg-emerald-50 flex items-center justify-center transition-all">
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No results from search */}
        {!loading && rooms.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">No negotiations match your search.</p>
            <button onClick={() => setSearchQuery("")} className="text-xs text-emerald-600 underline mt-2">Clear search</button>
          </div>
        )}
      </main>
    </div>
  );
}
