import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthContext";
import Header from "@/components/layout/Header";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Header />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              {/* Placeholder routes for future implementation */}
              <Route path="/about" element={<div className="container py-20 text-center"><h1 className="text-4xl font-bold">About Us</h1><p className="mt-4">Coming soon...</p></div>} />
              <Route path="/contact" element={<div className="container py-20 text-center"><h1 className="text-4xl font-bold">Contact</h1><p className="mt-4">Coming soon...</p></div>} />
              <Route path="/wallet" element={<div className="container py-20 text-center"><h1 className="text-4xl font-bold">Wallet</h1><p className="mt-4">Coming soon...</p></div>} />
              <Route path="/settings" element={<div className="container py-20 text-center"><h1 className="text-4xl font-bold">Settings</h1><p className="mt-4">Coming soon...</p></div>} />
              <Route path="/analytics" element={<div className="container py-20 text-center"><h1 className="text-4xl font-bold">Analytics</h1><p className="mt-4">Coming soon...</p></div>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
