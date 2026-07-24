import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, ArrowRight, Clock, Search, Package, ShoppingCart,
  Building2, CheckCircle2, XCircle, ArrowLeft, Bell, Filter,
  Archive, Inbox as InboxIcon, RefreshCw
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../config/firebase";
import { supabase } from "../config/supabase";
import { API_BASE } from "../utils/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const STATUS_TABS = [
  { key: "ALL",      label: "All",      icon: InboxIcon },
  { key: "ACTIVE",   label: "Active",   icon: Bell },
  { key: "CLOSED",   label: "Closed",   icon: XCircle },
  { key: "ARCHIVED", label: "Archived", icon: Archive },
];

export default function Inbox() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [myCompanyId, setMyCompanyId] = useState(null);
  const [myUid, setMyUid] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const t = await currentUser.getIdToken();
        setToken(t);
        setMyUid(currentUser.uid);
        try {
          const userRes = await fetch(`${API_BASE}/api/users/me`, {
            headers: { Authorization: `Bearer ${t}` }
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            setMyCompanyId(userData.companyId);
          }
        } catch { /* ignore */ }
        fetchRooms(t);
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchRooms = useCallback(async (t) => {
    const tk = t || token;
    if (!tk) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/negotiations/rooms`, {
        headers: { Authorization: `Bearer ${tk}` }
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
  }, [token]);

  // Supabase Realtime — subscribe to negotiation_rooms changes
  useEffect(() => {
    if (!myCompanyId) return;
    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "negotiation_rooms",
      }, () => {
        fetchRooms();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [myCompanyId, fetchRooms]);

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

  const getMyRole = (room) => {
    if (!myCompanyId) return "unknown";
    return room.buyerCompanyId === myCompanyId ? "buyer" : "seller";
  };

  const getCounterpartyName = (room) => {
    const role = getMyRole(room);
    if (role === "buyer") return room.seller_company_name || "Supplier";
    return room.buyer_company_name || "Buyer";
  };

  const getMyUnread = (room) => {
    const role = getMyRole(room);
    return role === "buyer" ? (room.unread_buyer || 0) : (room.unread_seller || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="flex items-center gap-1 text-[0.6rem] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block" />
            Active
          </span>
        );
      case "CLOSED":
        return (
          <span className="flex items-center gap-1 text-[0.6rem] font-bold text-slate-600 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3" /> Closed
          </span>
        );
      case "ACCEPTED":
        return (
          <span className="flex items-center gap-1 text-[0.6rem] font-bold text-blue-700 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Deal Done
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="flex items-center gap-1 text-[0.6rem] font-bold text-purple-700 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-full">
            <Archive className="w-3 h-3" /> Archived
          </span>
        );
      default:
        return <span className="text-[0.6rem] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">{status}</span>;
    }
  };

  const filtered = rooms.filter(room => {
    if (activeStatus !== "ALL" && room.status !== activeStatus) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (room.commodity_name || "").toLowerCase().includes(q) ||
      (room.listing_title || "").toLowerCase().includes(q) ||
      (room.buyer_company_name || "").toLowerCase().includes(q) ||
      (room.seller_company_name || "").toLowerCase().includes(q) ||
      (room.id || "").toLowerCase().includes(q) ||
      (room.rfqId || "").toLowerCase().includes(q) ||
      (room.productId || "").toLowerCase().includes(q)
    );
  });

  const totalUnread = rooms.reduce((sum, r) => sum + getMyUnread(r), 0);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          bgColor="bg-white border-b border-slate-200"
          centerContent={
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              Negotiations Inbox
              {totalUnread > 0 && (
                <span className="bg-red-500 text-white text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full">{totalUnread}</span>
              )}
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-24 w-full">

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-lg transition-colors shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Your Negotiations</h1>
                <p className="text-xs text-slate-500 mt-0.5">All trade negotiations linked to your listings and RFQs</p>
              </div>
              <button
                onClick={() => fetchRooms()}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 bg-white border border-slate-200 px-3 py-2 rounded-lg transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by commodity, company, RFQ ID, or negotiation ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-emerald-500 h-11 pl-10 pr-4 text-sm rounded-xl outline-none transition-all shadow-sm"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
              {STATUS_TABS.map(tab => {
                const count = tab.key === "ALL" ? rooms.length : rooms.filter(r => r.status === tab.key).length;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveStatus(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                      activeStatus === tab.key
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[0.6rem] font-bold ${
                      activeStatus === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500">Loading negotiations...</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && rooms.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">No Negotiations Yet</h2>
                <p className="text-sm text-slate-500 mb-1 max-w-sm mx-auto">
                  When you click <strong>Negotiate</strong> on a product or RFQ from the Live Board, your conversations will appear here.
                </p>
                <p className="text-xs text-slate-400 mb-6">Each negotiation is permanently linked to its listing.</p>
                <button
                  onClick={() => navigate("/live-board")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
                >
                  Browse Live Board →
                </button>
              </div>
            )}

            {/* No filter results */}
            {!loading && rooms.length > 0 && filtered.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500 text-sm">No negotiations match your search or filter.</p>
                <button onClick={() => { setSearchQuery(""); setActiveStatus("ALL"); }} className="text-xs text-emerald-600 underline mt-2">
                  Clear filters
                </button>
              </div>
            )}

            {/* Negotiation Cards */}
            {!loading && filtered.length > 0 && (
              <div className="space-y-3">
                {filtered.map(room => {
                  const isBuy = room.listing_type === "RFQ";
                  const myRole = getMyRole(room);
                  const counterparty = getCounterpartyName(room);
                  const unread = getMyUnread(room);
                  const timeStr = formatTime(room.last_message_at || room.createdAt);
                  const commodity = room.commodity_name || room.listing_title || "Commodity";
                  const price = room.price ? `$${parseFloat(room.price).toLocaleString()}` : null;
                  const qty = room.quantity ? `${room.quantity} ${room.unit || "MT"}` : null;

                  return (
                    <div
                      key={room.id}
                      onClick={() => navigate(`/negotiation/${room.id}`)}
                      className={`group cursor-pointer bg-white rounded-2xl border transition-all hover:shadow-md ${
                        unread > 0 ? "border-emerald-300 shadow-sm" : "border-slate-200 hover:border-emerald-300"
                      }`}
                    >
                      <div className="p-4 sm:p-5 flex items-start gap-4">
                        {/* Listing Type Icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          isBuy ? "bg-blue-100" : "bg-orange-100"
                        }`}>
                          {isBuy
                            ? <ShoppingCart className="w-6 h-6 text-blue-600" />
                            : <Package className="w-6 h-6 text-orange-600" />
                          }
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          {/* Top row: type badge + status + unread */}
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-full border ${
                              isBuy
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-orange-50 text-orange-700 border-orange-200"
                            }`}>
                              {isBuy ? "🛒 BUY REQUIREMENT" : "📦 SELL OFFER"}
                            </span>
                            {getStatusBadge(room.status)}
                            {unread > 0 && (
                              <span className="bg-red-500 text-white text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full">
                                {unread} new
                              </span>
                            )}
                          </div>

                          {/* Commodity Name — LARGE and prominent */}
                          <h3 className={`text-base font-bold mb-0.5 truncate ${unread > 0 ? "text-slate-900" : "text-slate-800"}`}>
                            {commodity}
                          </h3>

                          {/* Quantity + Price */}
                          <div className="flex flex-wrap items-center gap-3 mb-1.5 text-xs text-slate-600">
                            {qty && (
                              <span className="flex items-center gap-1 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                📦 {qty}
                              </span>
                            )}
                            {price && (
                              <span className="flex items-center gap-1 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-emerald-700 font-semibold">
                                💵 {price}
                              </span>
                            )}
                            {room.origin_country && (
                              <span className="text-slate-400 text-[0.65rem]">🌍 {room.origin_country}</span>
                            )}
                          </div>

                          {/* Counterparty */}
                          <div className="flex items-center gap-1.5 mb-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-500">
                              <span className="font-medium text-slate-600">
                                {myRole === "buyer" ? "Seller" : "Buyer"}:
                              </span>{" "}
                              {counterparty}
                            </span>
                            <span className={`text-[0.6rem] font-bold border px-1.5 py-0.5 rounded-full ${
                              myRole === "buyer"
                                ? "text-blue-700 bg-blue-50 border-blue-200"
                                : "text-orange-700 bg-orange-50 border-orange-200"
                            }`}>
                              You are the {myRole === "buyer" ? "Buyer" : "Seller"}
                            </span>
                          </div>
                        </div>

                        {/* Right: Time + Arrow */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {timeStr && (
                            <span className="text-[0.65rem] text-slate-400 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />{timeStr}
                            </span>
                          )}
                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                            unread > 0
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-slate-200 group-hover:border-emerald-400 group-hover:bg-emerald-50"
                          }`}>
                            <ArrowRight className={`w-4 h-4 ${unread > 0 ? "text-white" : "text-slate-400 group-hover:text-emerald-600"}`} />
                          </div>
                        </div>
                      </div>

                      {/* Bottom info bar — only show if unread */}
                      {unread > 0 && (
                        <div className="px-5 pb-3">
                          <p className="text-xs text-emerald-700 font-medium">
                            🔔 {unread} unread message{unread > 1 ? "s" : ""} — Click to view
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
