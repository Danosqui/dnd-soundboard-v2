import React, { useState } from 'react';
import { 
  getStoredFirebaseConfig, 
  saveStoredFirebaseConfig, 
  initFirebase, 
  getFirebaseInstances,
  FirebaseConfigParams 
} from '../../services/firebase';
import { AppSettings } from '../../types/sound';
import { storageService } from '../../services/storageService';
import { 
  X, 
  Cloud, 
  KeyRound, 
  ShieldCheck, 
  SlidersHorizontal, 
  Copy, 
  Check, 
  AlertTriangle, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onFirebaseConfigChanged: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
  onFirebaseConfigChanged,
}) => {
  const currentFb = getStoredFirebaseConfig();
  const [apiKey, setApiKey] = useState(currentFb?.apiKey || '');
  const [projectId, setProjectId] = useState(currentFb?.projectId || '');
  const [storageBucket, setStorageBucket] = useState(currentFb?.storageBucket || '');
  const [appId, setAppId] = useState(currentFb?.appId || '');
  const [jsonConfigInput, setJsonConfigInput] = useState('');
  
  const [pinEnabled, setPinEnabled] = useState(!!settings.masterPin);
  const [pinCode, setPinCode] = useState(settings.masterPin || '1234');
  const [isCopiedRules, setIsCopiedRules] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const { isConfigured } = getFirebaseInstances();

  const handlePasteConfigSnippet = () => {
    try {
      // Allow pasting the JS snippet `const firebaseConfig = { ... }` or raw JSON
      const match = jsonConfigInput.match(/\{[\s\S]*\}/);
      if (match) {
        // Replace unquoted keys if necessary
        const jsonStr = match[0]
          .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
          .replace(/'/g, '"');
        const parsed = JSON.parse(jsonStr);
        if (parsed.apiKey) setApiKey(parsed.apiKey);
        if (parsed.projectId) setProjectId(parsed.projectId);
        if (parsed.storageBucket) setStorageBucket(parsed.storageBucket);
        if (parsed.appId) setAppId(parsed.appId);
        setSaveStatus('Config parsed successfully! Click Save to apply.');
      }
    } catch (e) {
      setSaveStatus('Could not parse config snippet. Try entering fields manually.');
    }
  };

  const handleSaveFirebase = () => {
    if (!apiKey.trim() || !projectId.trim()) {
      saveStoredFirebaseConfig(null);
      initFirebase(null);
      onFirebaseConfigChanged();
      setSaveStatus('Firebase config cleared. Operating in Local Mode.');
      return;
    }

    const newConf: FirebaseConfigParams = {
      apiKey: apiKey.trim(),
      authDomain: `${projectId.trim()}.firebaseapp.com`,
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: '',
      appId: appId.trim(),
    };

    saveStoredFirebaseConfig(newConf);
    const success = initFirebase(newConf);
    onFirebaseConfigChanged();

    if (success) {
      setSaveStatus('Firebase connected! Real-time multi-device cloud sync enabled.');
    } else {
      setSaveStatus('Failed to connect. Please check your credentials.');
    }
  };

  const handleSavePin = () => {
    const updated = {
      ...settings,
      masterPin: pinEnabled ? pinCode : undefined,
    };
    storageService.saveSettings(updated);
    onUpdateSettings(updated);
  };

  const copyFirestoreRules = () => {
    const rules = `// Firestore Security Rules (Open for personal soundboard):
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}

// Storage Security Rules:
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}`;
    navigator.clipboard.writeText(rules);
    setIsCopiedRules(true);
    setTimeout(() => setIsCopiedRules(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161b22] border border-[#30363d] w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d]">
          <h3 className="font-semibold text-lg text-white flex items-center space-x-2">
            <Cloud className="w-5 h-5 text-purple-400" />
            <span>App Settings & Cloud Sync</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          
          {/* Cloud Sync Status Card */}
          <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center space-x-1.5">
                <Cloud className="w-4 h-4" />
                <span>Cloud Storage Status</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center space-x-1 ${
                isConfigured 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{isConfigured ? 'Connected to Firebase' : 'Local / Offline Mode'}</span>
              </span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              {isConfigured 
                ? 'Your sounds and categories are securely synced to Firebase Cloud. Upload on your PC and play in real-time from your phone 24/7!'
                : 'Currently running locally in IndexedDB. To play sounds from your phone that you uploaded from your PC, enter your free Firebase project credentials below.'}
            </p>

            {/* Paste Snippet helper */}
            <div className="space-y-2 pt-2 border-t border-[#30363d]">
              <label className="block text-xs font-medium text-gray-300">
                Quick Paste from Firebase Console:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste const firebaseConfig = { ... } here"
                  value={jsonConfigInput}
                  onChange={(e) => setJsonConfigInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={handlePasteConfigSnippet}
                  className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-xs text-purple-300 rounded-lg whitespace-nowrap font-medium"
                >
                  Auto-Fill
                </button>
              </div>
            </div>

            {/* Individual Credential Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">API Key</label>
                <input
                  type="text"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Project ID</label>
                <input
                  type="text"
                  placeholder="dnd-soundboard-1234"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Storage Bucket</label>
                <input
                  type="text"
                  placeholder="project-id.appspot.com"
                  value={storageBucket}
                  onChange={(e) => setStorageBucket(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">App ID</label>
                <input
                  type="text"
                  placeholder="1:123456789:web:abcdef..."
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg text-xs text-white"
                />
              </div>
            </div>

            {saveStatus && (
              <p className="text-xs text-purple-300 font-medium pt-1">
                {saveStatus}
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={copyFirestoreRules}
                className="text-xs text-gray-400 hover:text-white flex items-center space-x-1"
                title="Copy ready-to-paste Firebase Security Rules"
              >
                {isCopiedRules ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopiedRules ? 'Rules copied!' : 'Copy free Security Rules'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveFirebase}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold"
              >
                Save Firebase Config
              </button>
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
