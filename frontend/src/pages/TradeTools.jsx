import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Search, Calculator, ArrowLeft, CheckCircle2, Info } from "lucide-react";

// ─── HSN CODE DATABASE (50+ entries) ─────────────────────────────────────────
const HSN_DATABASE = [
  { code: "1006.10", desc: "Rice in husk (paddy or rough)" },
  { code: "1006.20", desc: "Husked (brown) rice" },
  { code: "1006.30", desc: "Semi-milled or wholly milled rice, whether or not polished or glazed" },
  { code: "1006.40", desc: "Broken rice" },
  { code: "1001.11", desc: "Durum wheat (seed)" },
  { code: "1001.19", desc: "Durum wheat (other)" },
  { code: "1001.91", desc: "Wheat (seed), excluding durum wheat" },
  { code: "1001.99", desc: "Common wheat, meslin (other)" },
  { code: "1002.10", desc: "Rye (seed)" },
  { code: "1002.90", desc: "Rye (other)" },
  { code: "1003.10", desc: "Barley (seed)" },
  { code: "1003.90", desc: "Barley (other)" },
  { code: "1005.10", desc: "Maize/Corn (seed)" },
  { code: "1005.90", desc: "Maize/Corn (other)" },
  { code: "1507.10", desc: "Soybean oil, crude" },
  { code: "1507.90", desc: "Soybean oil, refined" },
  { code: "1511.10", desc: "Palm oil, crude" },
  { code: "1511.90", desc: "Palm oil, refined or fractionated" },
  { code: "1701.12", desc: "Beet sugar, raw, in solid form" },
  { code: "1701.13", desc: "Cane sugar, raw (in solid form)" },
  { code: "1701.99", desc: "Refined sugar and cane/beet sugar (other)" },
  { code: "0901.11", desc: "Coffee, not roasted, not decaffeinated" },
  { code: "0901.12", desc: "Coffee, not roasted, decaffeinated" },
  { code: "0901.21", desc: "Coffee, roasted, not decaffeinated" },
  { code: "0902.10", desc: "Green tea (not fermented)" },
  { code: "0902.30", desc: "Black tea (fermented)" },
  { code: "5201.00", desc: "Cotton, not carded or combed" },
  { code: "5202.10", desc: "Cotton yarn waste" },
  { code: "7201.10", desc: "Non-alloy pig iron" },
  { code: "7204.10", desc: "Waste and scrap of cast iron" },
  { code: "7208.10", desc: "Flat-rolled products of iron or non-alloy steel (hot-rolled, coils)" },
  { code: "7214.20", desc: "Steel bars and rods (hot-rolled, ribbed)" },
  { code: "2601.11", desc: "Iron ores and concentrates, non-agglomerated" },
  { code: "2701.12", desc: "Bituminous coal (not agglomerated)" },
  { code: "2709.00", desc: "Petroleum oils and oils from bituminous minerals, crude" },
  { code: "2711.21", desc: "Natural gas in gaseous state" },
  { code: "7108.12", desc: "Gold (non-monetary) in other semi-manufactured forms" },
  { code: "7106.91", desc: "Silver in semi-manufactured forms" },
  { code: "7403.11", desc: "Refined copper cathodes" },
  { code: "7601.10", desc: "Aluminium, not alloyed (unwrought)" },
  { code: "8001.10", desc: "Tin, not alloyed (unwrought)" },
  { code: "7902.00", desc: "Zinc waste and scrap" },
  { code: "0303.11", desc: "Sockeye salmon, frozen" },
  { code: "0304.71", desc: "Frozen fish fillets - cod" },
  { code: "1208.10", desc: "Soya bean flour and meal" },
  { code: "2302.10", desc: "Bran, sharps and other residues of maize" },
  { code: "1515.30", desc: "Castor oil and its fractions" },
  { code: "3102.10", desc: "Urea (fertilizer grade)" },
  { code: "3105.20", desc: "Mineral or chemical fertilisers (NPK)" },
  { code: "4001.10", desc: "Natural rubber latex" },
  { code: "4401.11", desc: "Fuel wood in logs, not coniferous" },
  { code: "4703.21", desc: "Chemical wood pulp (soda or sulphate)" },
  { code: "2502.00", desc: "Unroasted iron pyrites" },
  { code: "2504.10", desc: "Natural graphite in powder or flakes" },
  { code: "2606.00", desc: "Aluminium ores and concentrates" },
];

