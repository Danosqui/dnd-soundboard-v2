import React, { useState, useEffect, useMemo } from 'react';
import { SoundItem, SoundCategory, SoundPlaybackState, AppSettings } from './types/sound';
import { storageService } from './services/storageService';
import { audioEngine } from './services/audioEngine';
import { initSupabase } from './services/supabase';
import { createDemoSoundBlob } from './utils/audioSynthesizer';

import { TopHeader } from './components/TopHeader';
import { CategoryTabBar } from './components/CategoryTabBar';
import { SoundCard } from './components/SoundCard';
import { BottomAudioBar } from './components/BottomAudioBar';

import { BulkUploadModal } from './components/modals/BulkUploadModal';
import { EditSoundModal } from './components/modals/EditSoundModal';
import { CategoryManagerModal } from './components/modals/CategoryManagerModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { PinLockModal } from './components/modals/PinLockModal';

import { Sparkles, Upload, Cloud, Plus, Wand2 } from 'lucide-react';

export const App: React.FC = () => {
  const [categories, setCategories] = useState<SoundCategory[]>([]);
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [playbackStates, setPlaybackStates] = useState<Record<string, SoundPlaybackState>>({});
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [settings, setSettings] = useState<AppSettings>(() => storageService.getSettings());
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const s = storageService.getSettings();
    if (!s.masterPin) return false;
    return sessionStorage.getItem('dnd_session_unlocked') !== 'true';
  });

  // Master volume and normalization state
  const [masterVolume, setMasterVolume] = useState<number>(settings.masterVolume ?? 1.0);
  const [isNormalized, setIsNormalized] = useState<boolean>(settings.normalizeAudio ?? true);

  // Modals state
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingSound, setEditingSound] = useState<SoundItem | null>(null);

  // Generating demo status
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);

  // Initialize Supabase and AudioEngine settings on mount
  useEffect(() => {
    initSupabase();
    audioEngine.setMasterVolume(masterVolume);
    audioEngine.setNormalization(isNormalized);

    const unsubAudio = audioEngine.subscribe((newStates) => {
      setPlaybackStates(newStates);
    });

    const unsubCategories = storageService.subscribeCategories((cats) => {
      setCategories(cats);
    });

    const unsubSounds = storageService.subscribeSounds((soundList) => {
      setSounds(soundList);
      audioEngine.preloadSounds(soundList);
    });

    return () => {
      unsubAudio();
      unsubCategories();
      unsubSounds();
    };
  }, []);

  // Update volume
  const handleMasterVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    audioEngine.setMasterVolume(vol);
    const updated = { ...settings, masterVolume: vol };
    setSettings(updated);
    storageService.saveSettings(updated);
  };

  // Update normalization
  const handleToggleNormalization = (norm: boolean) => {
    setIsNormalized(norm);
    audioEngine.setNormalization(norm);
    const updated = { ...settings, normalizeAudio: norm };
    setSettings(updated);
    storageService.saveSettings(updated);
  };

  // Sound triggering
  const handlePlayToggle = (sound: SoundItem) => {
    audioEngine.play(sound, sounds);
  };

  // Filter sounds by category and search
  const filteredSounds = useMemo(() => {
    let result = sounds;

    if (selectedCategoryId !== 'all') {
      result = result.filter(s => s.categoryId === selectedCategoryId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) ||
        categories.find(c => c.id === s.categoryId)?.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [sounds, selectedCategoryId, searchQuery, categories]);

  // Generate instant demo sounds for testing
  const handleGenerateDemoSounds = async () => {
    setIsGeneratingDemo(true);
    try {
      const combatCat = categories.find(c => c.name.toLowerCase().includes('combat'))?.id || categories[0]?.id || 'cat-combat';
      const magicCat = categories.find(c => c.name.toLowerCase().includes('magic') || c.name.toLowerCase().includes('spell'))?.id || categories[0]?.id || 'cat-spells';
      const ambienceCat = categories.find(c => c.name.toLowerCase().includes('ambience'))?.id || categories[0]?.id || 'cat-ambience';
      const tavernCat = categories.find(c => c.name.toLowerCase().includes('tavern'))?.id || categories[0]?.id || 'cat-tavern';

      const demoTracks: Array<{
        type: 'sword' | 'spell' | 'thunder' | 'drums' | 'tavern';
        title: string;
        categoryId: string;
        icon: string;
        loop: boolean;
        stopCategoryOthers: boolean;
      }> = [
        { type: 'sword', title: 'Sword Strike', categoryId: combatCat, icon: 'Sword', loop: false, stopCategoryOthers: false },
        { type: 'spell', title: 'Arcane Missiles', categoryId: magicCat, icon: 'Sparkles', loop: false, stopCategoryOthers: false },
        { type: 'thunder', title: 'Rolling Thunder', categoryId: ambienceCat, icon: 'CloudLightning', loop: false, stopCategoryOthers: false },
        { type: 'drums', title: 'War Drums (Loop)', categoryId: combatCat, icon: 'Flame', loop: true, stopCategoryOthers: true },
        { type: 'tavern', title: 'Tavern Lute (Loop)', categoryId: tavernCat, icon: 'Beer', loop: true, stopCategoryOthers: true },
      ];

      for (const track of demoTracks) {
        const blob = await createDemoSoundBlob(track.type);
        const file = new File([blob], `${track.title}.wav`, { type: 'audio/wav' });
        await storageService.uploadAudioFile(file, {
          title: track.title,
          categoryId: track.categoryId,
          icon: track.icon,
          loop: track.loop,
          stopCategoryOthers: track.stopCategoryOthers,
          volume: 1.0,
        });
      }
    } catch (err) {
      console.error('Failed to create demo sounds:', err);
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  const handleSoundSave = async (updated: SoundItem) => {
    await storageService.saveSound(updated);
  };

  const handleSoundDelete = async (sound: SoundItem) => {
    audioEngine.stop(sound.id);
    await storageService.deleteSound(sound);
  };

  const handleUnlock = () => {
    sessionStorage.setItem('dnd_session_unlocked', 'true');
    setIsLocked(false);
  };

  const handleLock = () => {
    sessionStorage.removeItem('dnd_session_unlocked');
    setIsLocked(true);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100 flex flex-col pb-28">
      
      {/* Top Header */}
      <TopHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenBulkUpload={() => setIsBulkUploadOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isPinActive={!!settings.masterPin}
        onLockSession={handleLock}
      />

      {/* Category Tab Bar */}
      <CategoryTabBar
        categories={categories}
        sounds={sounds}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
        onOpenBulkUpload={() => setIsBulkUploadOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        
        {/* If sounds exist: Render Grid */}
        {filteredSounds.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
            {filteredSounds.map((sound) => {
              const cat = categories.find(c => c.id === sound.categoryId);
              return (
                <SoundCard
                  key={sound.id}
                  sound={sound}
                  category={cat}
                  playbackState={playbackStates[sound.id]}
                  onPlayToggle={handlePlayToggle}
                  onOpenSettings={(s) => setEditingSound(s)}
                />
              );
            })}
          </div>
        ) : sounds.length > 0 ? (
          /* Filtered empty state */
          <div className="text-center py-16 px-4">
            <p className="text-gray-400 text-sm">No sounds match your search or filter.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryId('all');
              }}
              className="mt-3 px-4 py-1.5 bg-[#21262d] text-purple-400 hover:text-purple-300 rounded-xl text-xs font-medium"
            >
              Reset filters
            </button>
          </div>
        ) : (
          /* Initial Empty State */
          <div className="max-w-lg mx-auto text-center py-12 px-4 space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto shadow-lg shadow-purple-600/10">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Your Soundboard is Ready!
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Upload your audio files in bulk (MP3, WAV, FLAC, M4A, etc.) to store them in the cloud, or generate starter sample sounds to try it right away.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setIsBulkUploadOpen(true)}
                className="w-full sm:w-auto px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/30 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Bulk Upload Audio Files</span>
              </button>

              <button
                onClick={handleGenerateDemoSounds}
                disabled={isGeneratingDemo}
                className="w-full sm:w-auto px-5 py-3 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-purple-300 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
              >
                <Wand2 className="w-4 h-4 text-purple-400" />
                <span>{isGeneratingDemo ? 'Generating...' : 'Generate Demo Sounds'}</span>
              </button>
            </div>

            <div className="pt-4 border-t border-[#30363d] text-xs text-gray-500">
              <span>Cloud storage provider: </span>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-purple-400 hover:underline font-medium inline-flex items-center space-x-1"
              >
                <Cloud className="w-3 h-3 inline" />
                <span>Connect Free Cloud (Supabase)</span>
              </button>
            </div>

          </div>
        )}

      </main>

      {/* Sticky Bottom Audio Bar (with Panic STOP ALL button) */}
      <BottomAudioBar
        sounds={sounds}
        playbackStates={playbackStates}
        masterVolume={masterVolume}
        isNormalized={isNormalized}
        onMasterVolumeChange={handleMasterVolumeChange}
        onToggleNormalization={handleToggleNormalization}
      />

      {/* Modals */}
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        categories={categories}
        currentCategoryId={selectedCategoryId}
        onClose={() => setIsBulkUploadOpen(false)}
        onUploadSuccess={() => {
          storageService.subscribeSounds(setSounds);
          storageService.subscribeCategories(setCategories);
        }}
      />

      <EditSoundModal
        isOpen={!!editingSound}
        sound={editingSound}
        categories={categories}
        onClose={() => setEditingSound(null)}
        onSave={handleSoundSave}
        onDelete={handleSoundDelete}
      />

      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        categories={categories}
        sounds={sounds}
        onClose={() => setIsCategoryManagerOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={setSettings}
        onBackendConfigChanged={() => {
          // Re-subscribe with new config
          storageService.subscribeCategories(setCategories);
          storageService.subscribeSounds(setSounds);
        }}
      />

      {/* Session PIN Lock */}
      {isLocked && settings.masterPin && (
        <PinLockModal
          isOpen={isLocked}
          savedPin={settings.masterPin}
          onUnlocked={handleUnlock}
        />
      )}

    </div>
  );
};

export default App;
