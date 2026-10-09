import React, { useState, useRef } from 'react';
import { SoundCategory, SoundItem } from '../../types/sound';
import { storageService } from '../../services/storageService';
import { SoundIcon } from '../icons/IconLibrary';
import { IconPickerModal } from '../icons/IconPickerModal';
import { 
  X, 
  Upload, 
  FileAudio, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Repeat, 
  Zap, 
  Folder,
  Sparkles,
  Layers
} from 'lucide-react';

interface FileUploadItem {
  id: string;
  file: File;
  title: string;
  categoryId: string;
  icon: string;
  loop: boolean;
  stopCategoryOthers: boolean;
  progress: number;
  status: 'idle' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

interface BulkUploadModalProps {
  isOpen: boolean;
  categories: SoundCategory[];
  currentCategoryId?: string;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  categories,
  currentCategoryId,
  onClose,
  onUploadSuccess,
}) => {
  const [queue, setQueue] = useState<FileUploadItem[]>([]);
  const [batchCategory, setBatchCategory] = useState<string>(
    currentCategoryId && currentCategoryId !== 'all' ? currentCategoryId : (categories[0]?.id || '')
  );
  const [batchIcon, setBatchIcon] = useState<string>('Volume2');
  const [batchLoop, setBatchLoop] = useState<boolean>(false);
  const [batchStopCategoryOthers, setBatchStopCategoryOthers] = useState<boolean>(true);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: FileUploadItem[] = Array.from(files).map((file, idx) => {
      // Guess clean title from file name
      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .trim();

      // Guess icon based on filename keywords
      let guessedIcon = batchIcon;
      const lower = cleanTitle.toLowerCase();
      if (lower.includes('rain') || lower.includes('storm')) guessedIcon = 'CloudRain';
      else if (lower.includes('sword') || lower.includes('slash') || lower.includes('attack')) guessedIcon = 'Sword';
      else if (lower.includes('shield') || lower.includes('block')) guessedIcon = 'Shield';
      else if (lower.includes('fire') || lower.includes('burn')) guessedIcon = 'Flame';
      else if (lower.includes('spell') || lower.includes('magic') || lower.includes('cast')) guessedIcon = 'Sparkles';
      else if (lower.includes('thunder') || lower.includes('lightning') || lower.includes('zap')) guessedIcon = 'Zap';
      else if (lower.includes('music') || lower.includes('theme') || lower.includes('bgm')) guessedIcon = 'Music';
      else if (lower.includes('tavern') || lower.includes('inn') || lower.includes('beer')) guessedIcon = 'Beer';

      return {
        id: `upload_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        file,
        title: cleanTitle,
        categoryId: batchCategory || categories[0]?.id || '',
        icon: guessedIcon,
        loop: batchLoop,
        stopCategoryOthers: batchStopCategoryOthers,
        progress: 0,
        status: 'idle',
      };
    });

    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeItem = (id: string) => {
    if (isUploading) return;
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<FileUploadItem>) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const applyBatchSettingsToAll = () => {
    setQueue((prev) =>
      prev.map((item) => ({
        ...item,
        categoryId: batchCategory,
        icon: batchIcon,
        loop: batchLoop,
        stopCategoryOthers: batchStopCategoryOthers,
      }))
    );
  };

  const handleStartUpload = async () => {
    if (queue.length === 0 || isUploading) return;

    setIsUploading(true);

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'completed') continue;

      updateItem(item.id, { status: 'uploading', progress: 5 });

      try {
        await storageService.uploadAudioFile(
          item.file,
          {
            title: item.title,
            categoryId: item.categoryId,
            icon: item.icon,
            loop: item.loop,
            stopCategoryOthers: item.stopCategoryOthers,
            volume: 1.0,
          },
          (prog) => {
            updateItem(item.id, { progress: Math.round(prog) });
          }
        );

        updateItem(item.id, { status: 'completed', progress: 100 });
      } catch (err: any) {
        console.error('Failed to upload file:', item.file.name, err);
        updateItem(item.id, {
          status: 'error',
          errorMessage: err?.message || 'Upload failed',
        });
      }
    }

    setIsUploading(false);
    if (onUploadSuccess) onUploadSuccess();
  };

  const allCompleted = queue.length > 0 && queue.every((i) => i.status === 'completed');

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-[#161b22] border border-[#30363d] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d]">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                <Upload className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-semibold text-lg text-white">Bulk Audio Upload</h3>
                <p className="text-xs text-gray-400">Supports MP3, WAV, FLAC, OGG, AAC, M4A, MP4</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isUploading}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#21262d] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            
            {/* Drag & Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-purple-500 bg-purple-500/10 scale-[0.99]'
                  : 'border-[#30363d] hover:border-purple-500/60 bg-[#0d1117] hover:bg-[#12161f]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="audio/*, video/mp4, .mp3, .wav, .ogg, .flac, .m4a, .aac, .webm"
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
              <FileAudio className="w-10 h-10 mx-auto text-purple-400 mb-2 opacity-80" />
              <p className="text-sm font-semibold text-gray-200">
                Click to browse or drag & drop audio files here
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Select multiple files at once. All modern audio formats supported.
              </p>
            </div>

            {/* Batch Settings Bar */}
            {queue.length > 0 && (
              <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center space-x-1.5">
                    <Layers className="w-4 h-4" />
                    <span>Batch Defaults for Selection</span>
                  </span>
                  <button
                    type="button"
                    onClick={applyBatchSettingsToAll}
                    className="text-xs text-purple-400 hover:text-purple-300 font-medium hover:underline"
                  >
                    Apply to all {queue.length} files
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  {/* Category */}
                  <div>
                    <label className="block text-gray-400 mb-1">Category</label>
                    <select
                      value={batchCategory}
                      onChange={(e) => setBatchCategory(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg text-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Icon */}
                  <div>
                    <label className="block text-gray-400 mb-1">Default Icon</label>
                    <button
                      type="button"
                      onClick={() => setIsIconPickerOpen(true)}
                      className="w-full px-2 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg text-white flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-1.5">
                        <SoundIcon name={batchIcon} className="w-4 h-4 text-purple-400" />
                        <span className="truncate">{batchIcon}</span>
                      </div>
                      <Sparkles className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>

                  {/* Loop */}
                  <div className="flex items-end">
                    <label className="w-full flex items-center space-x-2 px-2.5 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={batchLoop}
                        onChange={(e) => setBatchLoop(e.target.checked)}
                        className="accent-purple-600 rounded"
                      />
                      <Repeat className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-gray-300">Loop</span>
                    </label>
                  </div>

                  {/* Category Solo */}
                  <div className="flex items-end">
                    <label className="w-full flex items-center space-x-2 px-2.5 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={batchStopCategoryOthers}
                        onChange={(e) => setBatchStopCategoryOthers(e.target.checked)}
                        className="accent-amber-600 rounded"
                      />
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-gray-300">Solo Cat.</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Queue List */}
            {queue.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-400 px-1">
                  <span>Queued Audio Files ({queue.length})</span>
                  <span>{(queue.reduce((acc, i) => acc + i.file.size, 0) / (1024 * 1024)).toFixed(1)} MB total</span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-center space-x-3 text-sm"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#161b22] flex items-center justify-center flex-shrink-0 text-purple-400">
                        <SoundIcon name={item.icon} className="w-4 h-4" />
                      </div>

                      {/* Title input */}
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={item.title}
                          disabled={isUploading || item.status === 'completed'}
                          onChange={(e) => updateItem(item.id, { title: e.target.value })}
                          className="w-full bg-transparent border-b border-transparent focus:border-purple-500 text-xs sm:text-sm text-gray-200 focus:outline-none"
                        />
                        <div className="text-[10px] text-gray-400 flex items-center space-x-2 mt-0.5">
                          <span>{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                          <span>•</span>
                          <span>{categories.find(c => c.id === item.categoryId)?.name || 'Category'}</span>
                          {item.loop && <span>• Loop</span>}
                          {item.stopCategoryOthers && <span>• Solo</span>}
                        </div>

                        {/* Progress Bar */}
                        {(item.status === 'uploading' || item.status === 'completed') && (
                          <div className="w-full bg-[#21262d] h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className={`h-full transition-all duration-200 ${
                                item.status === 'completed' ? 'bg-emerald-500' : 'bg-purple-600'
                              }`}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Status / Remove */}
                      <div className="flex items-center space-x-2">
                        {item.status === 'completed' && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        )}
                        {item.status === 'error' && (
                          <span title={item.errorMessage}>
                            <AlertCircle className="w-5 h-5 text-rose-500" />
                          </span>
                        )}
                        {item.status === 'idle' && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-gray-400 hover:text-rose-400 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 bg-[#0d1117] border-t border-[#30363d] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-xl text-xs font-medium transition-colors"
            >
              {allCompleted ? 'Close' : 'Cancel'}
            </button>

            {queue.length > 0 && !allCompleted && (
              <button
                type="button"
                onClick={handleStartUpload}
                disabled={isUploading}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-purple-600/30 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {isUploading
                    ? `Uploading (${queue.filter(q => q.status === 'completed').length}/${queue.length})...`
                    : `Upload All (${queue.length} files)`}
                </span>
              </button>
            )}

            {allCompleted && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-emerald-600/30"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Done!</span>
              </button>
            )}
          </div>

        </div>
      </div>

      <IconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        selectedIcon={batchIcon}
        onSelectIcon={(newIcon) => setBatchIcon(newIcon)}
      />
    </>
  );
};
