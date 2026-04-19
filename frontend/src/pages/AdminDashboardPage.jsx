import React, { useState } from 'react';
import api from '../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, TrendingUp, Users, Ticket, LayoutGrid } from 'lucide-react';

const AdminDashboardPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    date: '',
    location: '',
    zones: [{ name: '', price: 0, rows: 10, cols: 10 }]
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/api/admin/stats');
      return res.data;
    },
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const res = await api.get('/api/admin/events');
      return res.data;
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      const res = await api.post('/api/admin/events', eventData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      setIsModalOpen(false);
    },
  });

  const addZone = () => {
    setNewEvent({
      ...newEvent,
      zones: [...newEvent.zones, { name: '', price: 0, rows: 10, cols: 10 }]
    });
  };

  const removeZone = (index) => {
    setNewEvent({
      ...newEvent,
      zones: newEvent.zones.filter((_, i) => i !== index)
    });
  };

  const updateZone = (index, field, value) => {
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
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Users size={24} /></div>
            <span className="text-gray-500 font-medium">Total Customers</span>
          </div>
          <div className="text-3xl font-black">{stats?.gender_dist?.length || 0}</div>
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
          </div>
        </div>

        {/* Event List */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <LayoutGrid size={20} className="text-indigo-500" />
            Managed Events
          </h3>
          <div className="space-y-4">
            {eventsLoading ? (
              <div className="text-center py-10 text-gray-400">Loading events...</div>
            ) : events?.map(event => (
              <div key={event.ID} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                <div>
                  <div className="font-bold text-gray-800">{event.Name}</div>
                  <div className="text-xs text-gray-400">{event.Location} • {new Date(event.Date).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded text-gray-500">
                    {event.Status}
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
              createEventMutation.mutate(newEvent);
            }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={newEvent.name}
                    onChange={e => setNewEvent({...newEvent, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={newEvent.location}
                    onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={newEvent.date}
                    onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                          onChange={e => updateZone(idx, 'name', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Price ($)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-1 border border-gray-300 rounded"
                          value={zone.price}
                          onChange={e => updateZone(idx, 'price', parseFloat(e.target.value))}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Rows</label>
                        <input
                          type="number"
                          className="w-full px-3 py-1 border border-gray-300 rounded"
                          value={zone.rows}
                          onChange={e => updateZone(idx, 'rows', parseInt(e.target.value))}
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Cols</label>
                          <input
                            type="number"
                            className="w-full px-3 py-1 border border-gray-300 rounded"
                            value={zone.cols}
                            onChange={e => updateZone(idx, 'cols', parseInt(e.target.value))}
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
                  disabled={createEventMutation.isLoading}
                  className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:bg-gray-300"
                >
                  {createEventMutation.isLoading ? 'Creating...' : 'Create Event'}
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
