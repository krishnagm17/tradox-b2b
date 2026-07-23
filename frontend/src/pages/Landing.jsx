import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Activity, ShieldCheck, Lock, Globe, Percent, Building2, Package, ArrowRight, CheckCircle2, UserCheck, MessageSquare, Truck, HelpCircle } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
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
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const renderTickerChange = (change) => {
    if (change > 0) return <span className="text-emerald-600 font-semibold">▲ +{change.toFixed(2)}%</span>;
    if (change < 0) return <span className="text-rose-600 font-semibold">▼ {change.toFixed(2)}%</span>;
    return <span className="text-slate-500">- 0.00%</span>;
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-emerald-500/20">
      
      {/* Top Header Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-md border-b border-slate-200' : 'bg-white border-b border-slate-100'}`}>
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-emerald-600/20">
              T
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-heading font-bold text-slate-900 tracking-tight">Tradox<span className="text-emerald-600">B2B</span></span>
              <span className="text-[0.65rem] font-mono tracking-wider text-slate-500 uppercase font-semibold">Global Wholesale Trade</span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm text-slate-600 hover:text-emerald-600 font-medium transition-colors">How It Works</a>
            <button onClick={() => navigate("/live-board")} className="text-sm text-slate-600 hover:text-emerald-600 font-medium transition-colors">Live Market</button>
            <a href="#commodities" className="text-sm text-slate-600 hover:text-emerald-600 font-medium transition-colors">Commodities</a>
            <a href="#why-us" className="text-sm text-slate-600 hover:text-emerald-600 font-medium transition-colors">Why Tradox</a>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/login")} 
              className="text-sm font-semibold text-slate-700 hover:text-emerald-600 px-4 py-2 rounded-lg transition-colors"
            >
              Log In
            </button>
            <button 
              onClick={() => navigate("/register")} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-bold rounded-lg transition-all shadow-md shadow-emerald-600/20 hover:scale-105 active:scale-95"
            >
              Get Started Free
            </button>
          </div>

        </div>
      </nav>

      {/* Hero Section - Clean Light Background */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b border-slate-100 overflow-hidden">
        {/* Subtle Decorative Backdrop Elements */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold tracking-wide uppercase mb-8 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Verified B2B Wholesale Trading Platform
          </div>
          
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-heading font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6 max-w-4xl mx-auto">
            Buy & Sell Bulk Commodities <br className="hidden sm:inline" />
            <span className="text-emerald-600">Directly Worldwide.</span>
          </h1>
          
          {/* Plain English Subtitle */}
          <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            TradoxB2B connects wholesale buyers, importers, and verified exporters. Trade bulk goods like <strong className="text-slate-900">Rice, Wheat, Steel, Sugar, and Gold</strong> with zero middleman fees and bank-grade payment security.
          </p>
          
          {/* Intuitive Call-to-Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto mb-16">
            <button 
              onClick={() => navigate("/live-board")} 
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 text-base font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
            >
              I Want to Buy
              <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate("/register")} 
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 text-base font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 hover:scale-105"
            >
              I Want to Sell
            </button>
          </div>

          {/* Social Proof Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-slate-200 max-w-3xl mx-auto">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-heading font-extrabold text-slate-900">140+</span>
              <span className="text-xs text-slate-500 font-semibold mt-1">Countries Connected</span>
            </div>
            <div className="flex flex-col items-center border-y sm:border-y-0 sm:border-x border-slate-200 py-4 sm:py-0">
              <span className="text-3xl font-heading font-extrabold text-slate-900">18,000+</span>
              <span className="text-xs text-slate-500 font-semibold mt-1">Verified Businesses</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-heading font-extrabold text-slate-900">$4.8 Billion</span>
              <span className="text-xs text-slate-500 font-semibold mt-1">Total Trade Volume</span>
            </div>
          </div>

        </div>
      </section>

      {/* Live Market Ticker */}
      <div className="bg-slate-100 border-b border-slate-200 py-3.5 overflow-hidden whitespace-nowrap text-xs font-mono text-slate-700 shadow-inner">
        <div className="inline-block animate-[marquee_30s_linear_infinite]">
          <span className="mx-8 font-medium">GOLD: <span className="text-slate-900 font-bold">$2,450.50</span> / OZ {renderTickerChange(0.5)}</span>
          <span className="mx-8 font-medium">WHEAT: <span className="text-slate-900 font-bold">$680.20</span> / MT {renderTickerChange(-1.2)}</span>
          <span className="mx-8 font-medium">BASMATI RICE: <span className="text-slate-900 font-bold">$1,250.00</span> / MT {renderTickerChange(2.1)}</span>
          <span className="mx-8 font-medium">OPC CEMENT: <span className="text-slate-900 font-bold">$55.00</span> / MT {renderTickerChange(0)}</span>
          <span className="mx-8 font-medium">TMT STEEL: <span className="text-slate-900 font-bold">$620.00</span> / MT {renderTickerChange(1.1)}</span>
          <span className="mx-8 font-medium">RAW COTTON: <span className="text-slate-900 font-bold">$1,840.00</span> / MT {renderTickerChange(0)}</span>
        </div>
      </div>

      {/* HOW IT WORKS SECTION (Simple 4-Step Diagram - White Theme) */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-white relative">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-700 uppercase bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
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
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative group hover:border-emerald-500 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg mb-6 shadow-md shadow-emerald-600/20 group-hover:scale-110 transition-transform">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Create Free Account</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Sign up in seconds and submit simple business verification documents (KYB) to ensure a safe trading network.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative group hover:border-emerald-500 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg mb-6 shadow-md shadow-emerald-600/20 group-hover:scale-110 transition-transform">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Post or Browse Lots</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Buyers post what they need to BUY (RFQ). Sellers post available inventory (Products). Or browse live deals.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative group hover:border-emerald-500 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg mb-6 shadow-md shadow-emerald-600/20 group-hover:scale-110 transition-transform">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Negotiate Live</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Chat directly with buyers or sellers in real-time. Send and accept formal price cards with 1-click.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative group hover:border-emerald-500 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg mb-6 shadow-md shadow-emerald-600/20 group-hover:scale-110 transition-transform">
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
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-600/20"
            >
              Explore Live Market Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* WHY TRADOXB2B SECTION - White & Slate Light Theme */}
      <section id="why-us" className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-12">
            <div>
              <span className="text-xs font-mono font-bold tracking-widest text-emerald-700 uppercase bg-emerald-100 px-3.5 py-1.5 rounded-full border border-emerald-200 mb-4 inline-block">
                Built for Safety & Profit
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-slate-900 leading-tight mb-6">
                Why International Traders Trust TradoxB2B
              </h2>
              <p className="text-slate-600 text-base leading-relaxed mb-8">
                Traditional bulk commodity trading relies on expensive middleman brokers and slow paperwork. TradoxB2B gives you direct access, verified security, and full transparency.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-800 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  Direct connection with verified buyers & suppliers
                </div>
                <div className="flex items-center gap-3 text-slate-800 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  Save 3% to 5% on every shipment (Zero commission)
                </div>
                <div className="flex items-center gap-3 text-slate-800 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  Bank-backed escrow and Letter of Credit (LC) protection
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <ShieldCheck className="w-8 h-8 text-emerald-600 mb-3" />
                <h4 className="text-base font-bold text-slate-900 mb-1">100% Verified Members</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Every business is checked with trade licenses and tax certificates.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <Lock className="w-8 h-8 text-emerald-600 mb-3" />
                <h4 className="text-base font-bold text-slate-900 mb-1">Escrow Protection</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Payments are locked safely and released only after delivery milestones.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <Activity className="w-8 h-8 text-emerald-600 mb-3" />
                <h4 className="text-base font-bold text-slate-900 mb-1">Live Price Discovery</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Broadcast buy or sell offers globally and receive competitive responses.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <Percent className="w-8 h-8 text-emerald-600 mb-3" />
                <h4 className="text-base font-bold text-slate-900 mb-1">Zero Commission</h4>
                <p className="text-xs text-slate-500 leading-relaxed">No hidden fees or broker markups. Direct prices between buyer & seller.</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* COMMODITIES MARKET SECTION - White Background */}
      <section id="commodities" className="py-20 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-xs font-mono font-bold tracking-widest text-emerald-700 uppercase bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 mb-3 inline-block">
                Top Commodities
              </span>
              <h2 className="text-3xl font-heading font-bold text-slate-900">
                Active Markets Available Today
              </h2>
            </div>
            <button 
              onClick={() => navigate("/live-board")}
              className="text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
            >
              View All Live Lots →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <CommodityCard title="Basmati Rice" vol="5,000+ MT Active" price={`$ ${marketData.rice.price.toFixed(2)} / MT`} onClick={() => navigate("/live-board")} />
            <CommodityCard title="Gold Bullion" vol="250+ KG Active" price={`$ ${marketData.gold.price.toFixed(2)} / OZ`} onClick={() => navigate("/live-board")} />
            <CommodityCard title="TMT Steel" vol="12,000+ MT Active" price={`$ ${marketData.steel.price.toFixed(2)} / MT`} onClick={() => navigate("/live-board")} />
            <CommodityCard title="OPC Cement" vol="25,000+ MT Active" price={`$ ${marketData.cement.price.toFixed(2)} / MT`} onClick={() => navigate("/live-board")} />
            <CommodityCard title="Wheat Grain" vol="30,000+ MT Active" price={`$ ${marketData.wheat.price.toFixed(2)} / MT`} onClick={() => navigate("/live-board")} />
            <CommodityCard title="Raw Cotton" vol="5,500+ MT Active" price={`$ ${marketData.cotton.price.toFixed(2)} / MT`} onClick={() => navigate("/live-board")} />
            <CommodityCard title="White Sugar" vol="12,500+ MT Active" price={`$ ${marketData.sugar.price.toFixed(2)} / MT`} onClick={() => navigate("/live-board")} />
            <CommodityCard title="Arabica Coffee" vol="800+ MT Active" price={`$ ${marketData.coffee.price.toFixed(2)} / MT`} onClick={() => navigate("/live-board")} />
          </div>

        </div>
      </section>

      {/* CALL TO ACTION BAND - Clean Green Accent */}
      <section className="py-20 bg-emerald-600 text-white relative overflow-hidden text-center shadow-lg">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white mb-6 tracking-tight">
            Ready to Grow Your Bulk Trade Business?
          </h2>
          <p className="text-emerald-100 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed font-medium">
            Join over 18,000 verified buyers and suppliers already trading directly on TradoxB2B.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate("/register")} 
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 text-base font-bold rounded-xl transition-all shadow-xl hover:scale-105"
            >
              Create Free Account
            </button>
            <button 
              onClick={() => navigate("/live-board")} 
              className="w-full sm:w-auto bg-white hover:bg-slate-100 text-emerald-900 px-8 py-4 text-base font-bold rounded-xl transition-all shadow-md"
            >
              Explore Live Board
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER - High Contrast Light/Dark Navy */}
      <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 text-xs">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
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

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-[0.7rem] text-slate-400">
            <p>© 2026 TradoxB2B Private Limited. All rights reserved.</p>
            <p className="font-mono">Global Wholesale Commodity Network</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

function CommodityCard({ title, vol, price, onClick }) {
  return (
    <div onClick={onClick} className="group bg-slate-50 hover:bg-white rounded-xl border border-slate-200 p-6 transition-all duration-200 hover:border-emerald-500 hover:-translate-y-1 hover:shadow-md cursor-pointer flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform shadow-sm">
            <Package className="w-5 h-5" />
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">{price}</span>
        </div>
        <h3 className="text-lg font-heading font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">{title}</h3>
        <p className="text-xs text-slate-500">{vol}</p>
      </div>
      <div className="mt-6 pt-4 border-t border-slate-200 text-xs font-bold text-emerald-600 flex items-center justify-between">
        <span>Explore Lots</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}
