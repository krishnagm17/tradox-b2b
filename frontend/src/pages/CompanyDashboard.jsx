import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Package, FileText, X, Loader2, ArrowRight, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { onAuthStateChanged } from "firebase/auth";
import Sidebar from "../components/Sidebar";
import { Button } from "../components/ui/Button";
import { auth } from "../config/firebase";
import { API_BASE } from "../utils/api";

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState([]);
  const [products, setProducts] = useState([]);
  const [showRfqModal, setShowRfqModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kybStatus, setKybStatus] = useState(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState("sales"); // 'sales' or 'purchases'

  // Forms State
  const [rfqForm, setRfqForm] = useState({
    product: "", category: "Agriculture", quantity: "", unit: "MT",
    destinationCountry: "", deliveryDate: "", targetPrice: "", description: ""
  });
  const [productForm, setProductForm] = useState({
    name: "", category: "Agriculture", quantity: "", unit: "MT",
    price: "", currency: "USD", moq: "", country: "", deliveryTerms: "FOB", description: ""
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        fetchDashboardData(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchDashboardData = async (currentUser) => {
    setLoading(true);
    try {
      const activeUser = currentUser || auth.currentUser;
      const token = await activeUser?.getIdToken();
      if (!token) return;

      const rfqRes = await fetch(`${API_BASE}/api/rfqs/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (rfqRes.ok) {
        setRfqs(await rfqRes.json());
      }

      const prodRes = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/products/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (prodRes.ok) {
        setProducts(await prodRes.json());
      }

      const userRes = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/users/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setKybStatus(userData.kybStatus || userData.company?.kybStatus || "PENDING");
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRFQ = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Creating RFQ...");
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/rfqs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...rfqForm,
          quantity: parseFloat(rfqForm.quantity),
          targetPrice: rfqForm.targetPrice ? parseFloat(rfqForm.targetPrice) : null
        })
      });
      if (res.ok) {
        const newRfq = await res.json();
        setRfqs([newRfq, ...rfqs]);
        setShowRfqModal(false);
        setRfqForm({product: "", category: "Agriculture", quantity: "", unit: "MT", destinationCountry: "", deliveryDate: "", targetPrice: "", description: ""});
        toast.success("RFQ created successfully!", { id: toastId });
      } else {
        toast.error("Failed to create RFQ. Please try again.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while creating the RFQ.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Listing product...");
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...productForm,
          quantity: parseFloat(productForm.quantity),
          price: parseFloat(productForm.price),
          moq: parseFloat(productForm.moq)
        })
      });
      if (res.ok) {
        const newProduct = await res.json();
        setProducts([newProduct, ...products]);
        setShowProductModal(false);
        setProductForm({name: "", category: "Agriculture", quantity: "", unit: "MT", price: "", currency: "USD", moq: "", country: "", deliveryTerms: "FOB", description: ""});
        toast.success("Product listed successfully!", { id: toastId });
      } else {
        toast.error("Failed to list product.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while listing the product.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted text-foreground font-sans selection:bg-primary/30 flex">
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header / Search */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center text-muted-foreground bg-muted px-3 sm:px-4 py-2 rounded-md w-full max-w-xs sm:w-96 border border-border focus-within:border-primary transition-colors">
            <Search className="w-4 h-4 mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Search products, RFQs..." 
              className="bg-transparent border-none outline-none text-xs sm:text-sm w-full text-foreground placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-brand-navy flex items-center justify-center text-white font-semibold text-sm">
              JD
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12">
          <div className="max-w-[1200px] mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <h1 className="text-3xl font-heading font-semibold tracking-tight text-brand-navy mb-2">
                  Company Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  Unified workspace for your company. Manage both your sales and purchases in one place.
                </p>
              </div>
            </div>

            {kybStatus !== "VERIFIED" && kybStatus !== null && (
              <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-amber-800">KYB Verification Required</h4>
                    <p className="text-sm text-amber-700/80 mt-0.5">Only verified users can post new Products or request Quotes (RFQs). Please complete verification.</p>
                  </div>
                </div>
                <Button onClick={() => navigate("/onboarding/kyb")} className="bg-amber-600 text-white hover:bg-amber-700 border-0 shadow-sm shrink-0">
                  Verify Business
                </Button>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-border mb-8">
              <button 
                className={`px-8 py-3 text-[0.65rem] tracking-[0.1em] font-semibold uppercase transition-colors border-b-2 ${activeTab === 'sales' ? 'border-primary text-primary bg-white rounded-t-[3px]' : 'border-transparent text-slate-500 hover:text-brand-navy'}`}
                onClick={() => setActiveTab('sales')}
              >
                My Products (Sales)
              </button>
              <button 
                className={`px-8 py-3 text-[0.65rem] tracking-[0.1em] font-semibold uppercase transition-colors border-b-2 ${activeTab === 'purchases' ? 'border-primary text-primary bg-white rounded-t-[3px]' : 'border-transparent text-slate-500 hover:text-brand-navy'}`}
                onClick={() => setActiveTab('purchases')}
              >
                My RFQs (Purchases)
              </button>
            </div>

            {/* Sales Content */}
            {activeTab === 'sales' && (
              <div className="animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-heading font-semibold text-brand-navy">Active Listings</h2>
                  <Button 
                    onClick={() => setShowProductModal(true)}
                    disabled={kybStatus !== "VERIFIED"}
                    title={kybStatus !== "VERIFIED" ? "Verification required" : ""}
                    className="h-10 px-6 text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {loading ? (
                    // Skeleton Loaders
                    [1, 2, 3].map(i => (
                      <div key={i} className="border border-border bg-white p-6 rounded-xl shadow-sm animate-pulse">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-2/3">
                            <div className="h-5 bg-slate-200 rounded w-full mb-2"></div>
                            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                          </div>
                          <div className="h-5 w-16 bg-slate-100 rounded"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-100 pt-4">
                          <div className="h-8 bg-slate-100 rounded"></div>
                          <div className="h-8 bg-slate-100 rounded"></div>
                        </div>
                      </div>
                    ))
                  ) : products.length === 0 ? (
                    // Beautiful Empty State
                    <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 bg-white rounded-2xl flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Package className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-heading font-semibold text-brand-navy mb-2">No active products</h3>
                      <p className="text-sm text-slate-500 mb-6 max-w-sm">
                        You haven't listed any products yet. Add your first product to start receiving inquiries from verified buyers.
                      </p>
                      <Button onClick={() => setShowProductModal(true)} className="flex items-center">
                        <Plus className="w-4 h-4 mr-2" />
                        List First Product
                      </Button>
                    </div>
                  ) : (
                    products.map(prod => (
                      <div key={prod.id} className="border border-border bg-white p-6 rounded-xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-heading font-semibold text-lg text-brand-navy group-hover:text-primary transition-colors">{prod.name}</h3>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              {prod.category} <span className="w-1 h-1 rounded-full bg-slate-300"></span> {prod.country}
                            </p>
                          </div>
                          <span className="text-[0.65rem] font-mono px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-md uppercase tracking-wider font-semibold shadow-sm">{prod.status || "ACTIVE"}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mt-6 border-t border-slate-100 pt-4">
                          <div>
                            <div className="text-[0.65rem] font-mono text-slate-400 uppercase tracking-wider mb-1">Price</div>
                            <div className="font-semibold text-brand-navy">{prod.price} {prod.currency}/{prod.unit}</div>
                          </div>
                          <div>
                            <div className="text-[0.65rem] font-mono text-slate-400 uppercase tracking-wider mb-1">Volume</div>
                            <div className="font-semibold text-brand-navy">{prod.quantity} {prod.unit}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Purchases Content */}
            {activeTab === 'purchases' && (
              <div className="animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-heading font-semibold text-brand-navy">Active Requests</h2>
                  <Button 
                    onClick={() => setShowRfqModal(true)}
                    disabled={kybStatus !== "VERIFIED"}
                    title={kybStatus !== "VERIFIED" ? "Verification required" : ""}
                    className="h-10 px-6 text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Post RFQ
                  </Button>
                </div>
                
                <div className="w-full overflow-hidden border border-border rounded-[3px] bg-white shadow-sm">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="border-b border-border bg-slate-50">
                        <th className="py-4 px-6 text-[0.65rem] font-mono tracking-widest text-slate-500 uppercase font-semibold w-1/4">Product Needed</th>
                        <th className="py-4 px-6 text-[0.65rem] font-mono tracking-widest text-slate-500 uppercase font-semibold text-right">Quantity</th>
                        <th className="py-4 px-6 text-[0.65rem] font-mono tracking-widest text-slate-500 uppercase font-semibold">Destination</th>
                        <th className="py-4 px-6 text-[0.65rem] font-mono tracking-widest text-slate-500 uppercase font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        [1, 2, 3].map(i => (
                          <tr key={i} className="border-b border-slate-100 animate-pulse">
                            <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div><div className="h-3 bg-slate-100 rounded w-1/2"></div></td>
                            <td className="py-4 px-6 text-right"><div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div></td>
                            <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                            <td className="py-4 px-6 text-center"><div className="h-6 bg-slate-200 rounded w-20 mx-auto"></div></td>
                          </tr>
                        ))
                      ) : rfqs.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-24 text-center border-2 border-dashed border-slate-200 bg-white">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <FileText className="w-8 h-8 text-blue-500" />
                            </div>
                            <h3 className="text-xl font-heading font-semibold text-brand-navy mb-2">No active requests</h3>
                            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                              You haven't posted any RFQs. Create a buy request to get quotes from verified suppliers globally.
                            </p>
                            <Button onClick={() => setShowRfqModal(true)} className="flex items-center mx-auto">
                              <Plus className="w-4 h-4 mr-2" />
                              Post First RFQ
                            </Button>
                          </td>
                        </tr>
                      ) : (
                        rfqs.map(rfq => (
                          <tr key={rfq.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group cursor-pointer">
                            <td className="py-4 px-6">
                              <div className="text-sm font-semibold text-brand-navy group-hover:text-primary transition-colors">{rfq.product}</div>
                              <div className="text-xs text-slate-500 mt-1">{rfq.category}</div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="text-sm font-medium text-brand-navy">{rfq.quantity} {rfq.unit}</div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-sm text-slate-600">{rfq.destinationCountry}</div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-amber-50 border border-amber-100 text-amber-600 text-[0.65rem] font-mono uppercase tracking-wider font-semibold shadow-sm">
                                 {rfq.status || "PENDING"}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* RFQ Modal */}
      {showRfqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-border rounded-xl w-full max-w-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowRfqModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-brand-navy transition-colors bg-slate-100 p-2 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button>
            <div className="p-4 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-heading font-semibold text-brand-navy mb-6">Request for Quote (Buy)</h2>
              <form onSubmit={handleCreateRFQ} className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-[0.7rem] font-semibold text-brand-navy uppercase tracking-wider mb-2">Product Name *</label>
                    <input type="text" required className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 px-3 text-sm rounded-lg outline-none transition-all shadow-sm" value={rfqForm.product} onChange={e => setRfqForm({...rfqForm, product: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[0.7rem] font-semibold text-brand-navy uppercase tracking-wider mb-2">Category</label>
                    <input type="text" required className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 px-3 text-sm rounded-lg outline-none transition-all shadow-sm" value={rfqForm.category} onChange={e => setRfqForm({...rfqForm, category: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[0.7rem] font-semibold text-brand-navy uppercase tracking-wider mb-2">Quantity *</label>
                    <input type="number" required className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 px-3 text-sm rounded-lg outline-none transition-all shadow-sm" value={rfqForm.quantity} onChange={e => setRfqForm({...rfqForm, quantity: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[0.7rem] font-semibold text-brand-navy uppercase tracking-wider mb-2">Unit</label>
                    <select className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 px-3 text-sm rounded-lg outline-none transition-all shadow-sm" value={rfqForm.unit} onChange={e => setRfqForm({...rfqForm, unit: e.target.value})}>
                      <option value="MT">MT</option>
                      <option value="KG">KG</option>
                      <option value="Tons">Tons</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[0.7rem] font-semibold text-brand-navy uppercase tracking-wider mb-2">Destination Country *</label>
                    <input type="text" required className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 px-3 text-sm rounded-lg outline-none transition-all shadow-sm" value={rfqForm.destinationCountry} onChange={e => setRfqForm({...rfqForm, destinationCountry: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[0.7rem] font-semibold text-brand-navy uppercase tracking-wider mb-2">Delivery Date</label>
                    <input type="text" required className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 px-3 text-sm rounded-lg outline-none transition-all shadow-sm" value={rfqForm.deliveryDate} onChange={e => setRfqForm({...rfqForm, deliveryDate: e.target.value})} />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-12 mt-4 text-sm font-semibold flex items-center justify-center">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {loading ? 'Posting RFQ...' : 'Post RFQ'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-border rounded-xl w-full max-w-2xl shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowProductModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-brand-navy transition-colors bg-slate-100 p-2 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button>
            <div className="p-4 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-heading font-semibold text-brand-navy mb-6">Add Product (Sell)</h2>
              <form onSubmit={handleCreateProduct} className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-[0.7rem] font-semibold text-brand-navy uppercase tracking-wider mb-2">Product Name *</label>
                    <input type="text" required className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 px-3 text-sm rounded-lg outline-none transition-all shadow-sm" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[0.7rem] font-semibold text-brand-navy uppercase tracking-wider mb-2">Category</label>
                    <input type="text" required className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 px-3 text-sm rounded-lg outline-none transition-all shadow-sm" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[0.7rem] font-semibold text-brand-navy uppercase tracking-wider mb-2">Price *</label>
                    <input type="number" required className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 px-3 text-sm rounded-lg outline-none transition-all shadow-sm" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[0.7rem] font-semibold text-brand-navy uppercase tracking-wider mb-2">Currency</label>
                    <input type="text" className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 px-3 text-sm rounded-lg outline-none transition-all shadow-sm" value={productForm.currency} onChange={e => setProductForm({...productForm, currency: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[0.7rem] font-semibold text-brand-navy uppercase tracking-wider mb-2">Available Quantity *</label>
                    <input type="number" required className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 px-3 text-sm rounded-lg outline-none transition-all shadow-sm" value={productForm.quantity} onChange={e => setProductForm({...productForm, quantity: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[0.7rem] font-semibold text-brand-navy uppercase tracking-wider mb-2">Unit</label>
                    <select className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 px-3 text-sm rounded-lg outline-none transition-all shadow-sm" value={productForm.unit} onChange={e => setProductForm({...productForm, unit: e.target.value})}>
                      <option value="MT">MT</option>
                      <option value="KG">KG</option>
                      <option value="Tons">Tons</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[0.7rem] font-semibold text-brand-navy uppercase tracking-wider mb-2">Origin Country *</label>
                    <input type="text" required className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 px-3 text-sm rounded-lg outline-none transition-all shadow-sm" value={productForm.country} onChange={e => setProductForm({...productForm, country: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[0.7rem] font-semibold text-brand-navy uppercase tracking-wider mb-2">Minimum Order Qty (MOQ) *</label>
                    <input type="number" required className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 px-3 text-sm rounded-lg outline-none transition-all shadow-sm" value={productForm.moq} onChange={e => setProductForm({...productForm, moq: e.target.value})} />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-12 mt-4 text-sm font-semibold flex items-center justify-center">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {loading ? 'Listing Product...' : 'List Product'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
