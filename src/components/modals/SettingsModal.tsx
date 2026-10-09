import React, { useState } from 'react';
import { 
  getStoredSupabaseConfig, 
  saveStoredSupabaseConfig, 
  initSupabase, 
  getSupabaseInstances,
  SupabaseConfigParams 
} from '../../services/supabase';
import { AppSettings } from '../../types/sound';
import { storageService } from '../../services/storageService';
import { 
  X, 
  Cloud, 
  KeyRound, 
  Copy, 
  Check, 
  ExternalLink,
  Database,
  CheckCircle2,
  Trash2
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onBackendConfigChanged: () => void;
}

export const SETUP_SQL_SCRIPT = `-- 1. Create Sounds Table
create table if not exists public.sounds (
  id text primary key,
  title text not null,
  category_id text not null,
  file_url text not null,
  storage_path text not null,
  duration numeric default 0,
  loop boolean default false,
  stop_category_others boolean default true,
  icon text default 'Volume2',
  volume numeric default 1.0,
  "order" numeric default 0,
  created_at numeric default 0
);

-- 2. Create Categories Table
create table if not exists public.categories (
  id text primary key,
  name text not null,
  icon text default 'FolderPlus',
  color text default 'purple',
  "order" numeric default 0,
  created_at numeric default 0
);

-- 3. Enable Public Access for personal soundboard (Row Level Security disabled)
alter table public.sounds disable row level security;
alter table public.categories disable row level security;

-- 4. Enable Realtime on both tables
alter publication supabase_realtime add table public.sounds;
alter publication supabase_realtime add table public.categories;

-- 5. Create Public Audio Storage Bucket 'sounds'
insert into storage.buckets (id, name, public)
values ('sounds', 'sounds', true)
on conflict (id) do update set public = true;

-- 6. Storage Security Policies for sound uploads
create policy "Allow Public Select" on storage.objects for select using (bucket_id = 'sounds');
create policy "Allow Public Insert" on storage.objects for insert with check (bucket_id = 'sounds');
create policy "Allow Public Update" on storage.objects for update using (bucket_id = 'sounds');
create policy "Allow Public Delete" on storage.objects for delete using (bucket_id = 'sounds');
`;

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
  onBackendConfigChanged,
}) => {
  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig?.url || '');
  const [anonKey, setAnonKey] = useState(currentConfig?.anonKey || '');
  
  const [pinEnabled, setPinEnabled] = useState(!!settings.masterPin);
  const [pinCode, setPinCode] = useState(settings.masterPin || '1234');
  const [isCopiedSql, setIsCopiedSql] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const { isConfigured } = getSupabaseInstances();

  const handleSaveSupabase = () => {
    if (!url.trim() || !anonKey.trim()) {
      saveStoredSupabaseConfig(null);
      initSupabase(null);
      onBackendConfigChanged();
      setSaveStatus('Supabase credentials cleared. Operating in Local Mode.');
      return;
    }

    const newConf: SupabaseConfigParams = {
      url: url.trim(),
      anonKey: anonKey.trim(),
    };

    saveStoredSupabaseConfig(newConf);
    const success = initSupabase(newConf);
    onBackendConfigChanged();

    if (success) {
      setSaveStatus('Supabase connected! Real-time 24/7 cloud sync is active.');
    } else {
      setSaveStatus('Failed to connect. Please check your URL and anon key.');
    }
  };

  const handleClearConfig = () => {
    setUrl('');
    setAnonKey('');
    saveStoredSupabaseConfig(null);
    initSupabase(null);
    onBackendConfigChanged();
    setSaveStatus('Switched to Local Mode (sounds saved inside your browser).');
  };

  const handleSavePin = () => {
    const updated = {
      ...settings,
      masterPin: pinEnabled ? pinCode : undefined,
    };
    storageService.saveSettings(updated);
    onUpdateSettings(updated);
  };

  const copySql = () => {
    navigator.clipboard.writeText(SETUP_SQL_SCRIPT);
    setIsCopiedSql(true);
    setTimeout(() => setIsCopiedSql(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#161b22] border border-[#30363d] w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d]">
          <h3 className="font-semibold text-lg text-white flex items-center space-x-2">
            <Cloud className="w-5 h-5 text-purple-400" />
            <span>App Settings & Free Cloud Sync</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          
          {/* Supabase Free Cloud Storage Card */}
          <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center space-x-1.5">
                <Database className="w-4 h-4" />
                <span>Supabase Cloud (100% Free - No Credit Card)</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center space-x-1 ${
                isConfigured 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{isConfigured ? 'Connected to Supabase' : 'Local / Offline Mode'}</span>
              </span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Supabase gives you <strong>1 GB of free cloud audio storage</strong> and real-time database sync 24/7 without needing any credit card.
            </p>

            {/* Step-by-step Setup Helper */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 space-y-2.5 text-xs text-gray-300">
              <div className="font-semibold text-white flex items-center justify-between">
                <span>Setup Instructions (3 Quick Steps):</span>
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 flex items-center space-x-1 underline"
                >
                  <span>Open Supabase</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <ol className="list-decimal list-inside space-y-1.5 text-gray-300 text-[11px] leading-relaxed">
                <li>
                  Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 underline">supabase.com</a>, click <strong>Start your project</strong>, and create a free project.
                </li>
                <li>
                  In your Supabase project dashboard, click <strong>SQL Editor</strong> on the left menu, click <strong>New query</strong>, click the button below to copy the setup script, paste it, and click <strong>Run</strong>.
                </li>
                <li>
                  Go to <strong>Project Settings (gear icon) → API</strong>, copy your <strong>Project URL</strong> and <strong>anon public key</strong>, paste them below, and click <strong>Save</strong>!
                </li>
              </ol>

              {/* Copy SQL Button */}
              <button
                type="button"
                onClick={copySql}
                className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 rounded-lg text-purple-300 text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
              >
                {isCopiedSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{isCopiedSql ? 'SQL Script Copied to Clipboard!' : 'Copy 1-Click Database & Storage SQL Script'}</span>
              </button>
            </div>

            {/* Input credentials */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Project URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Project API Key (anon / public)
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>

            {saveStatus && (
              <p className="text-xs text-purple-300 font-medium">
                {saveStatus}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              {isConfigured && (
                <button
                  type="button"
                  onClick={handleClearConfig}
                  className="text-xs text-gray-400 hover:text-rose-400 flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Disconnect (Use Local)</span>
                </button>
              )}

              <div className="flex-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveSupabase}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/30 transition-all"
                >
                  Save Supabase Config
                </button>
              </div>
            </div>
          </div>

          {/* Master PIN / Table Security */}
          <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-2xl space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center space-x-1.5">
              <KeyRound className="w-4 h-4" />
              <span>Table Security & PIN</span>
            </span>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Require PIN to Access Soundboard</div>
                <div className="text-xs text-gray-400">Keeps players from accidentally triggering sound effects</div>
              </div>
              <input
                type="checkbox"
                checked={pinEnabled}
                onChange={(e) => {
                  setPinEnabled(e.target.checked);
                  const updated = {
                    ...settings,
                    masterPin: e.target.checked ? pinCode : undefined,
                  };
                  storageService.saveSettings(updated);
                  onUpdateSettings(updated);
                }}
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
              />
            </div>

            {pinEnabled && (
              <div className="flex items-center space-x-3 pt-2">
                <label className="text-xs text-gray-300 whitespace-nowrap">PIN Code:</label>
                <input
                  type="text"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  className="w-28 px-3 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg text-white text-center font-mono tracking-widest text-sm focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={handleSavePin}
                  className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-medium rounded-lg"
                >
                  Update PIN
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#0d1117] border-t border-[#30363d] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-200 rounded-xl text-xs font-semibold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
