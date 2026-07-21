import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Loader2, Edit3, X, Check, Inbox, MessageSquare } from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { COMMODITIES } from "../utils/constants";

export default function Navbar({ isFixed = false, centerContent = null, bgColor = "bg-brand-navy text-white", padding = "px-6" }) {
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
        const isEmailVerified = currentUser.emailVerified;
        const isPhoneVerified = currentUser.providerData.some(p => p.providerId === 'phone');
        
        if (!isEmailVerified || !isPhoneVerified) {
          await signOut(auth);
          setUser(null);
          setDbUser(null);
          setLoading(false);
          return;
        }

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
      const response = await fetch("http://localhost:8000/api/users/me", {
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
      const response = await fetch("http://localhost:8000/api/users/me/commodities", {
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
        className={`h-[72px] border-b border-border flex items-center justify-between shrink-0 ${bgColor} ${padding} ${
          isFixed ? "fixed top-0 w-full z-50 backdrop-blur-md" : ""
        }`}
      >
        {/* Left: Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
          <div className="flex items-center justify-center w-8 h-8 border border-primary/30 bg-primary/10 rounded-md">
            <span className="text-primary font-heading font-medium text-sm">T</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-heading font-bold tracking-tight leading-tight">Tradox<span className="text-primary">B2B</span></span>
            <span className="text-[0.55rem] font-mono tracking-[0.2em] text-muted-foreground uppercase leading-none mt-0.5">Global Bulk Trade</span>
          </div>
        </div>

        {/* Center: Optional Content (e.g. Live Board Indicator) */}
        {centerContent && (
          <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
            {centerContent}
          </div>
        )}

        {/* Right: Auth Controls */}
        <div className="flex items-center gap-6">
          {user && !loading && (
            <button 
              onClick={() => navigate("/inbox")}
              className="relative text-muted-foreground hover:text-white transition-colors flex items-center justify-center w-10 h-10 rounded-full border border-border bg-white/5 hover:bg-white/10"
              title="Inbox"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
          
          {loading ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center justify-center w-10 h-10 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none"
              >
                <span className="text-primary font-medium font-heading">{getInitials(dbUser?.full_name, user.email)}</span>
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-3 w-64 bg-brand-navy text-white border border-border rounded-md shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-border">
                    <p className="text-sm font-medium text-white truncate">{user.email}</p>
                    <p className="text-xs text-primary font-mono mt-1">
                      {dbUser ? dbUser.role : "TRADER"}
                    </p>
                  </div>
                  
                  {dbUser && (
                    <div className="p-4 border-b border-border space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span className="text-xs uppercase font-mono tracking-wider">Company</span>
                        <span className="text-white text-right max-w-[120px] truncate">{dbUser.company_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs uppercase font-mono tracking-wider">Region</span>
                        <span className="text-white text-right">{dbUser.country}</span>
                      </div>
                    </div>
                  )}

                  <div className="p-2 space-y-1">
                    <button 
                      onClick={() => {
                        setShowDropdown(false);
                        navigate("/dashboard");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:text-white hover:bg-white/5 rounded-md transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Company Dashboard
                    </button>
                    <button 
                      onClick={() => {
                        setShowDropdown(false);
                        if (dbUser && dbUser.commodities) {
                          setSelectedCommodities(dbUser.commodities.split(",").map(c => c.trim()).filter(c => c));
                        }
                        setShowModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:text-white hover:bg-white/5 rounded-md transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Commodities
                    </button>
                    <button 
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
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
