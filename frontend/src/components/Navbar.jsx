import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Ticket, User, LogOut, LayoutDashboard } from 'lucide-react';

const Navbar = () => {
  const { token, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <Link to="/" className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
        <Ticket size={24} />
        <span>TicketRush</span>
      </Link>

      <div className="flex items-center gap-6">
        <Link to="/" className="text-gray-600 hover:text-indigo-600 font-medium">Events</Link>

        {token ? (
          <>
            {user?.role === 'ADMIN' && (
              <Link to="/admin" className="flex items-center gap-1 text-gray-600 hover:text-indigo-600 font-medium">
                <LayoutDashboard size={18} />
                <span>Admin</span>
              </Link>
            )}
            <Link to="/tickets/my-tickets" className="flex items-center gap-1 text-gray-600 hover:text-indigo-600 font-medium">
              <Ticket size={18} />
              <span>My Tickets</span>
            </Link>
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-200">
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <User size={18} />
                <span>{user?.fullName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-gray-600 hover:text-indigo-600 font-medium">Login</Link>
            <Link
              to="/register"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
