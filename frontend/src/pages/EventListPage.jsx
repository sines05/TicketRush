import React from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Ticket as TicketIcon } from 'lucide-react';

const EventListPage = () => {
  const { data: events, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      return await api.get('/events');
    },
  });

  if (isLoading) return <div className="text-center py-20 text-gray-500">Loading events...</div>;
  if (error) return <div className="text-center py-20 text-red-500">Error: {error.message}</div>;

  return (
    <div>
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Upcoming Events</h1>
        <p className="text-gray-600">Grab your tickets for the most anticipated shows!</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events?.map((event) => (
          <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-48 bg-indigo-50 overflow-hidden flex items-center justify-center relative">
              {event.banner_url ? (
                <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />
              ) : (
                <TicketIcon size={64} className="text-indigo-200" />
              )}
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">{event.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description || 'No description available'}</p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Calendar size={16} />
                  <span>{new Date(event.start_time).toLocaleDateString()}</span>
                </div>
              </div>

              <Link
                to={`/events/${event.id}`}
                className="block w-full text-center bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventListPage;
