import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Activity, ShieldCheck, Lock, Globe, Percent, Building2, Package, ArrowRight, CheckCircle2, UserCheck, MessageSquare, Truck, HelpCircle, User, LayoutDashboard } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../config/firebase";

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ users_count: 1, companies_count: 1, products_count: 0, rfqs_count: 0, total_lots: 0 });
  const [topCommodities, setTopCommodities] = useState([]);
  const [marketData, setMarketData] = useState({
    gold: { price: 2450.50, change: 0.5 },
    wheat: { price: 680.20, change: -1.2 },
    rice: { price: 1250.00, change: 2.1 },
    cement: { price: 55.00, change: 0.0 },
    steel: { price: 620.00, change: 1.1 },
    cotton: { price: 1840.00, change: 0.0 },
    sugar: { price: 540.00, change: 0.0 },
    coffee: { price: 4320.00, change: 0.0 }
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    // Fetch real platform statistics from database
    fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/stats")
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.companies_count === "number") {
          setStats(data);
        }
      })
      .catch(err => console.error("Failed to fetch live stats", err));

    // Fetch real top commodity lots from database
    fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/commodities/top")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTopCommodities(data);
        }
      })
      .catch(err => console.error("Failed to fetch top commodities", err));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      unsub();
    };
  }, []);

  const renderTickerChange = (change) => {
    if (change > 0) return <span className="text-emerald-600 font-semibold">▲ +{change.toFixed(2)}%</span>;
    if (change < 0) return <span className="text-rose-600 font-semibold">▼ {change.toFixed(2)}%</span>;
    return <span className="text-slate-400">- 0.00%</span>;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans selection:bg-emerald-500/30">
      
      {/* Navigation Header */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-md shadow-md border-b border-slate-200 py-3" : "bg-white border-b border-slate-200 py-4"
      }`}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img 
              src="/logo.jpg" 
              alt="TradoxB2B Logo" 
              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-md"
            />
            <div className="flex flex-col">
              <span className="text-xl font-heading font-extrabold text-slate-900 tracking-tight leading-none">
                Tradox<span className="text-emerald-600">B2B</span>
              </span>
              <span className="text-[0.6rem] font-mono tracking-widest text-slate-500 uppercase font-semibold">
                Direct Bulk Trade
              </span>
            </div>
          </div>

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#how-it-works" className="hover:text-emerald-600 transition-colors">How It Works</a>
            <a href="#why-us" className="hover:text-emerald-600 transition-colors">Why TradoxB2B</a>
            <a href="#commodities" className="hover:text-emerald-600 transition-colors">Commodities</a>
            <button onClick={() => navigate("/live-board")} className="hover:text-emerald-600 transition-colors">Live Market Board</button>
            <button onClick={() => navigate("/trade-tools")} className="hover:text-emerald-600 transition-colors">Trade Tools</button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <button 
                  onClick={() => navigate("/dashboard")} 
                  className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                  Dashboard
                </button>
                <button 
                  onClick={() => navigate("/profile")} 
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95"
                >
                  <User className="w-4 h-4" />
                  My Profile
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => navigate("/login")} 
                  className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg transition-colors"
                >
                  Log In
                </button>
                <button 
                  onClick={() => navigate("/register")} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-bold rounded-lg transition-all shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95"
                >
                  Get Started Free
                </button>
              </>
            )}
          </div>

        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white border-b border-slate-800 overflow-hidden">
        {/* Decorative Radial Lighting & Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/20 blur-[140px] rounded-full pointer-events-none" />

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/80 border border-emerald-700/80 text-emerald-400 text-xs font-bold tracking-wide uppercase mb-8 shadow-lg shadow-emerald-950/50">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Verified B2B Wholesale Trading Platform
          </div>
          
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-heading font-extrabold text-white tracking-tight leading-[1.1] mb-6 max-w-4xl mx-auto">
            Buy & Sell Bulk Commodities <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">Directly Worldwide.</span>
          </h1>
          
          {/* Plain English Subtitle */}
          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            TradoxB2B connects wholesale buyers, importers, and verified exporters. Trade bulk goods like <strong className="text-white font-semibold">Rice, Wheat, Steel, Sugar, and Gold</strong> with zero middleman fees and bank-grade payment security.
          </p>
          
          {/* Intuitive Call-to-Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto mb-16">
            <button 
              onClick={() => navigate("/live-board")} 
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-4 text-base font-bold rounded-xl transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
            >
              I Want to Buy
              <ArrowRight className="w-5 h-5 text-slate-950" />
            </button>
            <button 
              onClick={() => navigate("/register")} 
              className="w-full sm:w-auto bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700 px-8 py-4 text-base font-bold rounded-xl transition-all shadow-md"
            >
              I Want to Sell
            </button>
          </div>

          {/* Social Proof Bar — Real Database Numbers */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex flex-col items-center">
                <span className="text-3xl sm:text-4xl font-heading font-extrabold text-white">{stats.companies_count}</span>
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider mt-1">Verified Businesses</span>
              </div>
              <div className="flex flex-col items-center border-y sm:border-y-0 sm:border-x border-slate-800 py-4 sm:py-0">
                <span className="text-3xl sm:text-4xl font-heading font-extrabold text-white">{stats.total_lots}</span>
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider mt-1">Active Trade Lots</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl sm:text-4xl font-heading font-extrabold text-white">{stats.users_count}</span>
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider mt-1">Registered Traders</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Live Market Ticker */}
      <div className="bg-slate-950 text-slate-100 border-y border-slate-800 py-3.5 overflow-hidden whitespace-nowrap text-xs font-mono shadow-inner">
        <div className="inline-block animate-[marquee_30s_linear_infinite]">
          <span className="mx-8">GOLD: <span className="text-emerald-400 font-bold">$2,450.50</span> / OZ {renderTickerChange(0.5)}</span>
          <span className="mx-8">WHEAT: <span className="text-emerald-400 font-bold">$680.20</span> / MT {renderTickerChange(-1.2)}</span>
          <span className="mx-8">BASMATI RICE: <span className="text-emerald-400 font-bold">$1,250.00</span> / MT {renderTickerChange(2.1)}</span>
          <span className="mx-8">OPC CEMENT: <span className="text-emerald-400 font-bold">$55.00</span> / MT {renderTickerChange(0)}</span>
          <span className="mx-8">TMT STEEL: <span className="text-emerald-400 font-bold">$620.00</span> / MT {renderTickerChange(1.1)}</span>
          <span className="mx-8">RAW COTTON: <span className="text-emerald-400 font-bold">$1,840.00</span> / MT {renderTickerChange(0)}</span>
        </div>
      </div>

      {/* HOW IT WORKS SECTION (Simple 4-Step Diagram) */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-slate-100/80 relative border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-800 uppercase bg-emerald-100 px-3.5 py-1.5 rounded-full border border-emerald-300">
              Simple 4-Step Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-slate-900 mt-4 mb-4">
              How TradoxB2B Works for You
            </h2>
            <p className="text-slate-600 text-base">
              No complicated brokers or confusion. Here is how buyers and sellers connect and complete safe bulk trades.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Step 1 */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 relative group hover:border-emerald-500 transition-all shadow-md hover:shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-lg mb-6 group-hover:scale-110 transition-transform">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Create Free Account</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Sign up in seconds and submit simple business verification documents (KYB) to ensure a safe trading network.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 relative group hover:border-emerald-500 transition-all shadow-md hover:shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-lg mb-6 group-hover:scale-110 transition-transform">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Post or Browse Lots</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Buyers post what they need to BUY (RFQ). Sellers post available inventory (Products). Or browse live deals.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 relative group hover:border-emerald-500 transition-all shadow-md hover:shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-lg mb-6 group-hover:scale-110 transition-transform">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Negotiate Live</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Chat directly with buyers or sellers in real-time. Send and accept formal price cards with 1-click.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 relative group hover:border-emerald-500 transition-all shadow-md hover:shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-lg mb-6 group-hover:scale-110 transition-transform">
                4
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Lock & Ship Deal</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Lock contract terms with bank-grade escrow or LC protection. Track shipment progress from port to port.
              </p>
            </div>

          </div>

          <div className="mt-12 text-center">
            <button 
              onClick={() => navigate("/live-board")}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20"
            >
              Explore Live Market Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* WHY TRADOXB2B SECTION */}
      <section id="why-us" className="py-20 bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-12">
            <div>
              <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase bg-emerald-950/80 px-3.5 py-1.5 rounded-full border border-emerald-800 mb-4 inline-block">
                Built for Safety & Profit
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white leading-tight mb-6">
                Why International Traders Trust TradoxB2B
              </h2>
              <p className="text-slate-300 text-base leading-relaxed mb-8">
                Traditional bulk commodity trading relies on expensive middleman brokers and slow paperwork. TradoxB2B gives you direct access, verified security, and full transparency.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-200 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  Direct connection with verified buyers & suppliers
                </div>
                <div className="flex items-center gap-3 text-slate-200 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  Save 3% to 5% on every shipment (Zero commission)
                </div>
                <div className="flex items-center gap-3 text-slate-200 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  Bank-backed escrow and Letter of Credit (LC) protection
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-md hover:border-emerald-500/50 transition-colors">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mb-3" />
                <h4 className="text-base font-bold text-white mb-1">100% Verified Members</h4>
                <p className="text-xs text-slate-300 leading-relaxed">Every business is checked with trade licenses and tax certificates.</p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-md hover:border-emerald-500/50 transition-colors">
                <Lock className="w-8 h-8 text-emerald-400 mb-3" />
                <h4 className="text-base font-bold text-white mb-1">Escrow Protection</h4>
                <p className="text-xs text-slate-300 leading-relaxed">Payments are locked safely and released only after delivery milestones.</p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-md hover:border-emerald-500/50 transition-colors">
                <Activity className="w-8 h-8 text-emerald-400 mb-3" />
                <h4 className="text-base font-bold text-white mb-1">Live Price Discovery</h4>
                <p className="text-xs text-slate-300 leading-relaxed">Broadcast buy or sell offers globally and receive competitive responses.</p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-md hover:border-emerald-500/50 transition-colors">
                <Percent className="w-8 h-8 text-emerald-400 mb-3" />
                <h4 className="text-base font-bold text-white mb-1">Zero Commission</h4>
                <p className="text-xs text-slate-300 leading-relaxed">No hidden fees or broker markups. Direct prices between buyer & seller.</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* COMMODITIES MARKET SECTION */}
      <section id="commodities" className="py-20 bg-gradient-to-b from-slate-100 to-slate-50 border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-xs font-mono font-bold tracking-widest text-emerald-800 uppercase bg-emerald-100 px-3.5 py-1.5 rounded-full border border-emerald-300 mb-3 inline-block">
                Top Commodities
              </span>
              <h2 className="text-3xl font-heading font-bold text-slate-900">
                Active Markets Available Today
              </h2>
            </div>
            <button 
              onClick={() => navigate("/live-board")}
              className="text-sm font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl transition-colors"
            >
              View All Live Lots →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topCommodities.length > 0 ? (
              topCommodities.map((item, idx) => (
                <CommodityCard
                  key={item.id || idx}
                  title={item.title}
                  vol={item.volume}
                  price={item.price}
                  badge={item.type}
                  onClick={() => navigate("/live-board")}
                />
              ))
            ) : (
              <>
                <CommodityCard title="Basmati Rice 1121" vol="Active Market Lot" price={`$ ${marketData.rice.price.toFixed(2)} / MT`} badge="Agriculture" onClick={() => navigate("/live-board")} />
                <CommodityCard title="Gold Bullion 999.9" vol="Active Market Lot" price={`$ ${marketData.gold.price.toFixed(2)} / OZ`} badge="Metals" onClick={() => navigate("/live-board")} />
                <CommodityCard title="TMT Steel Rebar" vol="Active Market Lot" price={`$ ${marketData.steel.price.toFixed(2)} / MT`} badge="Metals & Mining" onClick={() => navigate("/live-board")} />
                <CommodityCard title="OPC 53 Cement" vol="Active Market Lot" price={`$ ${marketData.cement.price.toFixed(2)} / MT`} badge="Construction" onClick={() => navigate("/live-board")} />
              </>
            )}
          </div>

        </div>
      </section>

      {/* CALL TO ACTION BAND */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white relative overflow-hidden shadow-2xl text-center">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white mb-6 tracking-tight">
            Ready to Grow Your Bulk Trade Business?
          </h2>
          <p className="text-emerald-100 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed font-normal">
            Join verified buyers and suppliers already trading directly on TradoxB2B.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate("/register")} 
              className="w-full sm:w-auto bg-slate-950 hover:bg-slate-900 text-white px-8 py-4 text-base font-bold rounded-xl transition-all shadow-2xl hover:scale-105"
            >
              Create Free Account
            </button>
            <button 
              onClick={() => navigate("/live-board")} 
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/30 px-8 py-4 text-base font-bold rounded-xl transition-all backdrop-blur-md"
            >
              Explore Live Board
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 pt-16 pb-8 border-t border-slate-900 text-xs">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-900">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-bold text-sm flex items-center justify-center">T</div>
                <span className="text-lg font-heading font-bold text-white">Tradox<span className="text-emerald-400">B2B</span></span>
              </div>
              <p className="text-slate-400 leading-relaxed">The direct B2B wholesale platform for global bulk commodity negotiation.</p>
            </div>
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><button onClick={() => navigate("/live-board")} className="hover:text-emerald-400 transition-colors">Live Market Board</button></li>
                <li><button onClick={() => navigate("/register")} className="hover:text-emerald-400 transition-colors">Create Free Account</button></li>
                <li><button onClick={() => navigate("/login")} className="hover:text-emerald-400 transition-colors">Member Login</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider mb-4">Trading Tools</h4>
              <ul className="space-y-2">
                <li><button onClick={() => navigate("/trade-tools")} className="hover:text-emerald-400 transition-colors">HSN Code Finder</button></li>
                <li><button onClick={() => navigate("/trade-tools")} className="hover:text-emerald-400 transition-colors">Duty Calculator</button></li>
                <li><button onClick={() => navigate("/onboarding/kyb")} className="hover:text-emerald-400 transition-colors">Business Verification</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider mb-4">Security</h4>
              <p className="text-slate-400 leading-relaxed mb-2">Protected by bank-grade encryption and strict KYB verification protocols.</p>
              <span className="text-emerald-400 font-mono text-[0.7rem] uppercase font-bold">100% Direct & Transparent</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-[0.7rem]">
            <p>© 2026 TradoxB2B Private Limited. All rights reserved.</p>
            <p className="font-mono">Global Wholesale Commodity Network</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

function CommodityCard({ title, vol, price, badge, onClick }) {
  return (
    <div onClick={onClick} className="group bg-white rounded-2xl border border-slate-200 p-6 transition-all duration-200 hover:border-emerald-500 hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
            <Package className="w-5 h-5" />
          </div>
          {badge && (
            <span className="text-[0.65rem] font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
              {badge}
            </span>
          )}
        </div>
        <h3 className="text-lg font-heading font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">{title}</h3>
        <p className="text-xs text-slate-500 font-medium mb-3">{vol}</p>
        <span className="inline-block font-mono text-sm font-bold text-slate-900 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          {price}
        </span>
      </div>
      <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-bold text-emerald-600 flex items-center justify-between">
        <span>Explore Lots</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}
