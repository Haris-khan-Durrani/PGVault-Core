'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/utils/api';
import BackupList from '@/components/BackupList';
import Analytics from '@/components/Analytics';
import { Database, PlayCircle, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [triggering, setTriggering] = useState(false);

  const loadBackups = async () => {
    try {
      const data = await fetchApi('/backup');
      setBackups(data.backups);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
    // Setup a basic polling to refresh backup list every 10 seconds
    const interval = setInterval(loadBackups, 10000);
    return () => clearInterval(interval);
  }, []);

  const triggerBackup = async () => {
    setTriggering(true);
    setError('');
    try {
      await fetchApi('/backup', { method: 'POST' });
      // Immediately reload to show pending status
      loadBackups();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="bg-blue-600/20 p-2.5 rounded-xl border border-blue-500/30">
              <Database className="text-blue-500 w-7 h-7" />
            </div>
            Your Vault
          </h2>
          <p className="text-gray-400 mt-2">Manage, monitor, and restore your PostgreSQL database backups.</p>
        </div>
        <button
          onClick={triggerBackup}
          disabled={triggering}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95"
        >
          {triggering ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Starting Backup...
            </>
          ) : (
            <>
              <PlayCircle className="w-5 h-5" />
              Trigger Backup Now
            </>
          )}
        </button>
      </div>

      {/* Analytics Section */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Analytics />
      </div>

      {/* Backups List */}
      <div className="mt-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            Recent Backups
            <span className="bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-full font-medium ml-2">
              {backups.length}
            </span>
          </h3>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <span className="font-medium">Loading your secure vault...</span>
          </div>
        ) : (
          <BackupList backups={backups} />
        )}
      </div>
    </div>
  );
}
