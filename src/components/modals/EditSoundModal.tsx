import React, { useState, useEffect } from 'react';
import { SoundItem, SoundCategory } from '../../types/sound';
import { SoundIcon } from '../icons/IconLibrary';
import { IconPickerModal } from '../icons/IconPickerModal';
import { audioEngine } from '../../services/audioEngine';
import { 
  X, 
  Trash2, 
  Repeat, 
  Zap, 
  Volume2, 
  Folder, 
  Save, 
  Sparkles 
} from 'lucide-react';

interface EditSoundModalProps {
  isOpen: boolean;
  sound: SoundItem | null;
  categories: SoundCategory[];
  onClose: () => void;
  onSave: (updatedSound: SoundItem) => Promise<void>;
  onDelete: (sound: SoundItem) => Promise<void>;
}

export const EditSoundModal: React.FC<EditSoundModalProps> = ({
  isOpen,
  sound,
  categories,
  onClose,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [icon, setIcon] = useState('Volume2');
  const [loop, setLoop] = useState(false);
  const [stopCategoryOthers, setStopCategoryOthers] = useState(true);
  const [volume, setVolume] = useState(1.0);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (sound) {
      setTitle(sound.title);
      setCategoryId(sound.categoryId);
      setIcon(sound.icon || 'Volume2');
      setLoop(sound.loop);
      setStopCategoryOthers(sound.stopCategoryOthers);
      setVolume(sound.volume ?? 1.0);
      setIsDeleting(false);
    }
  }, [sound]);

  if (!isOpen || !sound) return null;

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    // Real-time volume preview if playing!
    audioEngine.setSoundVolume(sound.id, newVol);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        ...sound,
        title: title.trim(),
        categoryId,
        icon,
        loop,
        stopCategoryOthers,
        volume,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save sound:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isDeleting) {
      setIsDeleting(true);
      return;
    }
    // Already confirmed
    await onDelete(sound);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-[#161b22] border border-[#30363d] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d]">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg">
                <SoundIcon name={icon} className="w-5 h-5" />
              </span>
              <h3 className="font-semibold text-lg text-white">Edit Sound</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#21262d] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
            
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Sound Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                required
              />
            </div>

            {/* Category & Icon Picker Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-sm appearance-none focus:outline-none focus:border-purple-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <Folder className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Icon Selector Button */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Icon
                </label>
                <button
                  type="button"
                  onClick={() => setIsIconPickerOpen(true)}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] hover:border-purple-500/80 rounded-xl text-white text-sm flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <SoundIcon name={icon} className="w-5 h-5 text-purple-400" />
                    <span className="truncate text-xs">{icon}</span>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Volume slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Individual Volume</span>
                </label>
                <span className="text-xs text-purple-400 font-mono">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-purple-500 h-1.5 bg-[#21262d] rounded-lg cursor-pointer"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-2 border-t border-[#30363d]">
              {/* Loop Infinitely */}
              <label className="flex items-center justify-between p-3 bg-[#0d1117] border border-[#30363d] rounded-xl cursor-pointer hover:border-purple-500/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${loop ? 'bg-purple-600/20 text-purple-400' : 'bg-[#21262d] text-gray-400'}`}>
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Infinitely Repeating Loop</div>
                    <div className="text-xs text-gray-400">Repeats automatically until tapped again</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => setLoop(e.target.checked)}
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </label>

              {/* Stop Category Others */}
              <label className="flex items-center justify-between p-3 bg-[#0d1117] border border-[#30363d] rounded-xl cursor-pointer hover:border-amber-500/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${stopCategoryOthers ? 'bg-amber-600/20 text-amber-400' : 'bg-[#21262d] text-gray-400'}`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Stop Other Sounds in Category</div>
                    <div className="text-xs text-gray-400">Switches tracks without overlapping</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={stopCategoryOthers}
                  onChange={(e) => setStopCategoryOthers(e.target.checked)}
                  className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
                />
              </label>
            </div>

            {/* Actions footer */}
            <div className="pt-3 border-t border-[#30363d] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDelete}
                className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                  isDeleting 
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Click again to confirm' : 'Delete'}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-purple-600/30 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>

          </form>

        </div>
      </div>

      <IconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        selectedIcon={icon}
        onSelectIcon={(newIcon) => setIcon(newIcon)}
      />
    </>
  );
};
