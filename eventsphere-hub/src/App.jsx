import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/Layout";
import CloudNetworkMonitor from "@/components/CloudNetworkMonitor";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import EventDetail from "./pages/EventDetail";
import Auth from "./pages/Auth";
import MyTickets from "./pages/MyTickets";
import Profile from "./pages/Profile";
import OrganizerDashboard from "./pages/organizer/OrganizerDashboard";
import EventForm from "./pages/organizer/EventForm";
import AttendeeList from "./pages/organizer/AttendeeList";
import AdminDashboard from "./pages/admin/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () =>
<QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/auth" element={<Auth />} />

            <Route path="/tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            <Route path="/organizer" element={<ProtectedRoute requireRole="organizer"><OrganizerDashboard /></ProtectedRoute>} />
            <Route path="/organizer/events/new" element={<ProtectedRoute requireRole="organizer"><EventForm /></ProtectedRoute>} />
            <Route path="/organizer/events/:id/edit" element={<ProtectedRoute requireRole="organizer"><EventForm /></ProtectedRoute>} />
            <Route path="/organizer/events/:id/attendees" element={<ProtectedRoute requireRole="organizer"><AttendeeList /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute requireRole="admin"><AdminDashboard /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
        <CloudNetworkMonitor />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>;


export default App;
