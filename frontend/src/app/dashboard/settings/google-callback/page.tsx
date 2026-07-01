'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchApi } from '@/utils/api';

export default function GoogleCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const [status, setStatus] = useState('Verifying Google Drive connection...');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) {
      setError('No authorization code found in URL.');
      return;
    }

    const verifyCode = async () => {
      try {
        const origin = window.location.origin;
        const redirectUri = `${origin}/dashboard/settings/google-callback`;
        
        await fetchApi('/auth/google/callback', {
          method: 'POST',
          body: JSON.stringify({ code, redirectUri })
        });
        
        setStatus('Successfully connected! Redirecting back to settings...');
        setTimeout(() => {
          router.push('/dashboard/settings');
        }, 2000);
      } catch (err: any) {
        setError(err.message || 'Failed to connect to Google Drive.');
      }
    };

    verifyCode();
  }, [code, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 max-w-md w-full text-center">
        {error ? (
          <>
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Connection Failed</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <button 
              onClick={() => router.push('/dashboard/settings')}
              className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Back to Settings
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-white mb-2">Connecting to Google Drive</h2>
            <p className="text-gray-400">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}
