import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import { ROLES } from '../constants/roles.js';

import Home from '../pages/Customer/Home.jsx';
import EventDetail from '../pages/Customer/EventDetail.jsx';
import MyTickets from '../pages/Customer/MyTickets.jsx';

import VirtualQueue from '../pages/Booking/VirtualQueue.jsx';
import SeatMap from '../pages/Booking/SeatMap.jsx';
import Checkout from '../pages/Booking/Checkout.jsx';

import Dashboard from '../pages/Admin/Dashboard.jsx';
import EventForm from '../pages/Admin/EventForm.jsx';
import AdminCheckIn from '../pages/Admin/CheckIn.jsx';

import Login from '../pages/Auth/Login.jsx';
import Register from '../pages/Auth/Register.jsx';
import ForgotPassword from '../pages/Auth/ForgotPassword.jsx';

import Profile from '../pages/Profile/Profile.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/events/:slug" element={<EventDetail />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="/booking/queue" element={<VirtualQueue />} />
      <Route path="/booking/seats" element={<SeatMap />} />
      <Route path="/booking/checkout" element={<Checkout />} />

      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/register" element={<Register />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />

      <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/check-in" element={<AdminCheckIn />} />
        <Route path="/admin/events/new" element={<EventForm />} />
        <Route path="/admin/events/:eventId/edit" element={<EventForm />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
