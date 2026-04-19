import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Hourglass } from 'lucide-react';

const WaitingRoomPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState({ position: null, state: 'loading' });

  useEffect(() => {
    const checkQueue = async () => {
      try {
        const data = await api.get(`/queue/status?event_id=${eventId}`);
        const { status: queueStatus, position } = data;

        if (queueStatus === 'allowed') {
          navigate(`/book/${eventId}`);
        } else {
          setStatus({ position, state: 'waiting' });
        }
      } catch (err) {
        console.error('Queue check failed', err);
      }
    };

    checkQueue();
    const interval = setInterval(checkQueue, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [eventId, navigate]);

  return (
    <div className="max-w-2xl mx-auto mt-20 text-center p-12 bg-white rounded-3xl shadow-xl border border-gray-100">
      <div className="flex justify-center mb-8">
        <div className="relative">
          <Hourglass size={80} className="text-indigo-600 animate-spin-slow" />
          <div className="absolute inset-0 blur-2xl bg-indigo-200 opacity-50 rounded-full"></div>
        </div>
      </div>

      <h1 className="text-4xl font-extrabold mb-4">You're in the Queue!</h1>
      <p className="text-gray-600 text-lg mb-12">
        We're experiencing high demand. Please stay on this page. <br />
        You'll be automatically redirected when it's your turn.
      </p>

      <div className="bg-indigo-50 p-8 rounded-2xl border border-indigo-100 inline-block min-w-[300px]">
        <span className="text-sm uppercase tracking-widest text-indigo-500 font-bold block mb-2">
          Your Position
        </span>
        <div className="text-6xl font-black text-indigo-700">
          {status.position !== null ? `#${status.position}` : '...'}
        </div>
      </div>

      <div className="mt-12 flex items-center justify-center gap-3 text-gray-400 text-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Live queue updates active</span>
      </div>
    </div>
  );
};

export default WaitingRoomPage;
