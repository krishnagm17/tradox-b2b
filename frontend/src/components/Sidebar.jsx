import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Inbox, FileText, Package, Users, Settings, LogOut, User, Menu, X } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: "Inbox & Negotiations", path: "/inbox", icon: <Inbox className="w-5 h-5" /> },
    { name: "Live Board", path: "/live-board", icon: <FileText className="w-5 h-5" /> },
    { name: "Trade Tools", path: "/trade-tools", icon: <Package className="w-5 h-5" /> },
  ];

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed bottom-6 right-6 z-[60] p-4 bg-brand-navy text-white rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-brand-navy border-r border-slate-800 flex flex-col shrink-0 z-[50] transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Logo Area */}
        <div 
          onClick={() => { navigate("/dashboard"); setIsOpen(false); }}
          className="h-16 flex items-center justify-between px-6 border-b border-slate-800 shrink-0 cursor-pointer hover:bg-slate-800/50 transition-colors"
        >
          <div className="font-cinzel text-lg text-white tracking-[0.08em] leading-none uppercase">
            <span className="text-[1.3em] text-emerald-400 font-bold">T</span>radox <span className="text-[1.3em] text-emerald-400 font-bold">B2B</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          <div className="text-[0.65rem] font-mono tracking-widest text-slate-500 uppercase mb-4 px-3">Menu</div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.path);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-md"></div>
                )}
                <div className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-primary" : "text-slate-400"}`}>
                  {item.icon}
                </div>
                {item.name}
              </button>
            );
          })}
        </div>

        {/* Footer / User Actions */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          <div className="text-[0.65rem] font-mono tracking-widest text-slate-500 uppercase mb-2 px-3 mt-2">Account</div>
          
          <button 
            onClick={() => { navigate("/profile"); setIsOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
              location.pathname === "/profile" ? "bg-primary/10 text-primary" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <User className={`w-5 h-5 group-hover:scale-110 transition-transform duration-200 ${location.pathname === "/profile" ? "text-primary" : "text-slate-500"}`} />
            Profile
          </button>
          
          <button 
            onClick={() => { navigate("/settings"); setIsOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
              location.pathname === "/settings" ? "bg-primary/10 text-primary" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Settings className={`w-5 h-5 group-hover:scale-110 transition-transform duration-200 ${location.pathname === "/settings" ? "text-primary" : "text-slate-500"}`} />
            Settings
          </button>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 group mt-2"
          >
            <LogOut className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform duration-200" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
