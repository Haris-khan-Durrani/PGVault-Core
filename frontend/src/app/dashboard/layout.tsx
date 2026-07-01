'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/utils/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetchApi('/auth/me')
      .then(data => setUser(data.user))
      .catch(() => router.push('/'));

    const handleSessionExpired = () => {
      router.push('/');
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, [router]);

  const handleLogout = async () => {
    await fetchApi('/auth/logout', { method: 'POST' });
    router.push('/');
  };

  if (!user) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-blue-400">PGVault</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome, {user.username}</p>
        </div>
        
        <nav className="flex-1 space-y-2">
          <Link 
            href="/dashboard"
            className={`block px-4 py-2 rounded-lg text-sm transition-colors ${
              pathname === '/dashboard' 
                ? 'bg-blue-600/20 text-blue-400 font-medium' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            Dashboard
          </Link>
          <Link 
            href="/dashboard/profile"
            className={`block px-4 py-2 rounded-lg text-sm transition-colors ${
              pathname === '/dashboard/profile' 
                ? 'bg-blue-600/20 text-blue-400 font-medium' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            Profile
          </Link>
          <Link 
            href="/dashboard/settings"
            className={`block px-4 py-2 rounded-lg transition-colors ${pathname === '/dashboard/settings' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            Settings
          </Link>
          <Link 
            href="/dashboard/api"
            className={`block px-4 py-2 rounded-lg transition-colors ${pathname === '/dashboard/api' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            API Access
          </Link>
        </nav>
        
        <button 
          onClick={handleLogout}
          className="mt-auto flex items-center text-gray-400 hover:text-red-400 transition-colors px-4 py-2 rounded-lg hover:bg-red-400/10"
        >
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
