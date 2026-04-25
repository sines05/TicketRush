import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();

  const hasCalled = React.useRef(false);

  useEffect(() => {
    if (hasCalled.current) return;
    hasCalled.current = true;

    const handleCallback = async () => {
      const code = searchParams.get('code');
      if (!code) {
        navigate('/login');
        return;
      }

      try {
        const data = await api.get(`/auth/google/callback?code=${code}`);
        setToken(data.access_token);
        setUser({
          id: data.user_id,
          fullName: data.full_name,
          role: data.role
        });
        navigate('/');
      } catch (err) {
        console.error('Google login failed:', err);
        alert('Đăng nhập Google thất bại. Vui lòng thử lại.');
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, setToken, setUser]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-600 font-medium text-lg">Đang xác thực với Google...</p>
    </div>
  );
};

export default GoogleCallback;
