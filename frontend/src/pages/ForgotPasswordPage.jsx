import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Mail, ArrowLeft } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await api.post('/auth/forgot-password', { email });
      setMessage('Yêu cầu đã được gửi. Vui lòng kiểm tra Console của Server để lấy mã Token (do hệ thống chưa có SMTP).');
    } catch (err) {
      setError(err.message || 'Gửi yêu cầu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
      <Link to="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-2" />
        Quay lại đăng nhập
      </Link>
      
      <h2 className="text-3xl font-bold mb-2">Quên mật khẩu?</h2>
      <p className="text-gray-500 mb-8">Nhập email của bạn để nhận mã khôi phục mật khẩu.</p>
      
      {message ? (
        <div className="p-4 bg-green-50 border border-green-100 text-green-700 rounded-xl mb-6">
          {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:bg-gray-300"
          >
            {loading ? 'Đang gửi...' : 'Gửi yêu cầu khôi phục'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ForgotPasswordPage;
