import React, { useState } from 'react';
import api from '../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, TrendingUp, Users, Ticket, LayoutGrid } from 'lucide-react';

const AdminDashboardPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    banner_url: '',
    is_published: true,
    zones: [{ name: '', price: 0, total_rows: 10, seats_per_row: 10 }]
  });

  const [selectedEventId, setSelectedEventId] = useState(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats', selectedEventId],
    queryFn: async () => {
      const url = selectedEventId 
        ? `/admin/dashboard/stats?event_id=${selectedEventId}` 
        : '/admin/dashboard/stats';
      return await api.get(url);
    },
    refetchInterval: 5000,
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      // Use public events list if admin specific one doesn't exist
      return await api.get('/events');
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      return await api.post('/admin/events', eventData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      setIsModalOpen(false);
      alert('Event created successfully!');
    },
    onError: (err) => {
      alert(`Failed to create event: ${err.message}`);
    }
  });

  const addZone = () => {
    setNewEvent({
      ...newEvent,
      zones: [...newEvent.zones, { name: '', price: 0, total_rows: 10, seats_per_row: 10 }]
    });
  };

  const removeZone = (index) => {
    setNewEvent({
      ...newEvent,
      zones: newEvent.zones.filter((_, i) => i !== index)
    });
  };

  const updateZone = (field, value, index) => {
    const updatedZones = [...newEvent.zones];
    updatedZones[index][field] = value;
    setNewEvent({ ...newEvent, zones: updatedZones });
  };

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-extrabold">Admin Dashboard</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
        >
          <Plus size={20} />
          Create Event
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl"><TrendingUp size={24} /></div>
            <span className="text-gray-500 font-medium">Total Revenue</span>
          </div>
          <div className="text-3xl font-black">${stats?.total_revenue || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><Ticket size={24} /></div>
            <span className="text-gray-500 font-medium">Tickets Sold</span>
          </div>
          <div className="text-3xl font-black">{stats?.total_sold || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><LayoutGrid size={24} /></div>
            <span className="text-gray-500 font-medium">Occupancy Rate</span>
          </div>
          <div className="flex items-end gap-3">
            <div className="text-3xl font-black">{Math.round((stats?.occupancy_rate || 0) * 100)}%</div>
            <div className="flex-1 bg-gray-100 h-2 mb-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-500 h-full transition-all duration-1000" 
                style={{ width: `${(stats?.occupancy_rate || 0) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Demographics */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Users size={20} className="text-indigo-500" />
            Audience Demographics
          </h3>
          <div className="space-y-6">
            <div>
              <span className="text-sm font-medium text-gray-500 block mb-3">Gender Distribution</span>
              <div className="space-y-3">
                {stats?.gender_dist?.map(item => (
                  <div key={item.gender} className="space-y-1">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{item.gender}</span>
                      <span>{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full transition-all"
                        style={{ width: `${(item.count / (stats?.total_sold || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-50">
              <span className="text-sm font-medium text-gray-500 block mb-3">Age Groups</span>
              <div className="grid grid-cols-3 gap-4">
                {stats?.age_dist && Object.entries(stats.age_dist).map(([group, count]) => (
                  <div key={group} className="text-center p-3 bg-gray-50 rounded-2xl">
                    <div className="text-xs text-gray-400 font-bold uppercase mb-1">{group}</div>
                    <div className="text-lg font-black text-gray-700">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Event List */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <LayoutGrid size={20} className="text-indigo-500" />
              Managed Events
            </h3>
            {selectedEventId && (
              <button 
                onClick={() => setSelectedEventId(null)}
                className="text-xs font-bold text-indigo-600 hover:indigo-800"
              >
                Clear Filter
              </button>
            )}
          </div>
          <div className="space-y-4">
            {eventsLoading ? (
              <div className="text-center py-10 text-gray-400">Loading events...</div>
            ) : events?.map(event => (
              <div 
                key={event.id} 
                onClick={() => setSelectedEventId(event.id)}
                className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                  selectedEventId === event.id 
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' 
                    : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div>
                  <div className="font-bold text-gray-800">{event.title}</div>
                  <div className="text-xs text-gray-400">{new Date(event.start_time).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${event.is_published ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {event.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-extrabold">Create New Event</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              // Convert local time strings to ISO format before sending to server
              const submitData = {
                ...newEvent,
                start_time: new Date(newEvent.start_time).toISOString(),
                end_time: new Date(newEvent.end_time).toISOString()
              };
              createEventMutation.mutate(submitData);
            }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banner URL</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={newEvent.banner_url}
                    onChange={e => setNewEvent({...newEvent, banner_url: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={newEvent.start_time}
                    onChange={e => setNewEvent({...newEvent, start_time: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={newEvent.end_time}
                    onChange={e => setNewEvent({...newEvent, end_time: e.target.value})}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows="3"
                    value={newEvent.description}
                    onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Seating Zones</h3>
                  <button
                    type="button"
                    onClick={addZone}
                    className="text-indigo-600 text-sm font-bold hover:underline"
                  >
                    + Add Zone
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {newEvent.zones.map((zone, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Zone Name</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1 border border-gray-300 rounded"
                          value={zone.name}
                          onChange={e => updateZone('name', e.target.value, idx)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Price ($)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-1 border border-gray-300 rounded"
                          value={zone.price}
                          onChange={e => updateZone('price', parseFloat(e.target.value), idx)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Rows</label>
                        <input
                          type="number"
                          className="w-full px-3 py-1 border border-gray-300 rounded"
                          value={zone.total_rows}
                          onChange={e => updateZone('total_rows', parseInt(e.target.value), idx)}
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Cols</label>
                          <input
                            type="number"
                            className="w-full px-3 py-1 border border-gray-300 rounded"
                            value={zone.seats_per_row}
                            onChange={e => updateZone('seats_per_row', parseInt(e.target.value), idx)}
                            required
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeZone(idx)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 text-gray-500 font-medium hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:bg-gray-300"
                >
                  {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
