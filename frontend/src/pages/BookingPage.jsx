import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '../hooks/useWebSocket';
import { CheckCircle, Lock, CreditCard, Timer } from 'lucide-react';

const BookingPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('selecting'); // selecting, locking, locked, paid
  const [timeLeft, setTimeLeft] = useState(null);

  const { data: seatMap, isLoading, refetch } = useQuery({
    queryKey: ['seat-map', eventId],
    queryFn: async () => {
      return await api.get(`/events/${eventId}/seat-map`);
    },
  });

  const { lastMessage } = useWebSocket(`ws://localhost:8081/ws`);

  useEffect(() => {
    if (lastMessage && (lastMessage.type === 'SEAT_LOCKED' || lastMessage.type === 'SEAT_SOLD' || lastMessage.type === 'SEAT_AVAILABLE' || lastMessage.type === 'ORDER_EXPIRED')) {
      refetch();
    }
  }, [lastMessage, refetch]);

  // Countdown timer logic
  useEffect(() => {
    if (!order?.expires_at || status !== 'locked') return;

    const expiryTime = new Date(order.expires_at).getTime();
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = expiryTime - now;
      
      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft('EXPIRED');
        setStatus('selecting');
        setOrder(null);
        setSelectedSeats([]);
        alert('Đơn hàng đã hết hạn. Vui lòng chọn lại ghế.');
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [order, status]);

  const toggleSeat = (seatId, seatStatus) => {
    if (seatStatus !== 'AVAILABLE') return;
    setSelectedSeats(prev =>
      prev.includes(seatId) ? prev.filter(id => id !== seatId) : [...prev, seatId]
    );
  };

  const handleLockSeats = async () => {
    setStatus('locking');
    try {
      const data = await api.post('/orders/lock-seats', {
        event_id: eventId,
        seat_ids: selectedSeats
      });
      setOrder(data);
      setStatus('locked');
    } catch (err) {
      alert(err.message || 'Failed to lock seats');
      setStatus('selecting');
    }
  };

  const handleCheckout = async () => {
    try {
      await api.post('/orders/checkout', { order_id: order.order_id });
      setStatus('paid');
      setTimeout(() => navigate('/tickets/my-tickets'), 2000);
    } catch (err) {
      alert(err.message || 'Payment failed');
    }
  };

  if (isLoading) return <div className="text-center py-20">Loading seat map...</div>;

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left: Seat Map */}
      <div className="lg:col-span-2 space-y-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold mb-6">Select Your Seats</h2>

          {/* Legend */}
          <div className="flex flex-wrap gap-6 mb-8 text-sm font-medium">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
              <span>Locked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
              <span>Sold</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-indigo-600 rounded-sm"></div>
              <span>Selected</span>
            </div>
          </div>

          {/* Zones */}
          <div className="space-y-12">
            {seatMap?.zones?.map(zone => (
              <div key={zone.zone_id} className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <h3 className="text-lg font-bold text-gray-700">{zone.name}</h3>
                  <span className="text-sm font-bold text-indigo-600">${zone.price}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {zone.seats?.map(seat => {
                    const isSelected = selectedSeats.includes(seat.seat_id);
                    const color = isSelected
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 ring-2 ring-offset-1 ring-indigo-400'
                      : seat.status === 'AVAILABLE' ? 'bg-green-500 text-white hover:bg-green-600'
                      : seat.status === 'LOCKED' ? 'bg-yellow-400 text-white'
                      : 'bg-red-500 text-white';

                    return (
                      <button
                        key={seat.seat_id}
                        disabled={seat.status !== 'AVAILABLE' || status !== 'selecting'}
                        onClick={() => toggleSeat(seat.seat_id, seat.status)}
                        className={`w-10 h-10 rounded-lg text-[10px] font-bold transition-all ${color} ${seat.status !== 'AVAILABLE' ? 'cursor-not-allowed opacity-40' : 'hover:scale-110 active:scale-95'}`}
                        title={`${seat.row_label}${seat.seat_number}`}
                      >
                        {seat.row_label}{seat.seat_number}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Order Summary */}
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-24">
          <h3 className="text-xl font-bold mb-6">Order Summary</h3>

          {selectedSeats.length === 0 ? (
            <div className="text-center py-12 text-gray-400 italic">
              No seats selected yet.
            </div>
          ) : (
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span>Seats Selected:</span>
                <span className="font-bold">{selectedSeats.length}</span>
              </div>
              <div className="border-t border-gray-100 pt-4 flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span className="text-indigo-600">
                  ${order?.total_amount || '...'}
                </span>
              </div>
            </div>
          )}

          {status === 'selecting' && (
            <button
              disabled={selectedSeats.length === 0}
              onClick={handleLockSeats}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock size={20} />
              Lock Seats
            </button>
          )}

          {(status === 'locking' || (status === 'locked' && !timeLeft)) && (
            <div className="text-center py-4 text-indigo-600 font-medium animate-pulse">
              Processing...
            </div>
          )}

          {status === 'locked' && timeLeft && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-sm flex items-center gap-3">
                <Timer size={20} className="animate-pulse" />
                <div>
                  <div className="font-bold text-lg">{timeLeft}</div>
                  <div>Time remaining to checkout</div>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2"
              >
                <CreditCard size={20} />
                Checkout Now
              </button>
            </div>
          )}

          {status === 'paid' && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <CheckCircle size={48} className="text-green-500" />
              </div>
              <h4 className="text-xl font-bold text-gray-800">Success!</h4>
              <p className="text-gray-500 mb-6">Redirecting to your tickets...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