// ─── DUTY RATE TABLE ──────────────────────────────────────────────────────────
const DUTY_RATES = {
  // Destination country -> { basicDuty, vat/gst, cess }
  UAE: { basicDuty: 5, vat: 5, cess: 0, label: "UAE (5% duty + 5% VAT)" },
  India: { basicDuty: 7.5, vat: 18, cess: 0, label: "India (7.5% BCD + 18% GST)" },
  "Saudi Arabia": { basicDuty: 5, vat: 15, cess: 0, label: "Saudi Arabia (5% + 15% VAT)" },
  USA: { basicDuty: 3.5, vat: 0, cess: 0, label: "USA (3.5% avg tariff, no VAT)" },
  UK: { basicDuty: 4, vat: 20, cess: 0, label: "UK (4% duty + 20% VAT)" },
  EU: { basicDuty: 6.5, vat: 21, cess: 0, label: "EU (6.5% + 21% VAT avg)" },
  China: { basicDuty: 8, vat: 13, cess: 0, label: "China (8% + 13% VAT)" },
  Singapore: { basicDuty: 0, vat: 9, cess: 0, label: "Singapore (0% duty + 9% GST)" },
  Other: { basicDuty: 5, vat: 10, cess: 0, label: "Other (5% duty + 10% est. tax)" },
};

