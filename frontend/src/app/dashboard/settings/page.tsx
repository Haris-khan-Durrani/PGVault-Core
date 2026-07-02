'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/utils/api';
import { Database, Clock, HardDrive, Cloud, Mail, Info, Globe, MessageSquare, Braces } from 'lucide-react';

const Toggle = ({ checked, onChange, label, description }: { checked: boolean; onChange: (val: boolean) => void; label: string; description?: string }) => (
  <div className="flex items-center justify-between p-4 bg-gray-950 border border-gray-800 rounded-lg cursor-pointer hover:border-gray-700 transition-colors" onClick={() => onChange(!checked)}>
    <div>
      <span className="text-gray-200 font-medium block">{label}</span>
      {description && <span className="text-gray-500 text-xs">{description}</span>}
    </div>
    <div className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-700'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'left-7' : 'left-1'}`} />
    </div>
  </div>
);

export default function Settings() {
  const [activeTab, setActiveTab] = useState('database');

  const [pgHost, setPgHost] = useState('');
  const [pgPort, setPgPort] = useState('5432');
  const [pgUser, setPgUser] = useState('');
  const [pgDatabase, setPgDatabase] = useState('');
  const [pgPassword, setPgPassword] = useState('');
  const [cronSchedule, setCronSchedule] = useState('0 0 * * *');
  const [retentionDays, setRetentionDays] = useState('0');
  const [appName, setAppName] = useState('');
  
  // Destinations
  const [destLocal, setDestLocal] = useState(true);
  const [destGoogleDrive, setDestGoogleDrive] = useState(false);
  const [destS3, setDestS3] = useState(false);

  // Google Drive Settings
  const [driveClientId, setDriveClientId] = useState('');
  const [driveClientSecret, setDriveClientSecret] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');

  // Amazon S3 Settings
  const [s3AccessKey, setS3AccessKey] = useState('');
  const [s3SecretKey, setS3SecretKey] = useState('');
  const [hasS3SecretKey, setHasS3SecretKey] = useState(false);
  const [s3Region, setS3Region] = useState('');
  const [s3Bucket, setS3Bucket] = useState('');
  const [s3Endpoint, setS3Endpoint] = useState('');

  // SMTP Settings
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [hasSmtpPass, setHasSmtpPass] = useState(false);
  // SMS Settings
  const [smsApiKey, setSmtpApiKey] = useState('C20046376a3bb1a30d84c3.30473810');
  const [smsSenderId, setSmsSenderId] = useState('EBMS');
  const [smsApiUrl, setSmsApiUrl] = useState('');
  const [smsApiMethod, setSmsApiMethod] = useState('GET');
  const [smsApiHeaders, setSmsApiHeaders] = useState('');
  const [smsApiBody, setSmsApiBody] = useState('');
  const [smtpTested, setSmtpTested] = useState(false);
  const [smsTested, setSmsTested] = useState(false);

  const [smtpModal, setSmtpModal] = useState({ isOpen: false, toEmail: '', message: 'PGVault test message.' });
  const [smsModal, setSmsModal] = useState({ isOpen: false, toPhone: '', message: 'PGVault test message.' });
  
  const [hasPgPassword, setHasPgPassword] = useState(false);
  const [hasDriveClientSecret, setHasDriveClientSecret] = useState(false);
  const [hasDriveRefreshToken, setHasDriveRefreshToken] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [postgresTables, setPostgresTables] = useState<any[] | null>(null);
  const [pgTesting, setPgTesting] = useState(false);
  const [s3Testing, setS3Testing] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smsTesting, setSmsTesting] = useState(false);

  const [origin, setOrigin] = useState('http://localhost:3000');

  useEffect(() => {
    setOrigin(window.location.origin);
    fetchApi('/settings').then(data => {
      if (data.pgHost) setPgHost(data.pgHost);
      if (data.pgPort) setPgPort(data.pgPort);
      if (data.pgUser) setPgUser(data.pgUser);
      if (data.pgDatabase) setPgDatabase(data.pgDatabase);
      if (data.appName) setAppName(data.appName);
      if (data.cronSchedule) setCronSchedule(data.cronSchedule);
      if (data.retentionDays !== undefined) setRetentionDays(data.retentionDays.toString());
      
      setDestLocal(data.destLocal);
      setDestGoogleDrive(data.destGoogleDrive);
      setDestS3(data.destS3);

      if (data.driveClientId) setDriveClientId(data.driveClientId);
      if (data.driveFolderId) setDriveFolderId(data.driveFolderId);
      
      if (data.s3AccessKey) setS3AccessKey(data.s3AccessKey);
      if (data.s3Region) setS3Region(data.s3Region);
      if (data.s3Bucket) setS3Bucket(data.s3Bucket);
      if (data.s3Endpoint) setS3Endpoint(data.s3Endpoint);
      if (data.hasS3SecretKey) setHasS3SecretKey(data.hasS3SecretKey);
      
      if (data.smtpHost) setSmtpHost(data.smtpHost);
      if (data.smtpPort) setSmtpPort(data.smtpPort);
      if (data.smtpUser) setSmtpUser(data.smtpUser);
      if (data.hasSmtpPass) setHasSmtpPass(data.hasSmtpPass);
      if (data.smtpTested !== undefined) setSmtpTested(data.smtpTested);

      if (data.smsApiKey) setSmtpApiKey(data.smsApiKey);
      if (data.smsSenderId) setSmsSenderId(data.smsSenderId);
      if (data.smsApiUrl) setSmsApiUrl(data.smsApiUrl);
      if (data.smsApiMethod) setSmsApiMethod(data.smsApiMethod);
      if (data.smsApiHeaders) setSmsApiHeaders(data.smsApiHeaders);
      if (data.smsApiBody) setSmsApiBody(data.smsApiBody);
      if (data.smsTested !== undefined) setSmsTested(data.smsTested);

      setHasPgPassword(data.hasPgPassword);
      setHasDriveClientSecret(data.hasDriveClientSecret);
      setHasDriveRefreshToken(data.hasDriveRefreshToken);
    }).catch(err => {
      setError('Failed to load settings');
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const payload: any = {
      pgHost, pgPort, pgUser, pgDatabase, appName, cronSchedule,
      retentionDays: parseInt(retentionDays, 10) || 0,
      destLocal, destGoogleDrive, destS3,
      driveFolderId, driveClientId,
      s3AccessKey, s3Region, s3Bucket, s3Endpoint,
      smtpHost, smtpPort, smtpUser, smtpPass, smsApiKey, smsSenderId, smsApiUrl, smsApiMethod, smsApiHeaders, smsApiBody
    };

    if (pgPassword) payload.pgPassword = pgPassword;
    if (driveClientSecret) payload.driveClientSecret = driveClientSecret;
    if (s3SecretKey) payload.s3SecretKey = s3SecretKey;

    try {
      await fetchApi('/settings', { method: 'POST', body: JSON.stringify(payload) });
      setMessage('Settings saved successfully!');
      if (pgPassword) setHasPgPassword(true);
      if (driveClientSecret) setHasDriveClientSecret(true);
      if (s3SecretKey) setHasS3SecretKey(true);
      if (smtpPass) { setHasSmtpPass(true); setSmtpTested(false); }
      setPgPassword(''); setDriveClientSecret(''); setS3SecretKey(''); setSmtpPass('');
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestDrive = async () => {
    setMessage(''); setError('');
    try {
      const res = await fetchApi('/settings/test-drive', { method: 'POST', body: JSON.stringify({}) });
      setMessage(res.message || 'Google Drive Connection Verified!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Test Connection Failed');
    }
  };

  const handleTestS3 = async () => {
    setMessage(''); setError(''); setS3Testing(true);
    try {
      const res = await fetchApi('/settings/test-s3', { method: 'POST', body: JSON.stringify({}) });
      setMessage(res.message || 'S3 Connection Verified!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'S3 Test Connection Failed');
    } finally {
      setS3Testing(false);
    }
  };

  const handleConnectDrive = async () => {
    setMessage(''); setError('');
    if ((driveClientId && driveClientSecret) || (driveClientId && hasDriveClientSecret)) {
      try {
        const res = await fetchApi('/auth/google');
        if (res.url) window.location.href = res.url;
      } catch (err: any) {
        setError(err.message || 'Failed to start Google Drive connection.');
      }
    } else {
      setError('Please enter your Client ID and Client Secret, then click "Save Settings" before connecting.');
    }
  };

  const handleTestPostgres = async () => {
    setMessage(''); setError(''); setPgTesting(true); setPostgresTables(null);
    try {
      const payload: any = { pgHost, pgPort, pgUser, pgDatabase };
      if (pgPassword) payload.pgPassword = pgPassword;
      const res = await fetchApi('/settings/test-postgres', { method: 'POST', body: JSON.stringify(payload) });
      setMessage(res.message || 'PostgreSQL Connection Verified!');
      setPostgresTables(res.tables || []);
    } catch (err: any) {
      setError(err.message || 'PostgreSQL Test Connection Failed');
    } finally {
      setPgTesting(false);
    }
  };

  const openSmtpModal = () => setSmtpModal({ isOpen: true, toEmail: smtpUser, message: 'PGVault test message.' });
  const openSmsModal = () => setSmsModal({ isOpen: true, toPhone: '', message: 'PGVault test message.' });

  const executeTestSmtp = async () => {
    setMessage(''); setError(''); setSmtpTesting(true);
    try {
      const res = await fetchApi('/settings/test-smtp', { method: 'POST', body: JSON.stringify({ toEmail: smtpModal.toEmail, message: smtpModal.message }) });
      setMessage(res.message || 'SMTP Test Successful!');
      setSmtpTested(true);
      setSmtpModal({ ...smtpModal, isOpen: false });
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'SMTP Test Connection Failed');
      setSmtpTested(false);
    } finally {
      setSmtpTesting(false);
    }
  };

  const executeTestSms = async () => {
    setMessage(''); setError(''); setSmsTesting(true);
    try {
      const res = await fetchApi('/settings/test-sms', { method: 'POST', body: JSON.stringify({ toPhone: smsModal.toPhone, message: smsModal.message }) });
      setMessage(res.message || 'SMS Test Successful!');
      setSmsTested(true);
      setSmsModal({ ...smsModal, isOpen: false });
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'SMS Test Connection Failed');
      setSmsTested(false);
    } finally {
      setSmsTesting(false);
    }
  };

  const tabs = [
    { id: 'database', label: 'Database', icon: Database },
    { id: 'automation', label: 'Automation', icon: Clock },
    { id: 'destinations', label: 'Destinations', icon: HardDrive },
    { id: 'cloud', label: 'Cloud Providers', icon: Cloud },
    { id: 'notifications', label: 'Notifications & 2FA', icon: Mail },
  ];

  return (
    <div className="w-full h-[calc(100vh-8rem)] flex flex-col relative mx-auto">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-3xl font-bold text-white">Settings</h2>
      </div>
      
      {message && <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg shrink-0 flex justify-between items-center">{message} <button onClick={() => setMessage('')}>&times;</button></div>}
      {error && <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg shrink-0 flex justify-between items-center">{error} <button onClick={() => setError('')}>&times;</button></div>}
      
      <div className="flex flex-1 overflow-hidden bg-gray-900 border border-gray-800 rounded-xl shadow-2xl relative">
        
        {/* Sidebar Tabs */}
        <div className="w-64 border-r border-gray-800 bg-gray-900/50 p-4 space-y-2 overflow-y-auto shrink-0">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Configuration</div>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-blue-600/20 text-blue-400' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-950/30">
           <form id="settings-form" onSubmit={handleSave} className="p-8 max-w-3xl pb-32">
             
             {activeTab === 'database' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                 <h3 className="text-xl font-semibold text-blue-400 border-b border-gray-800 pb-2">PostgreSQL Connection</h3>
                 <p className="text-sm text-gray-400">Configure connection details for the database you wish to backup.</p>
                 <div className="grid grid-cols-2 gap-6">
                   <div>
                     <label className="block text-sm text-gray-400 mb-1">Host</label>
                     <input type="text" value={pgHost} onChange={e => setPgHost(e.target.value)} className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder="localhost or IP" />
                   </div>
                   <div>
                     <label className="block text-sm text-gray-400 mb-1">Port</label>
                     <input type="text" value={pgPort} onChange={e => setPgPort(e.target.value)} className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder="5432" />
                   </div>
                   <div>
                     <label className="block text-sm text-gray-400 mb-1">Database Name</label>
                     <input type="text" value={pgDatabase} onChange={e => setPgDatabase(e.target.value)} className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder="my_database" />
                   </div>
                   <div>
                     <label className="block text-sm text-gray-400 mb-1">User</label>
                     <input type="text" value={pgUser} onChange={e => setPgUser(e.target.value)} className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder="postgres" />
                   </div>
                   <div className="col-span-2">
                     <label className="block text-sm text-gray-400 mb-1 flex items-center justify-between">
                       <span>Password</span>
                       {hasPgPassword && <span className="text-green-400 text-xs">(Already saved)</span>}
                     </label>
                     <input type="password" value={pgPassword} onChange={e => setPgPassword(e.target.value)} className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder={hasPgPassword ? "Enter new password to update" : "Database password"} />
                   </div>
                 </div>
                 
                 <div className="pt-4">
                   <button type="button" onClick={handleTestPostgres} disabled={pgTesting} className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-medium py-2 px-6 rounded-lg text-sm transition-colors shadow-sm">
                     {pgTesting ? 'Testing Connection...' : 'Test Connection & Fetch Tables'}
                   </button>
                 </div>

                 {postgresTables !== null && (
                   <div className="mt-6 p-5 bg-gray-950 border border-gray-800 rounded-xl">
                     <h4 className="text-sm font-semibold text-gray-300 mb-3">Accessible Tables ({postgresTables.length})</h4>
                     {postgresTables.length > 0 ? (
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         {postgresTables.map((table: any, i) => (
                           <div key={i} className="flex justify-between items-center text-sm text-gray-400 bg-gray-900 px-4 py-3 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                             <span className="font-medium text-blue-400 truncate pr-4" title={table.name}>{table.name}</span>
                             <div className="flex flex-col text-right shrink-0">
                               <span className="text-xs text-gray-500">{table.rows} rows</span>
                               <span className="text-xs text-gray-500">{table.size}</span>
                             </div>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <p className="text-sm text-gray-500">No user tables found in this database.</p>
                     )}
                   </div>
                 )}
               </div>
             )}

             {activeTab === 'automation' && (
               <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                 <div>
                   <h3 className="text-xl font-semibold text-blue-400 border-b border-gray-800 pb-2 mb-4">Automation & Schedules</h3>
                   <p className="text-sm text-gray-400 mb-6">Define when backups run and how long they are kept.</p>
                   
                   <div className="bg-gray-950 border border-gray-800 p-5 rounded-xl space-y-6">
                     <div>
                       <label className="block text-sm text-gray-400 mb-1">Cron Schedule</label>
                       <input type="text" value={cronSchedule} onChange={e => setCronSchedule(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 font-mono transition-colors" placeholder="0 0 * * *" />
                       <p className="text-xs text-gray-500 mt-2">Standard cron format. Default "0 0 * * *" is daily at midnight.</p>
                     </div>
                     <div>
                       <label className="block text-sm text-gray-400 mb-1">Retention Policy (Days)</label>
                       <input type="number" min="0" value={retentionDays} onChange={e => setRetentionDays(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder="0" />
                       <p className="text-xs text-gray-500 mt-2">Number of days to keep backups before auto-deleting. Enter <code className="bg-gray-800 px-1 rounded text-white font-mono">0</code> to keep forever.</p>
                     </div>
                   </div>
                 </div>
               </div>
             )}

             {activeTab === 'destinations' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                 <h3 className="text-xl font-semibold text-blue-400 border-b border-gray-800 pb-2">Backup Destinations</h3>
                 <p className="text-sm text-gray-400 mb-4">Select where your automated and manual backups should be saved. You can select multiple destinations simultaneously.</p>
                 
                 <div className="space-y-4">
                   <Toggle checked={destLocal} onChange={setDestLocal} label="Local Storage" description="Save directly to the server's disk" />
                   <Toggle checked={destGoogleDrive} onChange={setDestGoogleDrive} label="Google Drive" description="Upload encrypted ZIPs to Google Drive" />
                   <Toggle checked={destS3} onChange={setDestS3} label="Amazon S3" description="Upload encrypted ZIPs to an S3-compatible bucket" />
                 </div>
               </div>
             )}

             {activeTab === 'cloud' && (
               <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                 <div>
                   <div className="flex justify-between items-end border-b border-gray-800 pb-2 mb-6">
                     <h3 className="text-xl font-semibold text-blue-400">Google Drive Configuration</h3>
                     {hasDriveRefreshToken ? (
                       <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs border border-green-500/20 font-medium">Connected</span>
                     ) : (
                       <span className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-xs border border-yellow-500/20 font-medium">Not Connected</span>
                     )}
                   </div>
                   
                   <div className="grid grid-cols-1 gap-6 bg-gray-950 border border-gray-800 p-6 rounded-xl">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="md:col-span-2">
                         <label className="block text-sm text-gray-400 mb-1">Application Name (Optional)</label>
                         <input type="text" value={appName} onChange={e => setAppName(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder="e.g. My Website" />
                         <p className="text-xs text-gray-500 mt-1">If provided, your folder will be named "App Name - Date".</p>
                       </div>
                       <div>
                         <label className="block text-sm text-gray-400 mb-1">Client ID</label>
                         <input type="text" value={driveClientId} onChange={e => setDriveClientId(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" />
                       </div>
                       <div>
                         <label className="block text-sm text-gray-400 mb-1 flex items-center justify-between">
                           <span>Client Secret</span>
                           {hasDriveClientSecret && <span className="text-green-400 text-xs">(Saved)</span>}
                         </label>
                         <input type="password" value={driveClientSecret} onChange={e => setDriveClientSecret(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder={hasDriveClientSecret ? "Enter new Secret" : "e.g. GOCSPX-..."} />
                       </div>
                       <div className="md:col-span-2">
                         <label className="block text-sm text-gray-400 mb-1">Target Folder ID</label>
                         <input type="text" value={driveFolderId} onChange={e => setDriveFolderId(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder="18dP949jKL9O..." />
                       </div>

                       <div className="md:col-span-2 bg-blue-900/20 border border-blue-800/30 rounded-lg p-4 mt-2">
                         <h4 className="text-blue-400 text-sm font-medium mb-1 flex items-center gap-2">
                           <Info className="w-4 h-4" />
                           Google Cloud Console Setup
                         </h4>
                         <p className="text-gray-400 text-sm mb-2">When creating your OAuth Client ID in Google Cloud, add exactly this URL to the <strong>Authorized redirect URIs</strong> section:</p>
                         <code className="block bg-gray-950 px-3 py-2 rounded border border-gray-800 text-blue-300 font-mono text-sm break-all select-all">
                           {origin}/dashboard/settings/google-callback
                         </code>
                       </div>
                     </div>
                     
                     <div className="flex gap-3 pt-2">
                       <button type="button" onClick={handleConnectDrive} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg text-sm transition-colors shadow-sm shadow-blue-500/20">
                         Connect & Authorize
                       </button>
                       <button type="button" onClick={handleTestDrive} className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg text-sm transition-colors shadow-sm">
                         Test Connection
                       </button>
                     </div>
                   </div>
                 </div>

                 <div className="pt-4">
                   <h3 className="text-xl font-semibold text-blue-400 border-b border-gray-800 pb-2 mb-6">Amazon S3 Configuration</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-950 border border-gray-800 p-6 rounded-xl">
                     <div>
                       <label className="block text-sm text-gray-400 mb-1">Access Key ID</label>
                       <input type="text" value={s3AccessKey} onChange={e => setS3AccessKey(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder="AKIAIOSFODNN7..." />
                     </div>
                     <div>
                       <label className="block text-sm text-gray-400 mb-1 flex items-center justify-between">
                         <span>Secret Access Key</span>
                         {hasS3SecretKey && <span className="text-green-400 text-xs">(Saved)</span>}
                       </label>
                       <input type="password" value={s3SecretKey} onChange={e => setS3SecretKey(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder={hasS3SecretKey ? "Enter new Secret" : "wJalrXUtnFEM..."} />
                     </div>
                     <div>
                       <label className="block text-sm text-gray-400 mb-1">Bucket Name</label>
                       <input type="text" value={s3Bucket} onChange={e => setS3Bucket(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder="my-backups" />
                     </div>
                     <div>
                       <label className="block text-sm text-gray-400 mb-1">Region</label>
                       <input type="text" value={s3Region} onChange={e => setS3Region(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder="us-east-1" />
                     </div>
                     <div className="md:col-span-2">
                       <label className="block text-sm text-gray-400 mb-1">Custom Endpoint (Optional)</label>
                       <input type="text" value={s3Endpoint} onChange={e => setS3Endpoint(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder="https://s3.eu-central-1.wasabisys.com" />
                       <p className="text-xs text-gray-500 mt-1">Leave blank for AWS. Use for Wasabi, DigitalOcean Spaces, MinIO, R2.</p>
                     </div>
                     <div className="md:col-span-2 pt-2">
                       <button type="button" onClick={handleTestS3} disabled={s3Testing} className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-medium py-2 px-6 rounded-lg text-sm transition-colors shadow-sm">
                         {s3Testing ? 'Testing...' : 'Test S3 Connection'}
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
             )}

             {activeTab === 'notifications' && (
               <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                 <div>
                   <div className="flex justify-between items-end border-b border-gray-800 pb-2 mb-6">
                     <h3 className="text-xl font-semibold text-blue-400">SMTP Settings (Email 2FA)</h3>
                     {smtpTested ? (
                       <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs border border-green-500/20 font-medium">Tested</span>
                     ) : (
                       <span className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-xs border border-yellow-500/20 font-medium">Not Tested</span>
                     )}
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-950 border border-gray-800 p-6 rounded-xl">
                     <div>
                       <label className="block text-sm text-gray-400 mb-1">SMTP Host</label>
                       <input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder="smtp.gmail.com" />
                     </div>
                     <div>
                       <label className="block text-sm text-gray-400 mb-1">SMTP Port</label>
                       <input type="text" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder="587" />
                     </div>
                     <div>
                       <label className="block text-sm text-gray-400 mb-1">SMTP User (Email)</label>
                       <input type="text" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder="you@gmail.com" />
                     </div>
                     <div>
                       <label className="block text-sm text-gray-400 mb-1 flex items-center justify-between">
                         <span>SMTP / App Password</span>
                         {hasSmtpPass && <span className="text-green-400 text-xs">(Saved)</span>}
                       </label>
                       <input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 outline-none text-gray-200 transition-colors" placeholder={hasSmtpPass ? "Enter new password" : "Enter password"} />
                     </div>
                     <div className="md:col-span-2 pt-2">
                       <button type="button" onClick={openSmtpModal} disabled={smtpTesting} className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-medium py-2 px-6 rounded-lg text-sm transition-colors shadow-sm">
                         {smtpTesting ? 'Testing...' : 'Test SMTP Connection'}
                       </button>
                     </div>
                   </div>
                 </div>

                 <div>
                   <div className="flex justify-between items-end border-b border-gray-800 pb-2 mb-6">
                     <h3 className="text-xl font-semibold text-blue-400">SMS API Settings (SMS 2FA)</h3>
                     {smsTested ? (
                       <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs border border-green-500/20 font-medium">Tested</span>
                     ) : (
                       <span className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-xs border border-yellow-500/20 font-medium">Not Tested</span>
                     )}
                   </div>
                   <div className="bg-gray-950 border border-gray-800 p-6 rounded-xl space-y-6 relative overflow-hidden">
                     {/* Decorative background gradient */}
                     <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl"></div>

                     {/* API URL and Method */}
                     <div className="flex flex-col md:flex-row gap-6 relative z-10">
                       <div className="flex-1">
                         <label className="flex items-center gap-2 text-sm text-gray-300 font-medium mb-2"><Globe className="w-4 h-4 text-gray-500"/> API Endpoint URL</label>
                         <input type="text" value={smsApiUrl} onChange={e => setSmsApiUrl(e.target.value)} className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:border-blue-500 outline-none text-gray-200 transition-colors shadow-inner" placeholder="https://api.sms.com/send?key=YOUR_KEY&to={{phone}}&text={{msg}}" />
                       </div>
                       <div className="md:w-48">
                         <label className="flex items-center gap-2 text-sm text-gray-300 font-medium mb-2">HTTP Method</label>
                         <select value={smsApiMethod} onChange={e => setSmsApiMethod(e.target.value)} className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:border-blue-500 outline-none text-gray-200 transition-colors shadow-inner appearance-none cursor-pointer">
                           <option value="GET">GET</option>
                           <option value="POST">POST</option>
                         </select>
                       </div>
                     </div>

                     {/* Tip Callout */}
                     <div className="bg-blue-900/10 border border-blue-800/30 rounded-xl p-4 flex gap-3 relative z-10 items-start">
                       <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                       <div className="text-sm text-blue-200/80 leading-relaxed">
                         <strong className="text-blue-300 font-medium">Dynamic Variables:</strong> You can inject the destination phone number and message into your URL or Body by using <code className="bg-blue-950/50 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/50 font-mono text-xs">{`{{phone}}`}</code> and <code className="bg-blue-950/50 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/50 font-mono text-xs">{`{{msg}}`}</code>.
                       </div>
                     </div>

                     {/* Extra inputs for POST */}
                     <div className={`space-y-6 transition-all duration-300 origin-top overflow-hidden relative z-10 ${smsApiMethod === 'POST' ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0'}`}>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                           <label className="flex items-center gap-2 text-sm text-gray-300 font-medium mb-2"><Braces className="w-4 h-4 text-gray-500"/> API Headers (JSON)</label>
                           <textarea value={smsApiHeaders} onChange={e => setSmsApiHeaders(e.target.value)} placeholder={`{\n  "Authorization": "Bearer TOKEN"\n}`} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:border-blue-500 outline-none text-gray-200 transition-colors font-mono text-sm shadow-inner h-32 resize-none"></textarea>
                         </div>
                         <div>
                           <label className="flex items-center gap-2 text-sm text-gray-300 font-medium mb-2"><MessageSquare className="w-4 h-4 text-gray-500"/> API Body (JSON)</label>
                           <textarea value={smsApiBody} onChange={e => setSmsApiBody(e.target.value)} placeholder={`{\n  "to": "{{phone}}",\n  "text": "{{msg}}"\n}`} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:border-blue-500 outline-none text-gray-200 transition-colors font-mono text-sm shadow-inner h-32 resize-none"></textarea>
                         </div>
                       </div>
                     </div>

                     <div className="pt-2 relative z-10">
                       <button type="button" onClick={openSmsModal} disabled={smsTesting} className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-medium py-2 px-6 rounded-xl text-sm transition-colors shadow-sm flex items-center gap-2">
                         {smsTesting ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"/> : null}
                         {smsTesting ? 'Testing...' : 'Test SMS Connection'}
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
             )}

           </form>
        </div>

        {/* Sticky Footer */}
        <div className="absolute bottom-0 left-64 right-0 bg-gray-900/80 backdrop-blur-md border-t border-gray-800 p-4 rounded-br-xl flex justify-end z-10">
          <button 
            type="submit" 
            form="settings-form"
            disabled={saving}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-bold shadow-lg shadow-blue-500/20"
          >
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>

      </div>

      {/* SMTP Test Modal */}
      {smtpModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
            <button onClick={() => setSmtpModal({ ...smtpModal, isOpen: false })} disabled={smtpTesting} className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors">
              <span className="text-2xl leading-none">&times;</span>
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-500/20 p-2.5 rounded-xl text-blue-400"><Mail className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold text-white">Test SMTP Settings</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block uppercase tracking-wider">Recipient Email</label>
                <input 
                  type="email" value={smtpModal.toEmail}
                  onChange={(e) => setSmtpModal(prev => ({ ...prev, toEmail: e.target.value }))}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl focus:border-blue-500 outline-none text-gray-200 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block uppercase tracking-wider">Test Message Body</label>
                <textarea 
                  value={smtpModal.message}
                  onChange={(e) => setSmtpModal(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl focus:border-blue-500 outline-none text-gray-200 transition-colors resize-none h-24"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setSmtpModal({ ...smtpModal, isOpen: false })} disabled={smtpTesting} className="px-5 py-2.5 text-gray-400 hover:text-white transition-colors font-medium rounded-lg hover:bg-gray-800">
                  Cancel
                </button>
                <button onClick={executeTestSmtp} disabled={smtpTesting || !smtpModal.toEmail || !smtpModal.message} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 font-bold shadow-lg shadow-blue-500/20">
                  {smtpTesting ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SMS Test Modal */}
      {smsModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
            <button onClick={() => setSmsModal({ ...smsModal, isOpen: false })} disabled={smsTesting} className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors">
              <span className="text-2xl leading-none">&times;</span>
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-500/20 p-2.5 rounded-xl text-blue-400"><Mail className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold text-white">Test SMS API</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block uppercase tracking-wider">Recipient Phone</label>
                <input 
                  type="text" value={smsModal.toPhone}
                  onChange={(e) => setSmsModal(prev => ({ ...prev, toPhone: e.target.value }))}
                  placeholder="+1234567890"
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl focus:border-blue-500 outline-none text-gray-200 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block uppercase tracking-wider">Test Message Body</label>
                <textarea 
                  value={smsModal.message}
                  onChange={(e) => setSmsModal(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl focus:border-blue-500 outline-none text-gray-200 transition-colors resize-none h-24"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setSmsModal({ ...smsModal, isOpen: false })} disabled={smsTesting} className="px-5 py-2.5 text-gray-400 hover:text-white transition-colors font-medium rounded-lg hover:bg-gray-800">
                  Cancel
                </button>
                <button onClick={executeTestSms} disabled={smsTesting || !smsModal.toPhone || !smsModal.message} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 font-bold shadow-lg shadow-blue-500/20">
                  {smsTesting ? 'Sending...' : 'Send Test SMS'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
