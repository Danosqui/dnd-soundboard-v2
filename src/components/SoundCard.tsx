import React from 'react';
import { SoundItem, SoundPlaybackState, SoundCategory } from '../types/sound';
import { SoundIcon } from './icons/IconLibrary';
import { Repeat, Zap, MoreVertical, Volume2 } from 'lucide-react';

interface SoundCardProps {
  sound: SoundItem;
  category?: SoundCategory;
  playbackState?: SoundPlaybackState;
  onPlayToggle: (sound: SoundItem) => void;
  onOpenSettings: (sound: SoundItem) => void;
}

export const SoundCard: React.FC<SoundCardProps> = React.memo(({
  sound,
  category,
  playbackState,
  onPlayToggle,
  onOpenSettings,
}) => {
  const isPlaying = !!playbackState?.isPlaying;
  const progressPercent = playbackState && playbackState.duration > 0
    ? Math.min(100, (playbackState.currentTime / playbackState.duration) * 100)
    : 0;

  // Format mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={`relative group rounded-2xl transition-all duration-150 select-none overflow-hidden flex flex-col justify-between ${
        isPlaying
          ? 'bg-[#1f242e] border-2 border-purple-500 shadow-lg shadow-purple-500/20 ring-1 ring-purple-400/30'
          : 'bg-[#161b22] border border-[#30363d] hover:border-[#484f58] hover:bg-[#1a2029] active:scale-[0.98]'
      }`}
      style={{
        minHeight: '84px',
      }}
    >
      {/* Background progress fill if playing */}
      {isPlaying && (
        <div
          className="absolute inset-y-0 left-0 bg-purple-600/15 transition-all duration-200 ease-linear pointer-events-none"
          style={{ width: `${progressPercent}%` }}
        />
      )}

      {/* Main interactive area for playing/stopping */}
      <button
        onClick={() => onPlayToggle(sound)}
        className="flex-1 w-full p-2.5 sm:p-3 text-left flex items-center space-x-3 cursor-pointer outline-none relative z-10"
        title={isPlaying ? `Tap to stop: ${sound.title}` : `Tap to play: ${sound.title}`}
      >
        {/* Sound Icon with pulse when playing */}
        <div
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform ${
            isPlaying
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 scale-105'
              : 'bg-[#21262d] text-gray-200 group-hover:bg-[#28303b] group-hover:text-purple-300'
          }`}
        >
          <SoundIcon name={sound.icon || 'Volume2'} className="w-6 h-6" />
        </div>

        {/* Title and indicators */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center space-x-1.5">
            <h4 className={`text-sm sm:text-base font-semibold truncate ${
              isPlaying ? 'text-purple-200' : 'text-gray-100'
            }`}>
              {sound.title}
            </h4>
          </div>

          {/* Subtitle / Status badges */}
          <div className="flex items-center space-x-2 mt-1">
            {/* Playing wave animation */}
            {isPlaying ? (
              <div className="flex items-center space-x-1 text-purple-400 text-xs font-mono">
                <span className="flex space-x-0.5 items-end h-3 w-3">
                  <span className="w-0.5 h-full origin-bottom bg-purple-400 rounded-full animate-sound-wave" style={{ animationDelay: '0ms' }} />
                  <span className="w-0.5 h-full origin-bottom bg-purple-400 rounded-full animate-sound-wave" style={{ animationDelay: '200ms' }} />
                  <span className="w-0.5 h-full origin-bottom bg-purple-400 rounded-full animate-sound-wave" style={{ animationDelay: '400ms' }} />
                </span>
                <span>
                  {formatTime(playbackState?.currentTime || 0)}
                  {playbackState?.duration ? ` / ${formatTime(playbackState.duration)}` : ''}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-gray-400 truncate">
                {category?.name || 'Sound'}
              </span>
            )}

            {/* Loop indicator */}
            {sound.loop && (
              <span
                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium ${
                  isPlaying
                    ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40'
                    : 'bg-[#21262d] text-purple-400/80 border border-purple-900/40'
                }`}
                title="Loops infinitely"
              >
                <Repeat className="w-2.5 h-2.5 mr-0.5" />
                Loop
              </span>
            )}

            {/* Category Solo indicator */}
            {sound.stopCategoryOthers && (
              <span
                className="inline-flex items-center px-1 py-0.2 rounded text-[10px] font-medium bg-[#21262d] text-amber-400/80 border border-amber-900/40"
                title="Stops other sounds in this category when played"
              >
                <Zap className="w-2.5 h-2.5 mr-0.5" />
                Solo
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Edit / Settings trigger button (placed absolutely in top-right corner) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenSettings(sound);
        }}
        className="absolute top-2 right-2 z-20 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#28303b] transition-colors"
        title="Edit sound properties"
        aria-label="Edit sound"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Thin playback progress bar at the bottom edge */}
      {isPlaying && (
        <div className="w-full bg-[#161b22] h-1 overflow-hidden relative z-10">
          <div
            className="bg-purple-500 h-full transition-all duration-200 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
});
