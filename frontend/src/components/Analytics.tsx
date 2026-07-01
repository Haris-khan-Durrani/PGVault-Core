'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/utils/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function Analytics() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/backup/stats')
      .then(data => {
        setStats(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-48 flex items-center justify-center text-gray-500">Loading analytics...</div>;
  }

  if (!stats) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalBackups = stats.successCount30d + stats.failedCount30d;
  const successRate = totalBackups > 0 
    ? Math.round((stats.successCount30d / totalBackups) * 100) 
    : 0;

  const pieData = [
    { name: 'Successful', value: stats.successCount30d },
    { name: 'Failed', value: stats.failedCount30d },
  ];
  const COLORS = ['#10b981', '#ef4444']; // Emerald and Red

  return (
    <div className="mb-10 space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-gray-400 text-sm font-medium mb-1">Total Storage Used</h3>
          <p className="text-3xl font-bold text-white">{formatBytes(stats.totalStorageBytes)}</p>
          <p className="text-xs text-gray-500 mt-2">Across all destinations</p>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-gray-400 text-sm font-medium mb-1">Success Rate (30d)</h3>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-white">{successRate}%</p>
          </div>
          <p className="text-xs text-gray-500 mt-2">{stats.successCount30d} successful out of {totalBackups}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-gray-400 text-sm font-medium mb-1">Active Retention</h3>
          <p className="text-3xl font-bold text-white">Auto</p>
          <p className="text-xs text-gray-500 mt-2">Cleanup worker is active</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-6">Daily Backup Activity (30 Days)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af" 
                  fontSize={12} 
                  tickFormatter={(val) => val.split('-').slice(1).join('/')} 
                />
                <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="success" name="Successful" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="failed" name="Failed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg flex flex-col items-center">
          <h3 className="text-lg font-semibold text-white mb-2 w-full text-left">Success vs Failure</h3>
          <div className="h-[250px] w-full flex-1 flex items-center justify-center">
            {totalBackups === 0 ? (
              <p className="text-gray-500">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
