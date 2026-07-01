'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/utils/api';
import { User, Mail, Phone, ShieldCheck, Smartphone, ShieldOff, Save, CheckCircle, AlertCircle, Key } from 'lucide-react';

const TwoFactorCard = ({ title, description, icon: Icon, value, selected, onChange, disabled, disabledReason }: any) => (
  <div 
    onClick={() => !disabled && onChange(value)}
    className={`p-5 rounded-xl border-2 transition-all flex items-start gap-4 group ${
      disabled ? 'opacity-50 cursor-not-allowed bg-gray-900 border-gray-800' :
      selected 
        ? 'cursor-pointer border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
        : 'cursor-pointer border-gray-800 bg-gray-950 hover:border-gray-700 hover:bg-gray-900/80'
    }`}
  >
    <div className={`p-3 rounded-xl shrink-0 transition-colors ${selected && !disabled ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-400 group-hover:text-gray-300'}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="flex-1">
      <h4 className={`font-semibold text-lg transition-colors ${selected && !disabled ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{title}</h4>
      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{description}</p>
      {disabled && disabledReason && (
        <p className="text-xs text-red-400 mt-2 flex items-center gap-1 font-medium"><AlertCircle className="w-3.5 h-3.5"/> {disabledReason}</p>
      )}
    </div>
    <div className="flex items-center justify-center h-full pt-2 pr-2">
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selected && !disabled ? 'border-blue-500 bg-blue-500/20' : 'border-gray-600'}`}>
        {selected && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
      </div>
    </div>
  </div>
);

export default function ProfilePage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState('none');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [smtpTested, setSmtpTested] = useState(false);
  const [smsTested, setSmsTested] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await fetchApi('/profile');
      setUsername(data.username || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setTwoFactorMethod(data.twoFactorMethod || 'none');
      setSmtpTested(data.smtpTested || false);
      setSmsTested(data.smsTested || false);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await fetchApi('/profile', {
        method: 'PUT',
        body: JSON.stringify({ username, email, phone, twoFactorMethod })
      });
      setMessage({ type: 'success', text: 'Profile updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setPassMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setSavingPass(true);
    setPassMessage(null);
    try {
      await fetchApi('/profile/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setPassMessage({ type: 'success', text: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassMessage(null), 3000);
    } catch (error: any) {
      setPassMessage({ type: 'error', text: error.message || 'Failed to update password' });
    } finally {
      setSavingPass(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="animate-pulse flex items-center gap-2">
          <User className="w-5 h-5" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-12">
      
      {/* Header */}
      <div className="flex items-center gap-5 border-b border-gray-800 pb-8">
        <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-4 rounded-2xl border border-gray-700/50 shadow-inner">
          <User className="text-blue-400 w-10 h-10" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">My Profile</h2>
          <p className="text-gray-400 mt-1">Manage your account details, contact information, and security preferences.</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
          message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="font-medium">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto opacity-70 hover:opacity-100 transition-opacity">&times;</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Personal Information & Password */}
        <div className="lg:col-span-1 space-y-8">
          <form onSubmit={handleSave} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
            
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              Personal Details
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <User className="w-4 h-4 text-gray-500" />
                  Username
                </label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-gray-200 transition-colors shadow-inner"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  Email Address
                </label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-gray-200 transition-colors shadow-inner"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-500 font-medium">+</span>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="971551651588"
                    className="w-full pl-8 pr-4 py-3 bg-gray-950 border border-gray-800 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-gray-200 transition-colors shadow-inner"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  Include country code without '+' (e.g., 1 for US, 971 for UAE). This is required if you choose to enable SMS 2FA.
                </p>
              </div>
            </div>
          </form>

          {/* Change Password Form */}
          <form onSubmit={handlePasswordSave} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-500 to-gray-400"></div>
            
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Key className="w-5 h-5 text-gray-400" />
              Change Password
            </h3>

            {passMessage && (
              <div className={`p-4 rounded-xl border flex items-start gap-2 mb-6 ${
                passMessage.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {passMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                <span className="font-medium text-sm">{passMessage.text}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                  required 
                  className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none text-gray-200 transition-colors shadow-inner" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">New Password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  required 
                  className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none text-gray-200 transition-colors shadow-inner" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required 
                  className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none text-gray-200 transition-colors shadow-inner" 
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={savingPass} 
              className="w-full mt-6 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all disabled:opacity-50 font-semibold shadow-sm flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              {savingPass ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Right Column: Security Settings */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSave}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>

              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-6 h-6 text-purple-400" />
                    Two-Factor Authentication
                  </h3>
                  <p className="text-sm text-gray-400">Add an extra layer of security to your account.</p>
                </div>
                <div className="shrink-0">
                  {twoFactorMethod !== 'none' ? (
                    <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> 2FA Enabled
                    </span>
                  ) : (
                    <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> 2FA Disabled
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <TwoFactorCard 
                  title="Disabled (Not Recommended)"
                  description="Sign in using only your password. Your account is more vulnerable to unauthorized access."
                  icon={ShieldOff}
                  value="none"
                  selected={twoFactorMethod === 'none'}
                  onChange={setTwoFactorMethod}
                />

                <TwoFactorCard 
                  title="Email Authentication"
                  description="Receive a one-time passcode at your email address each time you sign in."
                  icon={Mail}
                  value="email"
                  selected={twoFactorMethod === 'email'}
                  onChange={setTwoFactorMethod}
                  disabled={!smtpTested}
                  disabledReason={!smtpTested ? "Please configure and test SMTP in Settings first" : undefined}
                />

                <TwoFactorCard 
                  title="SMS Text Message"
                  description="Receive a one-time passcode via SMS to your registered phone number."
                  icon={Smartphone}
                  value="sms"
                  selected={twoFactorMethod === 'sms'}
                  onChange={setTwoFactorMethod}
                  disabled={!smsTested}
                  disabledReason={!smsTested ? "Please configure and test SMS API in Settings first" : undefined}
                />
              </div>

              {/* Contextual Warnings */}
              {twoFactorMethod === 'email' && (
                <div className="mt-6 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-300/80 leading-relaxed">
                    Make sure you have correctly configured the SMTP settings in the <a href="/dashboard/settings" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">Settings page</a>, otherwise you will not receive the OTP and will be locked out.
                  </p>
                </div>
              )}
              
              {twoFactorMethod === 'sms' && (
                <div className="mt-6 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-300/80 leading-relaxed">
                    Ensure your phone number is correct and that you have entered your Elitbuzz API credentials in the <a href="/dashboard/settings" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">Settings page</a>.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" 
                disabled={saving}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-50 font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 hover:scale-[1.02] active:scale-95"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
