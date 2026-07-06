'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/utils/api';
import { Key, Terminal, Book, Copy, CheckCircle, Trash2, ShieldAlert, Plus, Server, Database, Lock, RotateCcw, Settings } from 'lucide-react';

type ApiKey = {
  id: number;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  last4: string;
};

export default function ApiAccessPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [newlyGeneratedToken, setNewlyGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('http://localhost:3000');

  const loadKeys = async () => {
    try {
      const data = await fetchApi('/apikeys');
      setKeys(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    loadKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const data = await fetchApi('/apikeys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName })
      });
      setNewlyGeneratedToken(data.token);
      setNewKeyName('');
      setCopied(false);
      loadKeys();
    } catch (err) {
      alert('Failed to create key');
    }
  };

  const handleRevokeKey = async (id: number) => {
    if (!confirm('Are you sure you want to revoke this API key? Any applications using it will immediately lose access.')) return;
    try {
      await fetchApi(`/apikeys/${id}`, { method: 'DELETE' });
      loadKeys();
    } catch (err) {
      alert('Failed to revoke key');
    }
  };

  const handleCopy = () => {
    if (newlyGeneratedToken) {
      navigator.clipboard.writeText(newlyGeneratedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Key className="text-blue-500 w-8 h-8" />
            API Access
          </h2>
          <p className="text-gray-400 mt-2">Generate and manage API keys for external integrations.</p>
        </div>
      </div>

      {/* New Key Alert */}
      {newlyGeneratedToken && (
        <div className="bg-green-500/10 border border-green-500/30 p-6 rounded-xl relative overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
          <div className="flex items-start gap-4">
            <div className="bg-green-500/20 p-2 rounded-full shrink-0">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-green-400 mb-1">Save your new API Key!</h3>
              <p className="text-gray-300 mb-4 text-sm">
                Please copy this key and save it securely. For your protection, you will not be able to see it again after closing this panel.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <code className="flex-1 bg-gray-950 px-4 py-3 rounded-lg border border-gray-800 text-green-300 font-mono break-all text-sm shadow-inner">
                  {newlyGeneratedToken}
                </code>
                <button
                  onClick={handleCopy}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-green-500/20"
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'Copied to Clipboard' : 'Copy Key'}
                </button>
              </div>
              <button 
                onClick={() => setNewlyGeneratedToken(null)}
                className="mt-6 text-sm text-green-400/80 hover:text-green-300 font-medium underline underline-offset-4"
              >
                I have saved it securely, close this
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Key Row */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          Create New API Key
        </h3>
        <p className="text-sm text-gray-400 mb-5">Give your new key a descriptive name to help you identify it later.</p>
        
        <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g., Zapier Integration, Production Server"
            className="flex-1 px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors"
            maxLength={50}
            required
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Generate Key
          </button>
        </form>
      </div>

      {/* Active Keys Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-400" />
            Active API Keys
          </h3>
          <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full font-medium">
            {keys.length} Total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-950/50 border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                <th className="py-4 px-6 font-medium">Name</th>
                <th className="py-4 px-6 font-medium">Token Prefix</th>
                <th className="py-4 px-6 font-medium">Last Used</th>
                <th className="py-4 px-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              {loading ? (
                <tr><td colSpan={4} className="py-12 text-center text-gray-500">Loading keys...</td></tr>
              ) : keys.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-gray-500">No API keys generated yet.</td></tr>
              ) : (
                keys.map(key => (
                  <tr key={key.id} className="hover:bg-gray-800/40 transition-colors group">
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="font-medium text-gray-200">{key.name}</div>
                      <div className="text-xs text-gray-500 mt-1">Created {new Date(key.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="py-4 px-6 font-mono text-gray-400 text-xs whitespace-nowrap">pgv_...{key.last4}</td>
                    <td className="py-4 px-6 text-gray-400 text-xs whitespace-nowrap">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="text-red-400 hover:text-white font-medium px-4 py-2 bg-red-500/10 hover:bg-red-600 rounded-lg transition-colors flex items-center gap-2 ml-auto text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-gray-400" />
          Quick Start Guide
        </h3>
        <p className="text-gray-400 mb-6 text-sm leading-relaxed">
          Authenticate requests to the PGVault API by passing your key in the <code className="bg-gray-800 text-white px-1.5 py-0.5 rounded text-xs font-mono border border-gray-700">Authorization</code> header as a Bearer token.
        </p>
        <div className="bg-gray-950 p-5 rounded-xl border border-gray-800 relative shadow-inner">
          <pre className="text-gray-300 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
<span className="text-pink-400">curl</span> -X POST {origin}/api/v1/backups/trigger \
  -H <span className="text-green-300">"Authorization: Bearer pgv_YOUR_API_KEY_HERE"</span>
          </pre>
        </div>
      </div>

      {/* API Reference */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-800 bg-gray-900/50">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Book className="w-5 h-5 text-purple-400" />
            API Reference
          </h3>
          <p className="text-gray-400 mt-2 text-sm">Comprehensive documentation for all available v1 API endpoints.</p>
        </div>
        <div className="divide-y divide-gray-800">
          
          <div className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded">GET</span>
              <code className="text-gray-300 font-mono text-sm">/api/v1/backups</code>
            </div>
            <p className="text-gray-400 text-sm mb-3">Retrieve a list of your 50 most recent backups, including download URLs.</p>
            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 relative shadow-inner mt-3">
              <span className="absolute top-2 right-3 text-xs text-gray-600 font-mono">Response (200 OK)</span>
              <pre className="text-gray-400 text-xs font-mono overflow-x-auto">
{`[
  {
    "id": 5,
    "userId": 1,
    "status": "completed",
    "createdAt": "2026-07-02T13:20:21.155Z",
    "fileSizeBytes": 1504000000,
    "driveFileUrl": "https://drive.google.com/file/d/1A2B3C.../view",
    "s3FileUrl": null
  }
]`}
              </pre>
            </div>
          </div>

          <div className="p-6 bg-gray-800/10">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded">POST</span>
              <code className="text-gray-300 font-mono text-sm">/api/v1/backups/trigger</code>
            </div>
            <p className="text-gray-400 text-sm mb-3">Trigger a manual database backup. Runs asynchronously in the background.</p>
            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 relative shadow-inner mt-3">
              <span className="absolute top-2 right-3 text-xs text-gray-600 font-mono">Response (202 Accepted)</span>
              <pre className="text-gray-400 text-xs font-mono overflow-x-auto">
{`{
  "message": "Backup triggered successfully",
  "backupId": 6
}`}
              </pre>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded">GET</span>
              <code className="text-gray-300 font-mono text-sm">/api/v1/backups/&#123;id&#125;/password</code>
            </div>
            <p className="text-gray-400 text-sm mb-3">Retrieve the decrypted ZIP password for a specific backup ID.</p>
            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 relative shadow-inner mt-3">
              <span className="absolute top-2 right-3 text-xs text-gray-600 font-mono">Response (200 OK)</span>
              <pre className="text-gray-400 text-xs font-mono overflow-x-auto">
{`{
  "password": "y0ur-s3cr3t-z1p-p4ssw0rd"
}`}
              </pre>
            </div>
          </div>

          <div className="p-6 bg-gray-800/10">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded">POST</span>
              <code className="text-gray-300 font-mono text-sm">/api/v1/backups/&#123;id&#125;/restore</code>
            </div>
            <p className="text-gray-400 text-sm mb-3">Trigger a database restore from a specific backup ID. Note: This drops all current tables.</p>
            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 relative shadow-inner mt-3">
              <span className="absolute top-2 right-3 text-xs text-gray-600 font-mono">Response (202 Accepted)</span>
              <pre className="text-gray-400 text-xs font-mono overflow-x-auto">
{`{
  "message": "Restore process triggered"
}`}
              </pre>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs font-bold rounded">DELETE</span>
              <code className="text-gray-300 font-mono text-sm">/api/v1/backups/&#123;id&#125;</code>
            </div>
            <p className="text-gray-400 text-sm mb-3">Permanently delete a backup record and its associated local ZIP file.</p>
            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 relative shadow-inner mt-3">
              <span className="absolute top-2 right-3 text-xs text-gray-600 font-mono">Response (200 OK)</span>
              <pre className="text-gray-400 text-xs font-mono overflow-x-auto">
{`{
  "success": true,
  "message": "Backup deleted successfully"
}`}
              </pre>
            </div>
          </div>

          <div className="p-6 bg-gray-800/10">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded">GET</span>
              <code className="text-gray-300 font-mono text-sm">/api/v1/settings</code>
            </div>
            <p className="text-gray-400 text-sm mb-3">Retrieve current database and destination settings (passwords and secrets are redacted).</p>
            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 relative shadow-inner mt-3">
              <span className="absolute top-2 right-3 text-xs text-gray-600 font-mono">Response (200 OK)</span>
              <pre className="text-gray-400 text-xs font-mono overflow-x-auto">
{`{
  "id": 1,
  "pgHost": "172.21.0.3",
  "pgPort": 5432,
  "pgUser": "pgvault",
  "pgDatabase": "whatsapp",
  "driveEnabled": true,
  "s3Enabled": false
}`}
              </pre>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded">GET</span>
              <code className="text-gray-300 font-mono text-sm">/api/v1/system/health</code>
            </div>
            <p className="text-gray-400 text-sm mb-3">Retrieve detailed server health statistics, including CPU load, memory usage, uptime, and database latency.</p>
            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 relative shadow-inner mt-3">
              <span className="absolute top-2 right-3 text-xs text-gray-600 font-mono">Response (200 OK)</span>
              <pre className="text-gray-400 text-xs font-mono overflow-x-auto">
{`{
  "status": "online",
  "system": {
    "uptimeSeconds": 1209600,
    "cpuCores": 8,
    "cpuUsagePercent": 39.0,
    "memory": {
      "totalBytes": 25232932864,
      "freeBytes": 5879488512,
      "usagePercent": 76.7
    }
  },
  "database": {
    "status": "healthy",
    "latencyMs": 4
  }
}`}
              </pre>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
