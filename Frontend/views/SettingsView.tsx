import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, LogOut, Home, ChevronRight, Save, Loader2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    username: string;
    role?: string;
    department?: string;
    firstName?: string;
    lastName?: string;
}

interface SettingsViewProps {
    onLogout: () => void;
    user: UserProfile | null;
    onUpdateProfile?: (updates: { firstName: string; lastName: string; role: string; department: string }) => Promise<void>;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onLogout, user, onUpdateProfile }) => {
  const [firstName, setFirstName] = useState(user?.firstName || user?.name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '');
  const [role, setRole] = useState(user?.role || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    if (!onUpdateProfile) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdateProfile({ firstName, lastName, role, department });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const displayName = user?.name || `${firstName} ${lastName}`.trim() || user?.username || 'User';
  const displayEmail = user?.email || 'No email set';

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-4xl mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-slate-400 mt-1 text-sm md:text-base">Manage your account preferences and profile.</p>
      </header>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Home className="w-4 h-4" />
        <ChevronRight className="w-3 h-3" />
        <span className="text-white">Settings</span>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* Profile Section */}
        <Card>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 border-b border-slate-800 pb-6">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-xl md:text-2xl text-white font-bold">
                    {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h2 className="text-base md:text-lg font-bold text-white">{displayName}</h2>
                    <p className="text-slate-400 text-sm">{displayEmail}</p>
                    {role && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20">
                        {role}
                      </span>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <Input 
                  label="First Name" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                />
                <Input 
                  label="Last Name" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                />
                <Input 
                  label="Email" 
                  value={displayEmail} 
                  disabled 
                  className="opacity-60 cursor-not-allowed" 
                />
                <Input 
                  label="Username" 
                  value={user?.username || ''} 
                  disabled 
                  className="opacity-60 cursor-not-allowed" 
                />
                <Input 
                  label="Role" 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g., Senior Risk Officer"
                />
                <Input 
                  label="Department" 
                  value={department} 
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g., Credit Risk"
                />
            </div>
            <div className="mt-4 md:mt-6 flex items-center justify-end gap-3">
                {saveSuccess && (
                  <span className="text-emerald-400 text-sm">✓ Saved successfully</span>
                )}
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-slate-900 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                </button>
            </div>
        </Card>

        {/* Notifications */}
        <Card>
            <div className="flex items-center gap-3 mb-4 md:mb-6">
                <Bell className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base md:text-lg font-semibold text-white">Notifications</h3>
            </div>
            <div className="space-y-3 md:space-y-4">
                {['Covenant Breach Alerts', 'Weekly Digest', 'New Loan Assignments'].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                        <span className="text-slate-300 text-sm md:text-base">{item}</span>
                        <div className="relative inline-block w-10 h-6 transition duration-200 ease-in-out bg-emerald-500 rounded-full cursor-pointer flex-shrink-0">
                            <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full translate-x-4"></span>
                        </div>
                    </div>
                ))}
            </div>
        </Card>

         {/* Security */}
         <Card>
            <div className="flex items-center gap-3 mb-4 md:mb-6">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base md:text-lg font-semibold text-white">Security</h3>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                    <div className="text-white font-medium text-sm md:text-base">Two-Factor Authentication</div>
                    <div className="text-xs md:text-sm text-slate-400">Add an extra layer of security to your account.</div>
                </div>
                <button className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">Enable</button>
            </div>
            <button 
                onClick={onLogout}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-colors"
            >
                <LogOut className="w-4 h-4" /> Sign Out
            </button>
        </Card>
      </div>
    </div>
  );
};

export default SettingsView;
