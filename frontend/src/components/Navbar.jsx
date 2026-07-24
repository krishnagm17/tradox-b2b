import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Loader2, Edit3, X, Check, Inbox, MessageSquare, Home, Shield } from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { COMMODITIES } from "../utils/constants";

export default function Navbar({ isFixed = false, centerContent = null, bgColor = "bg-white border-b border-slate-200 text-slate-900", padding = "px-6" }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dropdown State
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedCommodities, setSelectedCommodities] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchUserDetails(currentUser);
      } else {
        setUser(null);
        setDbUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchUserDetails = async (currentUser) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/users/me", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDbUser(data);
        // Pre-fill selected commodities if they exist
        if (data.commodities) {
          setSelectedCommodities(data.commodities.split(",").map(c => c.trim()).filter(c => c));
        }
      }
    } catch (error) {
      console.error("Failed to fetch user details", error);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setShowDropdown(false);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const getInitials = (name, email) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return "U";
  };

  const toggleCommodity = (commodity) => {
    setSelectedCommodities(prev => 
      prev.includes(commodity) 
        ? prev.filter(c => c !== commodity)
        : [...prev, commodity]
    );
  };

  const saveCommodities = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/users/me/commodities", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          commodities: selectedCommodities.join(", ")
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setDbUser(updatedUser);
        setShowModal(false);
      } else {
        console.error("Failed to save commodities");
      }
    } catch (error) {
      console.error("Error saving commodities:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header 
        className={`h-[72px] border-b flex items-center justify-between shrink-0 ${bgColor} ${padding} ${
          isFixed ? "fixed top-0 w-full z-50 backdrop-blur-md" : ""
        }`}
      >
        {/* Left: Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")} title="Return to Home Page">
          <img 
            src="/logo.jpg" 
            alt="TradoxB2B Logo" 
            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm"
          />
          <div className="flex flex-col">
            <span className="text-lg font-heading font-bold tracking-tight leading-tight text-slate-900">Tradox<span className="text-emerald-600">B2B</span></span>
            <span className="text-[0.55rem] font-mono tracking-[0.2em] text-slate-500 uppercase leading-none mt-0.5">Global Bulk Trade</span>
          </div>
        </div>

        {/* Center: Optional Content (e.g. Live Board Indicator) */}
        {centerContent && (
          <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
            {centerContent}
          </div>
        )}

        {/* Right: Auth Controls */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-900 transition-all text-xs font-semibold shadow-sm"
            title="Return to Home Page"
          >
            <Home className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Home</span>
          </button>

          {user && !loading && (
            <button 
              onClick={() => navigate("/inbox")}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-900 transition-all text-xs font-semibold shadow-sm"
              title="View Inbox & Negotiations"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">Inbox</span>
            </button>
          )}
          
          {loading ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-emerald-500 bg-emerald-600/20 hover:bg-emerald-600/30 transition-colors focus:outline-none shadow-sm"
              >
                <span className="text-emerald-400 font-bold text-sm font-heading">{getInitials(dbUser?.full_name, user.email)}</span>
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-3 w-64 bg-slate-900 text-slate-100 border border-slate-700 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden">
                  <div className="p-4 border-b border-slate-800 bg-slate-950/60">
                    <p className="text-sm font-bold text-white truncate mb-1">{user.email}</p>
                    <span className="text-[0.65rem] font-bold font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full inline-block">
                      {dbUser ? (dbUser.role || "TRADER") : "TRADER"}
                    </span>
                  </div>
                  
                  {dbUser && (
                    <div className="p-3 border-b border-slate-800 space-y-1.5 text-xs text-slate-300">
                      {dbUser.company_name && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 uppercase font-mono tracking-wider text-[0.65rem]">Company</span>
                          <span className="text-slate-100 font-medium truncate max-w-[120px]">{dbUser.company_name}</span>
                        </div>
                      )}
                      {dbUser.country && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 uppercase font-mono tracking-wider text-[0.65rem]">Region</span>
                          <span className="text-slate-100 font-medium">{dbUser.country}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-2 space-y-1">
                    {/* Home Page */}
                    <button 
                      onClick={() => { setShowDropdown(false); navigate("/"); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors font-medium"
                    >
                      <Home className="w-4 h-4 text-emerald-400" />
                      Home Page
                    </button>
                    {/* Profile */}
                    <button 
                      onClick={() => { setShowDropdown(false); navigate("/profile"); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors font-medium"
                    >
                      <User className="w-4 h-4 text-emerald-400" />
                      My Profile
                    </button>
                    {/* Settings */}
                    <button 
                      onClick={() => { setShowDropdown(false); navigate("/settings"); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors font-medium"
                    >
                      <Edit3 className="w-4 h-4 text-emerald-400" />
                      Settings
                    </button>
                    {/* KYB Verification & Status */}
                    <button 
                      onClick={() => { setShowDropdown(false); navigate("/kyb"); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors font-medium"
                    >
                      <Shield className="w-4 h-4 text-emerald-400" />
                      KYB Verification & Status
                    </button>

                    {/* Admin KYB Approvals — Strictly Only for Owner & Authorized Admins */}
                    {(
                      user.email?.toLowerCase() === "krishnametri223344@gmail.com" ||
                      user.email?.toLowerCase() === "owner@tradoxb2b.com" ||
                      (JSON.parse(localStorage.getItem("kyb_authorized_emails") || "[]").map(e => e.toLowerCase()).includes(user.email?.toLowerCase()))
                    ) && (
                      <button 
                        onClick={() => { setShowDropdown(false); navigate("/admin/kyb"); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors font-medium"
                      >
                        <Shield className="w-4 h-4 text-emerald-400" />
                        Admin KYB Approvals
                      </button>
                    )}
                    {/* Company Dashboard */}
                    <button 
                      onClick={() => { setShowDropdown(false); navigate("/dashboard"); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors font-medium"
                    >
                      <Inbox className="w-4 h-4 text-emerald-400" />
                      Company Dashboard
                    </button>
                    {/* Sign Out */}
                    <div className="pt-1 mt-1 border-t border-slate-800">
                      <button 
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors font-medium"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <button 
                onClick={() => navigate("/login")}
                className="text-sm text-foreground hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate("/register")}
                className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-md h-9 px-5 text-sm transition-colors"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Commodities Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-brand-navy/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-brand-navy text-white border border-border rounded-md shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <div>
                <h2 className="text-xl font-heading font-medium tracking-tight text-white mb-1">Edit Commodities</h2>
                <p className="text-xs text-muted-foreground font-sans">
                  Select the commodities your company actively trades in the market.
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto overflow-x-hidden flex-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {COMMODITIES.map(commodity => {
                  const isSelected = selectedCommodities.includes(commodity);
                  return (
                    <div 
                      key={commodity} 
                      onClick={() => toggleCommodity(commodity)} 
                      className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-border bg-muted'
                      }`}
                    >
                      <div className={`w-4 h-4 border rounded-md flex items-center justify-center shrink-0 transition-colors ${
                        isSelected 
                          ? 'border-primary bg-primary' 
                          : 'border-border bg-brand-navy text-white'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </div>
                      <span className={`text-xs truncate transition-colors ${isSelected ? 'text-white' : 'text-muted-foreground'}`}>
                        {commodity}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-border flex items-center justify-end gap-3 shrink-0 bg-brand-navy/90">
              <button 
                onClick={() => setShowModal(false)}
                className="text-sm font-semibold text-foreground hover:text-white transition-colors h-10 px-6 rounded-md border border-transparent hover:border-border"
              >
                Cancel
              </button>
              <button 
                onClick={saveCommodities}
                disabled={saving}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold rounded-md h-10 px-6 text-sm flex items-center transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
