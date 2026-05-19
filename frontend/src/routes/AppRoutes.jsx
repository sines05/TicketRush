import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import { ROLES } from '../constants/roles.js';

// Customer Pages
const Home = lazy(() => import('../pages/Customer/Home.jsx'));
const SearchResults = lazy(() => import('../pages/Customer/SearchResults.jsx'));
const EventDetail = lazy(() => import('../pages/Customer/EventDetail.jsx'));
const MyTickets = lazy(() => import('../pages/Customer/MyTickets.jsx'));
const Membership = lazy(() => import('../pages/Customer/Membership.jsx'));
const Feedback = lazy(() => import('../pages/Customer/Feedback.jsx'));

// Booking Pages
const VirtualQueue = lazy(() => import('../pages/Booking/VirtualQueue.jsx'));
const SeatMap = lazy(() => import('../pages/Booking/SeatMap.jsx'));
const Checkout = lazy(() => import('../pages/Booking/Checkout.jsx'));

// Admin Pages
const Dashboard = lazy(() => import('../pages/Admin/Dashboard.jsx'));
const EventForm = lazy(() => import('../pages/Admin/EventForm.jsx'));
const ZoneMapBuilder = lazy(() => import('../pages/Admin/ZoneMapBuilder.jsx'));
const AdminCheckIn = lazy(() => import('../pages/Admin/CheckIn.jsx'));
const AdminComplaints = lazy(() => import('../pages/Admin/Complaints.jsx'));
const AdminNotifications = lazy(() => import('../pages/Admin/Notifications.jsx'));
const UserManagement = lazy(() => import('../pages/Admin/UserManagement.jsx'));

// Auth Pages
const Login = lazy(() => import('../pages/Auth/Login.jsx'));
const Register = lazy(() => import('../pages/Auth/Register.jsx'));
const ForgotPassword = lazy(() => import('../pages/Auth/ForgotPassword.jsx'));
const OAuthCallback = lazy(() => import('../pages/Auth/OAuthCallback.jsx'));

// Profile Page
const Profile = lazy(() => import('../pages/Profile/Profile.jsx'));

// Loading Fallback
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
    <div className="relative h-12 w-12">
      <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
      <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
    <p className="text-sm font-medium text-muted-foreground animate-pulse">Đang tải...</p>
  </div>
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/events/:slug" element={<EventDetail />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/my-tickets" element={<MyTickets />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/feedback" element={<Feedback />} />
        </Route>

        <Route path="/booking/queue" element={<VirtualQueue />} />
        <Route path="/booking/seats" element={<SeatMap />} />
        <Route path="/booking/checkout" element={<Checkout />} />

        <Route path="/auth/login" element={<Login />} />
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/auth/2fa" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />

        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/check-in" element={<AdminCheckIn />} />
          <Route path="/admin/complaints" element={<AdminComplaints />} />
          <Route path="/admin/events/new" element={<EventForm />} />
          <Route path="/admin/events/:eventId/edit" element={<EventForm />} />
          <Route path="/admin/events/zone-map" element={<ZoneMapBuilder />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
