'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/utils/api';
import { Server, Activity, Database, Cpu, MemoryStick, Clock } from 'lucide-react';

export default function ServerHealth() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const data = await fetchApi('/system/health');
      setHealth(data);
    } catch (err) {
      console.error('Failed to fetch health stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;
  if (!health) return null;

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const getMemColor = (percent: number) => percent > 85 ? 'text-red-400' : percent > 70 ? 'text-yellow-400' : 'text-green-400';
  const getCpuColor = (percent: number) => percent > 80 ? 'text-red-400' : percent > 50 ? 'text-yellow-400' : 'text-blue-400';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
      {/* DB Status */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:bg-gray-800/50 transition-colors">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-blue-500/10 p-2 rounded-lg">
            <Database className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-gray-400 font-medium text-sm">Database</span>
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${health.database.status === 'healthy' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-white font-semibold capitalize">{health.database.status}</span>
          </div>
          <span className="text-xs text-gray-500 font-mono">{health.database.latencyMs}ms latency</span>
        </div>
      </div>

      {/* CPU Usage */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:bg-gray-800/50 transition-colors">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-purple-500/10 p-2 rounded-lg">
            <Cpu className="w-5 h-5 text-purple-400" />
          </div>
          <span className="text-gray-400 font-medium text-sm">CPU Load</span>
        </div>
        <div className="flex items-end justify-between">
          <span className={`text-2xl font-bold font-mono ${getCpuColor(health.system.cpuUsagePercent)}`}>
            {health.system.cpuUsagePercent}%
          </span>
          <span className="text-xs text-gray-500">{health.system.cpuCores} Cores</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3 overflow-hidden">
          <div className={`h-1.5 rounded-full ${getCpuColor(health.system.cpuUsagePercent).replace('text-', 'bg-')}`} style={{ width: `${Math.min(100, health.system.cpuUsagePercent)}%` }}></div>
        </div>
      </div>

      {/* Memory Usage */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:bg-gray-800/50 transition-colors">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-orange-500/10 p-2 rounded-lg">
            <MemoryStick className="w-5 h-5 text-orange-400" />
          </div>
          <span className="text-gray-400 font-medium text-sm">Memory (RAM)</span>
        </div>
        <div className="flex items-end justify-between">
          <span className={`text-2xl font-bold font-mono ${getMemColor(health.system.memory.usagePercent)}`}>
            {health.system.memory.usagePercent}%
          </span>
          <span className="text-xs text-gray-500">
            {((health.system.memory.usedBytes) / (1024 * 1024 * 1024)).toFixed(1)}GB / {(health.system.memory.totalBytes / (1024 * 1024 * 1024)).toFixed(1)}GB
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3 overflow-hidden">
          <div className={`h-1.5 rounded-full ${getMemColor(health.system.memory.usagePercent).replace('text-', 'bg-')}`} style={{ width: `${health.system.memory.usagePercent}%` }}></div>
        </div>
      </div>

      {/* Uptime */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:bg-gray-800/50 transition-colors">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-emerald-500/10 p-2 rounded-lg">
            <Clock className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-gray-400 font-medium text-sm">System Uptime</span>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-xl font-bold text-white font-mono">
            {formatUptime(health.system.uptimeSeconds)}
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Server className="w-3 h-3" /> Node
          </span>
        </div>
      </div>
    </div>
  );
}
