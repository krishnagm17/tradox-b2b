import React, { useState, useEffect } from "react";
import { auth } from "../config/firebase";
import { supabase } from "../config/supabase";
import { Bell, CheckCircle2, ShieldAlert } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userUid, setUserUid] = useState(null);

  const fetchNotifications = async (uid) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserUid(user.uid);
        fetchNotifications(user.uid);
      } else {
        setUserUid(null);
        setNotifications([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time listener
  useEffect(() => {
    if (!userUid) return;
    const channel = supabase.channel('realtime-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `firebase_uid=eq.${userUid}` },
        () => {
          fetchNotifications(userUid);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userUid]);

  const markAsRead = async (id) => {
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900">Notifications</h3>
              {unreadCount > 0 && <span className="text-xs bg-[#10B981] text-white px-2 py-1 rounded-full">{unreadCount} New</span>}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  No notifications yet.
                </div>
              ) : (
                notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => !n.is_read && markAsRead(n.id)}
                    className={`p-4 border-b border-slate-50 flex gap-3 cursor-pointer transition-colors ${!n.is_read ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="mt-1">
                      {n.type === 'kyb_alert' ? <ShieldAlert className="w-5 h-5 text-amber-500" /> : <CheckCircle2 className="w-5 h-5 text-[#10B981]" />}
                    </div>
                    <div>
                      <h4 className={`text-sm ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
