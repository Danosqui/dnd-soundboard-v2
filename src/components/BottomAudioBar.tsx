import React, { useState } from 'react';
import { SoundItem, SoundPlaybackState } from '../types/sound';
import { audioEngine } from '../services/audioEngine';
import { SoundIcon } from './icons/IconLibrary';
import { 
  Square, 
  Volume2, 
  VolumeX, 
  Sliders, 
  ChevronUp, 
  ChevronDown, 
  Repeat, 
  X, 
  Zap,
  SlidersHorizontal
} from 'lucide-react';

interface BottomAudioBarProps {
  sounds: SoundItem[];
  playbackStates: Record<string, SoundPlaybackState>;
  masterVolume: number;
  isNormalized: boolean;
  onMasterVolumeChange: (vol: number) => void;
  onToggleNormalization: (enabled: boolean) => void;
}

export const BottomAudioBar: React.FC<BottomAudioBarProps> = ({
  sounds,
  playbackStates,
  masterVolume,
  isNormalized,
  onMasterVolumeChange,
  onToggleNormalization,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(masterVolume);

  // Filter sounds currently playing
  const playingSounds = sounds.filter(s => playbackStates[s.id]?.isPlaying);
  const activeCount = playingSounds.length;

  const handleStopAll = () => {
    audioEngine.stopAll();
  };

  const handleStopIndividual = (soundId: string) => {
    audioEngine.stop(soundId);
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      onMasterVolumeChange(previousVolume > 0 ? previousVolume : 0.8);
    } else {
      setPreviousVolume(masterVolume);
      setIsMuted(true);
      onMasterVolumeChange(0);
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-[#161b22]/95 backdrop-blur-md border-t border-[#30363d] shadow-2xl safe-bottom">
      
      {/* Expanded Active Tracks Drawer */}
      {isExpanded && activeCount > 0 && (
        <div className="border-b border-[#30363d] p-3 max-h-48 overflow-y-auto space-y-2 bg-[#0d1117]/90 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-gray-400 px-1 font-semibold uppercase tracking-wider">
            <span>Currently Active Channels ({activeCount})</span>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-white"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {playingSounds.map((sound) => {
              const state = playbackStates[sound.id];
              const progress = state && state.duration > 0
                ? (state.currentTime / state.duration) * 100
                : 0;

              return (
                <div
                  key={sound.id}
                  className="bg-[#161b22] border border-purple-500/40 rounded-xl p-2.5 flex items-center justify-between space-x-2 text-xs shadow-sm"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="p-1.5 bg-purple-600/30 text-purple-300 rounded-lg flex-shrink-0">
                      <SoundIcon name={sound.icon} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">{sound.title}</div>
                      <div className="text-[10px] text-purple-400 flex items-center space-x-1">
                        {sound.loop && <span className="flex items-center"><Repeat className="w-2.5 h-2.5 mr-0.5" />Loop</span>}
                        <span>•</span>
                        <span>{Math.floor(state?.currentTime || 0)}s</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStopIndividual(sound.id)}
                    className="p-1.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-colors flex-shrink-0"
                    title="Stop this track"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Bottom Control Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Panic Button: STOP ALL */}
        <button
          onClick={handleStopAll}
          className={`flex items-center justify-center space-x-2 px-3.5 sm:px-5 py-2.5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md active:scale-95 ${
            activeCount > 0
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/40 animate-pulse-subtle'
              : 'bg-[#21262d] text-gray-400 hover:text-gray-200 border border-[#30363d]'
          }`}
          title="Panic Button: Stop all playing sounds instantly"
        >
          <Square className="w-4 h-4 fill-current" />
          <span className="whitespace-nowrap">STOP ALL</span>
          {activeCount > 0 && (
            <span className="bg-red-900/80 text-red-200 px-1.5 py-0.5 rounded-full text-[11px] font-mono">
              {activeCount}
            </span>
          )}
        </button>

        {/* Center: Active Track Pill & Expand Button */}
        {activeCount > 0 ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-950/40 border border-purple-500/40 rounded-xl text-purple-300 hover:bg-purple-900/50 transition-colors text-xs font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span className="hidden sm:inline">Playing</span>
            <span className="font-bold">{activeCount} {activeCount === 1 ? 'sound' : 'sounds'}</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 ml-1" /> : <ChevronUp className="w-3.5 h-3.5 ml-1" />}
          </button>
        ) : (
          <div className="hidden sm:flex items-center text-xs text-gray-400">
            <span>Ready for combat & tavern tunes</span>
          </div>
        )}

        {/* Right side: Normalization Toggle & Master Volume */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          
          {/* Normalization Toggle */}
          <button
            onClick={() => onToggleNormalization(!isNormalized)}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              isNormalized
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                : 'bg-[#21262d] text-gray-400 border-[#30363d] hover:text-gray-300'
            }`}
            title={
              isNormalized
                ? 'Audio Normalization is ON: Loudness is leveled automatically'
                : 'Audio Normalization is OFF: Raw original sound volume'
            }
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Normalize</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isNormalized ? 'bg-purple-400' : 'bg-gray-500'}`} />
          </button>

          {/* Master Volume Slider */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              onClick={handleMuteToggle}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#21262d] transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || masterVolume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-gray-300" />
              )}
            </button>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={isMuted ? 0 : masterVolume}
              onChange={(e) => {
                if (isMuted) setIsMuted(false);
                onMasterVolumeChange(parseFloat(e.target.value));
              }}
              className="w-16 sm:w-24 md:w-32 accent-purple-500 h-1.5 bg-[#21262d] rounded-lg cursor-pointer"
              title={`Master Volume: ${Math.round((isMuted ? 0 : masterVolume) * 100)}%`}
            />
            
            <span className="text-[11px] font-mono text-gray-400 w-8 text-right hidden sm:inline">
              {Math.round((isMuted ? 0 : masterVolume) * 100)}%
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
