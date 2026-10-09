import React from 'react';
import { SoundCategory, SoundItem } from '../types/sound';
import { SoundIcon } from './icons/IconLibrary';
import { Settings, Plus, FolderPlus, Layers } from 'lucide-react';

interface CategoryTabBarProps {
  categories: SoundCategory[];
  sounds: SoundItem[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onOpenCategoryManager: () => void;
  onOpenBulkUpload: () => void;
}

export const CategoryTabBar: React.FC<CategoryTabBarProps> = ({
  categories,
  sounds,
  selectedCategoryId,
  onSelectCategory,
  onOpenCategoryManager,
  onOpenBulkUpload,
}) => {
  return (
    <div className="sticky top-0 z-30 bg-[#0d1117]/95 backdrop-blur-md border-b border-[#30363d] py-2 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        
        {/* Scrollable Categories List */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
          
          {/* "All" Tab */}
          <button
            onClick={() => onSelectCategory('all')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              selectedCategoryId === 'all'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-[#161b22] text-gray-300 hover:text-white hover:bg-[#21262d] border border-[#30363d]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Sounds</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              selectedCategoryId === 'all' ? 'bg-purple-800 text-purple-200' : 'bg-[#21262d] text-gray-400'
            }`}>
              {sounds.length}
            </span>
          </button>

          {/* Individual Category Tabs */}
          {categories.map((cat) => {
            const count = sounds.filter(s => s.categoryId === cat.id).length;
            const isSelected = selectedCategoryId === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-[#161b22] text-gray-300 hover:text-white hover:bg-[#21262d] border border-[#30363d]'
                }`}
              >
                <SoundIcon name={cat.icon || 'FolderPlus'} className="w-3.5 h-3.5" />
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-purple-800 text-purple-200' : 'bg-[#21262d] text-gray-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Manage & Add buttons */}
        <div className="flex items-center space-x-1 flex-shrink-0 border-l border-[#30363d] pl-2">
          <button
            onClick={onOpenCategoryManager}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#21262d] transition-colors"
            title="Manage Categories"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenBulkUpload}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            title="Upload audio files"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>

      </div>
    </div>
  );
};
