import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import NewOrder from "./pages/NewOrder";
import OrderProtocolAcceptance from "./pages/OrderProtocolAcceptance";
import OrderProtocolHandover from "./pages/OrderProtocolHandover";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import Invoicing from "./pages/Invoicing";
import PublicOrderStatus from "./pages/PublicOrderStatus";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public route - no auth required */}
            <Route path="/status/:id" element={<PublicOrderStatus />} />
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/zakazky" element={
              <ProtectedRoute><Orders /></ProtectedRoute>
            } />
            <Route path="/zakazky/nova" element={
              <ProtectedRoute><NewOrder /></ProtectedRoute>
            } />
            <Route path="/zakazky/:id" element={
              <ProtectedRoute><OrderDetail /></ProtectedRoute>
            } />
            <Route path="/zakazky/:id/protokol/prijimaci" element={
              <ProtectedRoute><OrderProtocolAcceptance /></ProtectedRoute>
            } />
            <Route path="/zakazky/:id/protokol/odovzdavaci" element={
              <ProtectedRoute><OrderProtocolHandover /></ProtectedRoute>
            } />
            <Route path="/sklad" element={
              <ProtectedRoute><Inventory /></ProtectedRoute>
            } />
            <Route path="/zakaznici" element={
              <AdminRoute><Customers /></AdminRoute>
            } />
            <Route path="/reporty" element={
              <AdminRoute><Reports /></AdminRoute>
            } />
            <Route path="/fakturacia" element={
              <AdminRoute><Invoicing /></AdminRoute>
            } />
            <Route path="/nastavenia" element={
              <AdminRoute><Settings /></AdminRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
