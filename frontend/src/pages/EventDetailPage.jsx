import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      return await api.get(`/events/${id}`);
    },
  });

  const handleBookNow = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const res = await api.post('/queue/join', { event_id: id });
      // The interceptor returns the .data.data directly
      if (res.status === 'allowed') {
        navigate(`/book/${id}`);
      } else {
        navigate(`/waiting-room/${id}`);
      }
    } catch (err) {
      alert('Error joining queue: ' + (err.message || 'Unknown error'));
    }
  };

  if (isLoading) return <div className="text-center py-20 text-gray-500">Loading event...</div>;
  if (error) return <div className="text-center py-20 text-red-500">Event not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 mb-8 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Events</span>
      </button>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-80 bg-indigo-50 flex items-center justify-center relative overflow-hidden">
          {event.banner_url ? (
            <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-12">
              <h1 className="text-5xl font-extrabold text-indigo-900 mb-4">{event.title}</h1>
              <ImageIcon size={64} className="mx-auto text-indigo-200" />
            </div>
          )}
          {event.banner_url && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-8">
              <h1 className="text-4xl font-bold text-white">{event.title}</h1>
            </div>
          )}
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold mb-4">About the Event</h2>
            <p className="text-gray-600 leading-relaxed mb-8">{event.description || 'No description available for this event.'}</p>
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 h-fit sticky top-24">
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar size={20} className="text-indigo-500" />
                <span>{new Date(event.start_time).toLocaleDateString()}</span>
              </div>
            </div>

            <button
              onClick={handleBookNow}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              Book Tickets Now
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">
              High demand event. You may be placed in a queue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
