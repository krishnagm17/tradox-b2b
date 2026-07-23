import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Login from "./pages/Login";
import LiveBoard from "./pages/LiveBoard";
import KybWizard from "./pages/KybWizard";
import DealTracker from "./pages/DealTracker";
import TradeTools from "./pages/TradeTools";
import CompanyDashboard from "./pages/CompanyDashboard";
import NegotiationRoom from "./pages/NegotiationRoom";
import Inbox from "./pages/Inbox";
import AdminKyb from "./pages/AdminKyb";

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/live-board" element={<LiveBoard />} />
          <Route path="/onboarding/kyb" element={<KybWizard />} />
          <Route path="/deals/:id" element={<DealTracker />} />
          <Route path="/trade-tools" element={<TradeTools />} />
          <Route path="/dashboard" element={<CompanyDashboard />} />
          <Route path="/negotiation/:room_id" element={<NegotiationRoom />} />
          <Route path="/inbox" element={<Inbox />} />
          {/* Admin Routes */}
          <Route path="/admin/kyb" element={<AdminKyb />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
