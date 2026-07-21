import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Activity, ShieldCheck, Lock, Globe, Percent, Building2, Package, ArrowRight } from "lucide-react";
import Navbar from "../components/Navbar";

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
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const renderTickerChange = (change) => {
    if (change > 0) return <span className="text-primary font-semibold">▲ +{change.toFixed(2)}%</span>;
    if (change < 0) return <span className="text-destructive font-semibold">▼ {change.toFixed(2)}%</span>;
    return <span className="text-muted-foreground">- 0.00%</span>;
  };

  return (
    <div className="min-h-screen bg-muted text-foreground flex flex-col font-sans selection:bg-primary/30">
      
      {/* Dynamic Navbar */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-brand-navy/95 backdrop-blur-md shadow-lg shadow-black/10' : 'bg-transparent'}`}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex items-center justify-between py-5">
          <div className="flex flex-col gap-0.5 cursor-pointer" onClick={() => navigate("/")}>
            <div className="font-cinzel text-lg text-white tracking-[0.08em] leading-none uppercase">
              <span className="text-[1.3em]">T</span>radox <span className="text-[1.3em]">B2B</span>
            </div>
            <div className="text-[0.45rem] text-primary tracking-[0.3em] uppercase font-semibold">Enterprise Terminal</div>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <a href="#" className="text-white/80 hover:text-white px-3 py-2 text-[0.7rem] font-semibold tracking-[0.08em] uppercase transition-colors">Platform</a>
            <a href="#" className="text-white/80 hover:text-white px-3 py-2 text-[0.7rem] font-semibold tracking-[0.08em] uppercase transition-colors">Commodities</a>
            <a href="#" className="text-white/80 hover:text-white px-3 py-2 text-[0.7rem] font-semibold tracking-[0.08em] uppercase transition-colors">Market</a>
            <a href="#" className="text-white/80 hover:text-white px-3 py-2 text-[0.7rem] font-semibold tracking-[0.08em] uppercase transition-colors">About</a>
            <button onClick={() => navigate("/login")} className="ml-4 bg-primary text-white px-6 py-2.5 text-[0.7rem] tracking-[0.1em] uppercase font-semibold rounded-[3px] hover:bg-primary/90 transition-colors">
              Terminal Access
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[100vh] bg-[linear-gradient(160deg,#0a101d_0%,#0F172A_50%,#0a101d_100%)] flex items-center pt-24 pb-16 overflow-hidden">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[linear-gradient(90deg,transparent,rgba(16,185,129,0.4),transparent)]" />
        
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10 w-full pt-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-[1px] bg-primary"></div>
            <span className="text-[0.7rem] text-primary tracking-[0.22em] uppercase font-semibold">Institutional Grade Trading</span>
          </div>
          
          <h1 className="font-heading text-[clamp(3rem,6vw,5.5rem)] font-semibold leading-[1.08] text-white mb-8 max-w-4xl">
            The premium network for <br />
            <em className="text-primary font-medium">bulk commodity</em> negotiation.
          </h1>
          
          <p className="text-[1.05rem] text-white/65 leading-[1.75] max-w-2xl mb-12 font-light">
            TradoxB2B is a sophisticated electronic trading terminal connecting verified importers with established exporters. Execute multi-million dollar commodity contracts with zero brokerage and total transparency.
          </p>
          
          <div className="flex flex-wrap gap-4 mb-16">
            <button onClick={() => navigate("/register")} className="bg-primary text-white px-9 py-4 text-[0.8rem] tracking-[0.1em] uppercase font-semibold rounded-[3px] hover:bg-primary/90 transition-colors border-none cursor-pointer">
              Request Platform Access
            </button>
            <button onClick={() => navigate("/live-board")} className="bg-transparent text-white/80 border border-white/25 px-9 py-4 text-[0.8rem] tracking-[0.1em] uppercase font-semibold rounded-[3px] hover:border-white/50 hover:text-white transition-colors cursor-pointer">
              View Live Ticker
            </button>
          </div>
          
          <div className="flex flex-wrap pt-8 border-t border-white/10">
            <div className="flex flex-col gap-1 px-8 border-r border-white/10 first:pl-0 last:border-r-0">
              <span className="font-heading text-3xl font-bold text-white leading-none">140+</span>
              <span className="text-[0.7rem] text-white/45 tracking-[0.1em] uppercase">Global Jurisdictions</span>
            </div>
            <div className="flex flex-col gap-1 px-8 border-r border-white/10 last:border-r-0">
              <span className="font-heading text-3xl font-bold text-white leading-none">18.2k</span>
              <span className="text-[0.7rem] text-white/45 tracking-[0.1em] uppercase">KYB Verified Entities</span>
            </div>
            <div className="flex flex-col gap-1 px-8 border-r border-white/10 last:border-r-0">
              <span className="font-heading text-3xl font-bold text-white leading-none">$4.8B</span>
              <span className="text-[0.7rem] text-white/45 tracking-[0.1em] uppercase">Traded Volume YTD</span>
            </div>
          </div>
        </div>
      </section>

      {/* Ticker Strip */}
      <div className="bg-brand-navy border-b border-white/5 font-mono text-[0.75rem] tracking-[0.15em] overflow-hidden whitespace-nowrap py-3">
        <div className="inline-block animate-[marquee_25s_linear_infinite] text-white/50 uppercase font-semibold">
          <span className="mx-8">GOLD: <span className="text-white">2450.50</span> USD/OZ {renderTickerChange(0.5)}</span>
          <span className="mx-8">WHEAT: <span className="text-white">680.20</span> USD/MT {renderTickerChange(-1.2)}</span>
          <span className="mx-8">BASMATI: <span className="text-white">1250.00</span> USD/MT {renderTickerChange(2.1)}</span>
          <span className="mx-8">CEMENT: <span className="text-white">55.00</span> USD/MT {renderTickerChange(0)}</span>
          <span className="mx-8">STEEL: <span className="text-white">620.00</span> USD/MT {renderTickerChange(1.1)}</span>
        </div>
      </div>

      {/* About/Trust Strip */}
      <div className="bg-white py-24">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block text-[0.65rem] tracking-[0.2em] uppercase text-primary font-bold mb-5 px-3 py-1.5 border border-primary/20 rounded-[3px]">
                Why TradoxB2B
              </span>
              <h2 className="font-heading text-[clamp(2rem,3.5vw,2.8rem)] font-semibold text-brand-navy leading-[1.2] mb-6">
                Engineered for <br /><em className="text-primary not-italic font-medium">Compliance-First</em> Trade.
              </h2>
              <p className="text-[0.95rem] text-slate-600 leading-[1.8] mb-8">
                In international bulk trade, certainty is currency. TradoxB2B restricts access exclusively to KYB-verified corporate entities. Every quote, counteroffer, and contract executed on our terminal is legally binding and escrow-backed.
              </p>
              <div className="flex gap-4">
                <button className="bg-primary text-white px-6 py-3 text-[0.65rem] tracking-[0.1em] uppercase font-bold rounded-[3px] hover:bg-primary/90 transition-colors">
                  Platform Documentation
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-muted border border-border rounded-[6px] p-6 transition-all hover:border-primary/30 hover:shadow-sm">
                <ShieldCheck className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-[0.9rem] font-bold text-brand-navy mb-1.5">KYB-Verified Only</h3>
                <p className="text-[0.75rem] text-slate-500 leading-[1.6]">Counterparties vetted with trade licenses, tax IDs, and bank comfort letters.</p>
              </div>
              <div className="bg-muted border border-border rounded-[6px] p-6 transition-all hover:border-primary/30 hover:shadow-sm">
                <Lock className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-[0.9rem] font-bold text-brand-navy mb-1.5">Escrow Payments</h3>
                <p className="text-[0.75rem] text-slate-500 leading-[1.6]">Bank-grade escrow with milestone releases from LC issuance to port delivery.</p>
              </div>
              <div className="bg-muted border border-border rounded-[6px] p-6 transition-all hover:border-primary/30 hover:shadow-sm">
                <Activity className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-[0.9rem] font-bold text-brand-navy mb-1.5">Live Discovery</h3>
                <p className="text-[0.75rem] text-slate-500 leading-[1.6]">Broadcast requirements globally and watch sellers counter in real-time.</p>
              </div>
              <div className="bg-muted border border-border rounded-[6px] p-6 transition-all hover:border-primary/30 hover:shadow-sm">
                <Percent className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-[0.9rem] font-bold text-brand-navy mb-1.5">Zero Brokerage</h3>
                <p className="text-[0.75rem] text-slate-500 leading-[1.6]">Direct-to-source. Flat platform fee. Save 3-5% on every international shipment.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <section className="bg-muted py-24">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="inline-block text-[0.65rem] tracking-[0.2em] uppercase text-primary font-bold mb-4">
                Markets
              </span>
              <h2 className="font-heading text-[clamp(2rem,3.5vw,2.6rem)] font-semibold text-brand-navy leading-[1.2]">
                Trade what the world buys.
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <CategoryCard title="Basmati Rice" vol="5,000+ MT active" price={`$ ${marketData.rice.price.toFixed(2)}`} />
            <CategoryCard title="Gold Bullion" vol="250+ KG active" price={`$ ${marketData.gold.price.toFixed(2)}`} />
            <CategoryCard title="TMT Steel" vol="12,000+ MT active" price={`$ ${marketData.steel.price.toFixed(2)}`} />
            <CategoryCard title="Cement OPC" vol="25,000+ MT active" price={`$ ${marketData.cement.price.toFixed(2)}`} />
            <CategoryCard title="Wheat Grain" vol="30,000+ MT active" price={`$ ${marketData.wheat.price.toFixed(2)}`} />
            <CategoryCard title="Raw Cotton" vol="5,500+ MT active" price={`$ ${marketData.cotton.price.toFixed(2)}`} />
            <CategoryCard title="White Sugar" vol="12,500+ MT active" price={`$ ${marketData.sugar.price.toFixed(2)}`} />
            <CategoryCard title="Arabica Coffee" vol="800+ MT active" price={`$ ${marketData.coffee.price.toFixed(2)}`} />
          </div>
        </div>
      </section>

      {/* CTA Band */}
      <section className="relative bg-brand-navy overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-[linear-gradient(90deg,transparent,rgba(16,185,129,1),transparent)]" />
        <div className="max-w-[1200px] mx-auto px-6 py-24 text-center">
          <h2 className="font-heading text-[clamp(2rem,4vw,3rem)] font-semibold text-white mb-6">
            Join the next generation of global trade.
          </h2>
          <p className="text-white/50 text-[1rem] max-w-xl mx-auto mb-10">
            Open your corporate account today to access live pricing and verified counterparties across 140+ countries.
          </p>
          <div className="flex justify-center gap-4">
            <button onClick={() => navigate("/register")} className="bg-primary text-white px-8 py-3.5 text-[0.75rem] tracking-[0.1em] uppercase font-bold rounded-[3px] hover:bg-primary/90 transition-colors">
              Request Platform Access
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a101d] text-white pt-16 pb-8">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 border-b border-white/5 pb-16">
            <div className="col-span-1 md:col-span-1">
              <div className="font-cinzel text-lg text-white tracking-[0.08em] leading-none uppercase mb-2">
                <span className="text-[1.3em]">T</span>radox <span className="text-[1.3em]">B2B</span>
              </div>
              <div className="text-[0.55rem] text-primary tracking-[0.25em] uppercase font-bold mb-6">Enterprise Terminal</div>
              <p className="text-[0.75rem] text-white/50 leading-[1.75] max-w-[260px]">
                The premier negotiation terminal for institutional bulk commodities. Verified buyers. Verified sellers. Zero brokerage.
              </p>
            </div>
            <div>
              <h4 className="text-[0.65rem] tracking-[0.2em] uppercase text-white/60 font-bold mb-5">Platform</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-[0.8rem] text-white/75 hover:text-primary transition-colors">Live Board</a></li>
                <li><a href="#" className="text-[0.8rem] text-white/75 hover:text-primary transition-colors">Commodities</a></li>
                <li><a href="#" className="text-[0.8rem] text-white/75 hover:text-primary transition-colors">Market Intel</a></li>
                <li><a href="#" className="text-[0.8rem] text-white/75 hover:text-primary transition-colors">Calculator</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[0.65rem] tracking-[0.2em] uppercase text-white/60 font-bold mb-5">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-[0.8rem] text-white/75 hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="text-[0.8rem] text-white/75 hover:text-primary transition-colors">Global Presence</a></li>
                <li><a href="#" className="text-[0.8rem] text-white/75 hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="text-[0.8rem] text-white/75 hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[0.65rem] tracking-[0.2em] uppercase text-white/60 font-bold mb-5">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-[0.8rem] text-white/75 hover:text-primary transition-colors">Terms of Trade</a></li>
                <li><a href="#" className="text-[0.8rem] text-white/75 hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-[0.8rem] text-white/75 hover:text-primary transition-colors">KYB Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[0.6rem] font-mono tracking-[0.15em] text-white/40 uppercase">
            <p>© 2026 TRADOXB2B PRIVATE LIMITED</p>
            <p>INSTITUTIONAL SECURE NETWORK</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CategoryCard({ title, vol, price }) {
  return (
    <div className="group bg-white rounded-[6px] border border-border p-6 transition-all duration-200 hover:border-primary/40 hover:-translate-y-1 hover:shadow-md cursor-pointer">
      <div className="flex items-center justify-between mb-5">
        <div className="w-10 h-10 rounded-[4px] bg-muted flex items-center justify-center text-brand-navy group-hover:text-primary transition-colors">
          <Package className="w-5 h-5" />
        </div>
        <span className="text-[0.65rem] font-mono font-bold text-primary bg-primary/10 px-2.5 py-1.5 rounded-[3px] tracking-wider">{price}</span>
      </div>
      <h3 className="text-[1.1rem] font-heading font-semibold text-brand-navy mb-1.5">{title}</h3>
      <p className="text-[0.75rem] text-slate-500">{vol}</p>
    </div>
  );
}
