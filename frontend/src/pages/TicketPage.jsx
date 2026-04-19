import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useQuery } from '@tanstack/react-query';
import { Ticket, Download, ArrowLeft, RefreshCw } from 'lucide-react';

const TicketPage = () => {
  const navigate = useNavigate();

  const { data: tickets, isLoading, error, refetch } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      return await api.get('/tickets/my-tickets');
    },
  });

  if (isLoading) return <div className="text-center py-20">Loading your tickets...</div>;
  if (error) return <div className="text-center py-20 text-red-500">Error: {error.message}</div>;

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-12">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Events</span>
        </button>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors text-sm font-bold"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold mb-2">My Tickets</h1>
          <p className="text-gray-500">All your active tickets in one place.</p>
        </div>

        {(!tickets || tickets.length === 0) ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Ticket size={64} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">Bạn chưa có vé nào.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 text-indigo-600 font-bold hover:underline"
            >
              Browse Events
            </button>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.ticket_id} className="bg-white border-2 border-dashed border-gray-200 rounded-3xl overflow-hidden shadow-sm flex flex-col sm:row relative">
              <div className="p-8 flex-1 bg-white">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-1">Event</div>
                    <div className="text-xl font-bold text-gray-800">{ticket.event_title || 'TicketRush Event'}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${ticket.is_checked_in ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {ticket.is_checked_in ? 'Used' : 'Confirmed'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-1">Seat</div>
                    <div className="text-2xl font-black text-gray-800">{ticket.seat_label}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-1">Zone</div>
                    <div className="text-lg font-medium text-gray-700">{ticket.zone_name}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-400 text-xs truncate">
                  <Ticket size={14} />
                  <span>Token: {ticket.qr_code_token}</span>
                </div>
              </div>

              <div className="bg-gray-50 p-8 flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l-2 border-dashed border-gray-200 min-w-[200px]">
                <div className="bg-white p-3 shadow-sm border border-gray-100 rounded-xl mb-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticket.qr_code_token}`}
                    alt="QR Code"
                    className="w-32 h-32"
                  />
                </div>
                <button
                  className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  onClick={() => window.print()}
                >
                  <Download size={16} />
                  Print Ticket
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TicketPage;