export default function TradeTools() {
  const navigate = useNavigate();

  // ── HSN Finder State ───────────────────────────────────────────
  const [hsnQuery, setHsnQuery] = useState("");
  const [hsnResults, setHsnResults] = useState([]);
  const [hsnSearched, setHsnSearched] = useState(false);

  // ── Duty Calculator State ──────────────────────────────────────
  const [dutyHsn, setDutyHsn] = useState("");
  const [dutyValue, setDutyValue] = useState("");
  const [dutyOrigin, setDutyOrigin] = useState("India");
  const [dutyDest, setDutyDest] = useState("UAE");
  const [dutyResult, setDutyResult] = useState(null);
  const [dutyError, setDutyError] = useState("");

  // ─── HSN SEARCH ─────────────────────────────────────────────────
  const handleHsnSearch = (e) => {
    e.preventDefault();
    const q = hsnQuery.trim().toLowerCase();
    setHsnSearched(true);
    if (!q) {
      setHsnResults([...HSN_DATABASE].slice(0, 10));
      return;
    }
    const results = HSN_DATABASE.filter(
      (item) =>
        item.desc.toLowerCase().includes(q) ||
        item.code.includes(q)
    );
    setHsnResults(results);
  };

  // ─── DUTY CALCULATE ─────────────────────────────────────────────
  const handleCalculate = (e) => {
    e.preventDefault();
    setDutyError("");
    const val = parseFloat(dutyValue);
    if (!val || val <= 0) {
      setDutyError("Please enter a valid cargo value in USD.");
      return;
    }
    const rates = DUTY_RATES[dutyDest] || DUTY_RATES["Other"];
    const basicDutyAmt = (val * rates.basicDuty) / 100;
    const assessableVal = val + basicDutyAmt;
    const vatAmt = (assessableVal * rates.vat) / 100;
    const totalTax = basicDutyAmt + vatAmt;
    const landedCost = val + totalTax;

    setDutyResult({
      label: rates.label,
      cargoValue: val,
      basicDutyPct: rates.basicDuty,
      basicDutyAmt,
      vatPct: rates.vat,
      vatAmt,
      totalTax,
      landedCost,
    });
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 font-sans">
      <div className="max-w-5xl mx-auto w-full">
        {/* Back Button + Title */}
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-slate-900">Trade Utility Tools</h1>
            <p className="text-xs text-slate-500">Practical tools for international trade calculations</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

          {/* ══════════════════════════════════════ */}
          {/* HSN CODE FINDER                        */}
          {/* ══════════════════════════════════════ */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Search className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">HSN Code Finder</h2>
                  <p className="text-xs text-slate-500">Search 50+ commodity codes</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <form onSubmit={handleHsnSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search commodity (e.g. Rice, Gold, Cotton)"
                  value={hsnQuery}
                  onChange={(e) => setHsnQuery(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 focus:border-blue-500 h-10 px-3 text-sm rounded-lg outline-none transition-all"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 h-10 text-sm rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" /> Search
                </button>
              </form>

              {/* Results */}
              {hsnSearched && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  {hsnResults.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500">
                      No results found for "{hsnQuery}". Try a broader search term.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                      {hsnResults.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => setDutyHsn(item.code)}
                          title="Click to use in Duty Calculator"
                        >
                          <span className="text-sm text-slate-700 flex-1 pr-3">{item.desc}</span>
                          <div className="text-right shrink-0">
                            <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                              {item.code}
                            </span>
                            <div className="text-[0.6rem] text-slate-400 mt-0.5">Click to use →</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="bg-slate-50 px-4 py-2 border-t border-slate-200">
                    <span className="text-[0.65rem] text-slate-400">{hsnResults.length} result(s) found</span>
                  </div>
                </div>
              )}

              {!hsnSearched && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex gap-2.5">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-800 space-y-1">
                      <p className="font-semibold">How to use:</p>
                      <p>Type a commodity name like "Rice", "Gold", "Cotton" or "Coal" and click Search.</p>
                      <p>Click any result to auto-fill it in the Duty Calculator →</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════ */}
          {/* IMPORT DUTY CALCULATOR                 */}
          {/* ══════════════════════════════════════ */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Import Duty Calculator</h2>
                  <p className="text-xs text-slate-500">Calculate total landed cost with taxes</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <form onSubmit={handleCalculate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">HSN Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 1006.30"
                      value={dutyHsn}
                      onChange={(e) => setDutyHsn(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 h-10 px-3 text-sm rounded-lg outline-none font-mono transition-all"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cargo Value (USD) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 50000"
                      value={dutyValue}
                      onChange={(e) => setDutyValue(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 h-10 px-3 text-sm rounded-lg outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Origin Country</label>
                    <select
                      value={dutyOrigin}
                      onChange={(e) => setDutyOrigin(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 h-10 px-3 text-sm rounded-lg outline-none"
                    >
                      {Object.keys(DUTY_RATES).map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Destination Country *</label>
                    <select
                      value={dutyDest}
                      onChange={(e) => setDutyDest(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 h-10 px-3 text-sm rounded-lg outline-none"
                    >
                      {Object.keys(DUTY_RATES).map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {dutyError && (
                  <p className="text-xs text-rose-600 font-medium">{dutyError}</p>
                )}

                <button
                  type="submit"
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Calculator className="w-4 h-4" /> Calculate Import Duty
                </button>
              </form>

              {/* Results */}
              {dutyResult && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 overflow-hidden">
                  <div className="px-4 py-3 bg-emerald-600 text-white">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-bold">Duty Calculation Result</span>
                    </div>
                    <p className="text-[0.65rem] text-emerald-100 mt-0.5">{dutyResult.label}</p>
                  </div>
                  <div className="divide-y divide-emerald-100 text-sm">
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-slate-600">Cargo Value (CIF)</span>
                      <span className="font-mono font-semibold">{fmt(dutyResult.cargoValue)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-slate-600">Basic Import Duty ({dutyResult.basicDutyPct}%)</span>
                      <span className="font-mono font-semibold text-amber-700">+{fmt(dutyResult.basicDutyAmt)}</span>
                    </div>
                    {dutyResult.vatPct > 0 && (
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-600">VAT / GST ({dutyResult.vatPct}%)</span>
                        <span className="font-mono font-semibold text-amber-700">+{fmt(dutyResult.vatAmt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between px-4 py-2.5 bg-amber-50">
                      <span className="font-bold text-slate-800">Total Taxes & Duties</span>
                      <span className="font-mono font-bold text-amber-800">{fmt(dutyResult.totalTax)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3 bg-emerald-100">
                      <span className="font-bold text-emerald-900 text-base">Estimated Landed Cost</span>
                      <span className="font-mono font-bold text-emerald-900 text-base">{fmt(dutyResult.landedCost)}</span>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                    <p className="text-[0.6rem] text-slate-400">*Estimates based on standard duty rates. Always verify with your customs broker for exact figures.</p>
                  </div>
                </div>
              )}

              {!dutyResult && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex gap-2.5">
                    <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-500 space-y-1">
                      <p className="font-semibold">Supported Routes:</p>
                      <p>UAE (5%), India (7.5%), Saudi Arabia (5%), USA (3.5%), UK (4%), EU (6.5%), China (8%), Singapore (0%)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Bottom Banner */}
        <div className="mt-8 bg-slate-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base mb-1">Need expert trade guidance?</h3>
            <p className="text-xs text-slate-400">Our verified trade consultants can help with HS classification, duty drawbacks, and freight optimization.</p>
          </div>
          <button
            onClick={() => navigate("/inbox")}
            className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            Contact Support →
          </button>
        </div>
      </div>
    </div>
  );
}
