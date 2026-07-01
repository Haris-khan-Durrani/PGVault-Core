'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/utils/api';

type Mode = 'password' | 'magic' | 'otp' | 'register';

export default function Home() {
  const [mode, setMode] = useState<Mode>('password');
  
  // Form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // Magic Login / OTP state
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [twoFactorUserId, setTwoFactorUserId] = useState<number | null>(null);
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      
      if (res.require2fa) {
        setMode('otp');
        setTwoFactorUserId(res.userId);
        setMessage(`Please enter the 6-digit code sent via ${res.method.toUpperCase()}.`);
        return;
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMagicLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await fetchApi('/auth/magic-login', {
        method: 'POST',
        body: JSON.stringify({ identifier })
      });

      if (!res.exists) {
        setError('User not found. Please register an account.');
        setMode('register');
      } else if (res.loggedIn) {
        router.push('/dashboard');
      } else {
        setMode('otp');
        setTwoFactorUserId(res.userId);
        setMessage(res.message);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await fetchApi('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ userId: twoFactorUserId, otp })
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, phone, password })
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="bg-gray-900 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-800">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-400">PGVault</h1>
        
        <h2 className="text-xl mb-6 text-center text-gray-300">
          {mode === 'password' && 'Sign in to your account'}
          {mode === 'magic' && 'Magic Login'}
          {mode === 'otp' && 'Two-Factor Authentication'}
          {mode === 'register' && 'Create a new account'}
        </h2>
        
        {message && <div className="bg-blue-500/10 border border-blue-500 text-blue-400 p-3 rounded mb-4">{message}</div>}
        {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4">{error}</div>}
        
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors">
              Sign In
            </button>
            <div className="mt-4 text-center">
              <button type="button" onClick={() => { setMode('magic'); setError(''); setMessage(''); }} className="text-sm text-gray-400 hover:text-white transition-colors">
                Login with OTP (Magic Login)
              </button>
            </div>
          </form>
        )}

        {mode === 'magic' && (
          <form onSubmit={handleMagicLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email or Phone</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="you@email.com or 97155..."
                required
              />
            </div>
            <button type="submit" className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors">
              Send OTP
            </button>
            <div className="mt-4 text-center">
              <button type="button" onClick={() => { setMode('password'); setError(''); setMessage(''); }} className="text-sm text-gray-400 hover:text-white transition-colors">
                Back to Password Login
              </button>
            </div>
          </form>
        )}

        {mode === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Enter Verification Code</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-center tracking-widest text-lg"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
            <button type="submit" className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors">
              Verify & Login
            </button>
            <div className="mt-4 text-center">
              <button type="button" onClick={() => { setMode('password'); setError(''); setMessage(''); }} className="text-sm text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label>
              <input
                type="tel"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors">
              Register Account
            </button>
            <div className="mt-4 text-center">
              <button type="button" onClick={() => { setMode('password'); setError(''); setMessage(''); }} className="text-sm text-gray-400 hover:text-white transition-colors">
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
