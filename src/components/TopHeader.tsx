import React from 'react';
import { 
  Sparkles, 
  Search, 
  Upload, 
  Settings, 
  Lock, 
  Cloud, 
  Plus, 
  Volume2 
} from 'lucide-react';
import { getFirebaseInstances } from '../services/firebase';

interface TopHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenBulkUpload: () => void;
  onOpenSettings: () => void;
  isPinActive: boolean;
  onLockSession: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenBulkUpload,
  onOpenSettings,
  isPinActive,
  onLockSession,
}) => {
  const { isConfigured } = getFirebaseInstances();

  return (
    <header className="bg-[#161b22] border-b border-[#30363d] px-3 sm:px-6 py-2.5 sm:py-3 safe-top">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Logo / App Brand */}
        <div className="flex items-center space-x-2.5 flex-shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-sm shadow-purple-500/10">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center space-x-1.5">
              <span>Bard's Deck</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 hidden xs:inline">
                v2
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">
              D&D Campaign Soundboard
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xs sm:max-w-md relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search sounds..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#0d1117] border border-[#30363d] focus:border-purple-500 rounded-xl text-xs sm:text-sm text-gray-200 placeholder-gray-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          
          {/* Cloud Status indicator pill */}
          <button
            onClick={onOpenSettings}
            className={`hidden sm:flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
              isConfigured
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title={isConfigured ? 'Firebase Cloud Connected' : 'Local Mode: Click to configure Firebase'}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isConfigured ? 'Cloud Sync' : 'Local Mode'}</span>
          </button>

          {/* Bulk Upload Button */}
          <button
            onClick={onOpenBulkUpload}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/25 transition-all"
            title="Bulk Upload Audio Files"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bulk Upload</span>
          </button>

          {/* Lock Button (if PIN configured) */}
          {isPinActive && (
            <button
              onClick={onLockSession}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-[#21262d] transition-colors"
              title="Lock Session"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-[#21262d] transition-colors"
            title="Settings & Cloud Config"
          >
            <Settings className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
};
