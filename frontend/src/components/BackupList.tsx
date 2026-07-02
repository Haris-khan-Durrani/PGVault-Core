'use client';

import { useState } from 'react';
import { fetchApi } from '@/utils/api';
import { Key, HardDrive, Cloud, Copy, Trash2, RefreshCcw, Download, Server, CheckCircle, XCircle, Clock, AlertTriangle, Loader2, Database } from 'lucide-react';

type Backup = {
  id: number;
  driveFileId: string | null;
  driveFilename: string | null;
  localBackupPath: string | null;
  s3Key: string | null;
  driveFileUrl: string | null;
  s3FileUrl: string | null;
  status: string;
  createdAt: string;
};

export default function BackupList({ backups, onRefresh }: { backups: Backup[], onRefresh?: () => void }) {
  const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean; backupId: number | null; password: string | null; error: string | null }>({
    isOpen: false, backupId: null, password: null, error: null,
  });

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; backupId: number | null; accountPassword: string; error: string | null; loading: boolean }>({
    isOpen: false, backupId: null, accountPassword: '', error: null, loading: false,
  });

  const [restoreModal, setRestoreModal] = useState<{ isOpen: boolean; backupId: number | null; accountPassword: string; error: string | null; loading: boolean }>({
    isOpen: false, backupId: null, accountPassword: '', error: null, loading: false,
  });

  const handleRevealPassword = async (backupId: number) => {
    try {
      setPasswordModal({ isOpen: true, backupId, password: null, error: null });
      const data = await fetchApi(`/backup/${backupId}/password`);
      setPasswordModal({ isOpen: true, backupId, password: data.password, error: null });
    } catch (err: any) {
      setPasswordModal({ isOpen: true, backupId, password: null, error: err.message });
    }
  };

  const closePasswordModal = () => setPasswordModal({ isOpen: false, backupId: null, password: null, error: null });

  const handleDownloadLocal = async (backupId: number, filename: string) => {
    try {
      const response = await fetch(`${API_URL}/backup/${backupId}/download`, {
        method: 'GET', credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to download file.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none'; a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Error downloading file');
    }
  };

  const handleDeleteClick = (backupId: number) => setDeleteModal({ isOpen: true, backupId, accountPassword: '', error: null, loading: false });
  const closeDeleteModal = () => setDeleteModal({ isOpen: false, backupId: null, accountPassword: '', error: null, loading: false });

  const handleConfirmDelete = async () => {
    if (!deleteModal.backupId) return;
    setDeleteModal(prev => ({ ...prev, loading: true, error: null }));
    try {
      await fetchApi(`/backup/${deleteModal.backupId}`, {
        method: 'DELETE', body: JSON.stringify({ password: deleteModal.accountPassword })
      });
      closeDeleteModal();
      if (onRefresh) onRefresh(); else window.location.reload();
    } catch (err: any) {
      setDeleteModal(prev => ({ ...prev, loading: false, error: err.message || 'Failed to delete backup' }));
    }
  };

  const handleRestoreClick = (backupId: number) => setRestoreModal({ isOpen: true, backupId, accountPassword: '', error: null, loading: false });
  const closeRestoreModal = () => setRestoreModal({ isOpen: false, backupId: null, accountPassword: '', error: null, loading: false });

  const handleConfirmRestore = async () => {
    if (!restoreModal.backupId) return;
    setRestoreModal(prev => ({ ...prev, loading: true, error: null }));
    try {
      await fetchApi(`/backup/${restoreModal.backupId}/restore`, {
        method: 'POST', body: JSON.stringify({ password: restoreModal.accountPassword })
      });
      closeRestoreModal();
      alert('Database restored successfully!');
      if (onRefresh) onRefresh(); else window.location.reload();
    } catch (err: any) {
      setRestoreModal(prev => ({ ...prev, loading: false, error: err.message || 'Failed to restore backup' }));
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'done') return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20 w-fit">
        <CheckCircle className="w-3.5 h-3.5" /> SUCCESS
      </span>
    );
    if (status === 'failed') return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 w-fit">
        <XCircle className="w-3.5 h-3.5" /> FAILED
      </span>
    );
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 w-fit animate-pulse">
        <Clock className="w-3.5 h-3.5" /> PENDING
      </span>
    );
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-950/50 border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
              <th className="py-4 px-6 font-medium">Backup File & Date</th>
              <th className="py-4 px-6 font-medium">Destinations</th>
              <th className="py-4 px-6 font-medium">Status</th>
              <th className="py-4 px-6 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-sm">
            {backups.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 px-6 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <Database className="w-10 h-10 mb-3 opacity-20" />
                    <p>No backups found in your vault.</p>
                    <p className="text-xs mt-1">Trigger one manually to get started!</p>
                  </div>
                </td>
              </tr>
            ) : (
              backups.map(backup => (
                <tr key={backup.id} className="hover:bg-gray-800/40 transition-colors group">
                  <td className="py-5 px-6">
                    <div className="font-semibold text-gray-200 text-base mb-1">
                      {backup.driveFilename || backup.localBackupPath?.split('\\').pop() || backup.localBackupPath?.split('/').pop() || backup.s3Key?.split('/').pop() || '-'}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {new Date(backup.createdAt).toLocaleString()}
                    </div>
                  </td>
                  
                  <td className="py-5 px-6">
                    <div className="flex flex-wrap gap-2">
                      {backup.localBackupPath && (
                        <div className="flex items-center text-[11px] font-medium text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20" title={backup.localBackupPath}>
                          <Server className="w-3 h-3 mr-1.5" /> Local
                        </div>
                      )}
                      {backup.driveFileId && (
                        <div className="flex items-center text-[11px] font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                          <HardDrive className="w-3 h-3 mr-1.5" /> Drive
                        </div>
                      )}
                      {backup.s3Key && (
                        <div className="flex items-center text-[11px] font-medium text-orange-400 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20" title={backup.s3Key}>
                          <Cloud className="w-3 h-3 mr-1.5" /> S3
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="py-5 px-6">
                    <StatusBadge status={backup.status} />
                  </td>
                  
                  <td className="py-5 px-6">
                    <div className="flex flex-col gap-2 items-end">
                      
                      {backup.status === 'done' && (
                        <>
                          {/* Top row actions: view/download */}
                          <div className="flex items-center justify-end gap-2">
                            {backup.driveFileUrl && (
                              <a href={backup.driveFileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1.5 rounded transition-colors">
                                <HardDrive className="w-3.5 h-3.5" /> View
                              </a>
                            )}
                            {backup.s3FileUrl && (
                              <a href={backup.s3FileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:text-white bg-orange-500/10 hover:bg-orange-500/20 px-2.5 py-1.5 rounded transition-colors">
                                <Cloud className="w-3.5 h-3.5" /> View
                              </a>
                            )}
                            {backup.localBackupPath && (
                              <button onClick={() => handleDownloadLocal(backup.id, backup.localBackupPath!.split('\\').pop() || backup.localBackupPath!.split('/').pop() || 'backup.zip')} className="flex items-center gap-1.5 text-xs font-medium text-green-400 hover:text-white bg-green-500/10 hover:bg-green-500/20 px-2.5 py-1.5 rounded transition-colors">
                                <Download className="w-3.5 h-3.5" /> Download
                              </button>
                            )}
                          </div>
                          
                          {/* Bottom row actions: admin */}
                          <div className="flex items-center justify-end gap-2 mt-1">
                            <button onClick={() => handleRevealPassword(backup.id)} className="flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors">
                              <Key className="w-3.5 h-3.5" /> Password
                            </button>
                            <span className="text-gray-700">|</span>
                            <button onClick={() => handleRestoreClick(backup.id)} className="flex items-center gap-1.5 text-xs font-medium text-orange-500 hover:text-orange-400 transition-colors">
                              <RefreshCcw className="w-3.5 h-3.5" /> Recover
                            </button>
                            <span className="text-gray-700">|</span>
                            <button onClick={() => handleDeleteClick(backup.id)} className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </>
                      )}

                      {backup.status === 'failed' && (
                        <button onClick={() => handleDeleteClick(backup.id)} className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                      
                      {backup.status === 'pending' && (
                        <button onClick={() => handleDeleteClick(backup.id)} className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" /> Cancel / Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Password Modal */}
      {passwordModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
            <button onClick={closePasswordModal} className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors">
              <XCircle className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-purple-500/20 p-2.5 rounded-xl text-purple-400"><Key className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold text-white">ZIP Archive Password</h3>
            </div>
            
            {passwordModal.error ? (
              <div className="text-red-400 bg-red-400/10 p-4 rounded-xl text-sm border border-red-400/20">
                {passwordModal.error}
              </div>
            ) : !passwordModal.password ? (
              <div className="text-blue-400 flex flex-col items-center justify-center p-8 gap-4 bg-gray-950 rounded-xl border border-gray-800">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="font-medium animate-pulse">Decrypting secure vault...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm leading-relaxed">
                  Use this password to extract your ZIP file locally. Do not share it with anyone.
                </p>
                <div className="bg-gray-950 p-5 rounded-xl border border-gray-800 flex justify-between items-center shadow-inner gap-4">
                  <span className="font-mono text-green-400 font-semibold break-all text-sm">{passwordModal.password}</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(passwordModal.password as string)}
                    className="shrink-0 p-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
            <button onClick={closeDeleteModal} disabled={deleteModal.loading} className="absolute top-5 right-5 text-gray-500 hover:text-white disabled:opacity-50 transition-colors">
              <XCircle className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-500/20 p-2.5 rounded-xl text-red-500"><Trash2 className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold text-white">Confirm Deletion</h3>
            </div>
            
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              This will permanently delete the backup record and the local file. This action cannot be undone. Please enter your account login password to confirm.
            </p>

            {deleteModal.error && (
              <div className="text-red-400 bg-red-400/10 p-4 rounded-xl text-sm border border-red-400/20 mb-6 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {deleteModal.error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block uppercase tracking-wider">Account Password</label>
                <input 
                  type="password" value={deleteModal.accountPassword}
                  onChange={(e) => setDeleteModal(prev => ({ ...prev, accountPassword: e.target.value }))}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl focus:border-red-500 outline-none text-gray-200 shadow-inner transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={closeDeleteModal} disabled={deleteModal.loading} className="px-5 py-2.5 text-gray-400 hover:text-white transition-colors font-medium rounded-lg hover:bg-gray-800">
                  Cancel
                </button>
                <button onClick={handleConfirmDelete} disabled={deleteModal.loading || !deleteModal.accountPassword} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 font-bold shadow-lg shadow-red-500/20">
                  {deleteModal.loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : 'Delete Backup'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {restoreModal.isOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-900 border-2 border-orange-500/50 rounded-2xl shadow-[0_0_50px_rgba(249,115,22,0.15)] p-8 w-full max-w-md relative">
            <button onClick={closeRestoreModal} disabled={restoreModal.loading} className="absolute top-5 right-5 text-gray-500 hover:text-white disabled:opacity-50 transition-colors">
              <XCircle className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-500/20 text-orange-500 rounded-xl flex items-center justify-center">
                <RefreshCcw className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">Database Recovery</h3>
            </div>
            
            <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-xl mb-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
              <h4 className="text-orange-400 font-bold mb-2 uppercase text-xs tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Warning: Permanent Overwrite
              </h4>
              <p className="text-orange-200/90 text-sm leading-relaxed">
                This action will completely wipe your current PostgreSQL database and restore it to this exact backup point.
              </p>
              <ul className="list-disc list-inside text-orange-200/70 text-sm mt-3 space-y-1.5 ml-1">
                <li>Existing tables will be dropped.</li>
                <li>Data created after this backup will be lost.</li>
              </ul>
            </div>

            {restoreModal.error && (
              <div className="text-red-400 bg-red-400/10 p-4 rounded-xl text-sm border border-red-400/20 mb-6 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {restoreModal.error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block uppercase tracking-wider">Account Password Required</label>
                <input 
                  type="password" value={restoreModal.accountPassword}
                  onChange={(e) => setRestoreModal(prev => ({ ...prev, accountPassword: e.target.value }))}
                  placeholder="Enter your password to authorize"
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl focus:border-orange-500 outline-none text-gray-200 shadow-inner transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={closeRestoreModal} disabled={restoreModal.loading} className="px-5 py-2.5 text-gray-400 hover:text-white transition-colors font-medium rounded-lg hover:bg-gray-800">
                  Cancel
                </button>
                <button onClick={handleConfirmRestore} disabled={restoreModal.loading || !restoreModal.accountPassword} className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-orange-600/20 hover:scale-[1.02] active:scale-95">
                  {restoreModal.loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Restoring...</> : 'I Understand, Restore Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
