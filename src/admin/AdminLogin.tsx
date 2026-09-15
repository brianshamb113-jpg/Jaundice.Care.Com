import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import { getSession } from './types';
import LogoBadge from '../components/LogoBadge';

const DEFAULT_EMAIL = 'admin@jaundicecare.tz';
const DEFAULT_PASSWORD = 'sajahajo';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      const creds = localStorage.getItem('jc_admin_credentials');
      let validEmail = DEFAULT_EMAIL;
      let validPassword = DEFAULT_PASSWORD;

      if (creds) {
        try {
          const parsed = JSON.parse(creds);
          validEmail = parsed.email || DEFAULT_EMAIL;
          validPassword = parsed.password || DEFAULT_PASSWORD;
        } catch {
          // use defaults
        }
      }

      if (email === validEmail && password === validPassword) {
        const session = localStorage.getItem('jc_admin_session');
        let name = 'Administrator';
        if (session) {
          try {
            const s = JSON.parse(session);
            name = s.name || 'Administrator';
          } catch {
            // use default
          }
        }
        localStorage.setItem('jc_admin_session', JSON.stringify({
          loggedIn: true,
          role: 'super_admin',
          name,
        }));
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError('Invalid email or password.');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 medical-grid"
      style={{ background: 'linear-gradient(180deg, #0F6E56 0%, #185FA5 100%)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <button
          onClick={() => navigate('/', { replace: true })}
          className="flex items-center gap-2 text-sm font-semibold text-[#5F5E5A] hover:text-[#0F6E56] transition-colors mb-4 -mt-1"
        >
          <ArrowLeft size={16} />
          Back to Sign In
        </button>

        <div className="flex flex-col items-center mb-6">
          <LogoBadge size={80} className="mb-4" />
          <h1 className="font-bold text-[#0F6E56]" style={{ fontSize: 24 }}>
            JaundiceCARE
          </h1>
          <p className="font-medium mt-0.5" style={{ color: '#F5A623', fontSize: 14 }}>
            Tanzania · Admin Portal
          </p>
          <div
            className="mt-3 rounded-full"
            style={{ width: 40, height: 2, background: '#F5A623' }}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F5E5A]" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@jaundicecare.tz"
                required
                className="w-full pl-10 pr-4 py-3 border border-[#E5E3DC] rounded-xl focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#E1F5EE] text-[#1A1A1A] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F5E5A]" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-3 border border-[#E5E3DC] rounded-xl focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#E1F5EE] text-[#1A1A1A] transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="bg-[#FAECE7] border border-[#A32D2D] rounded-xl px-4 py-3">
              <p className="text-sm text-[#A32D2D] font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-60 mt-2 relative overflow-hidden"
            style={{
              background: 'linear-gradient(to right, #0F6E56, #1D9E75)',
              borderRight: '3px solid #F5A623',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-[#5F5E5A] mt-6">
          JaundiceCARE Tanzania &mdash; Admin v1.0.0
        </p>
      </div>
    </div>
  );
}
