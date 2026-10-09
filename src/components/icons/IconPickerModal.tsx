import React, { useState, useMemo } from 'react';
import { ICON_CATEGORIES, ICON_MAP, SoundIcon } from './IconLibrary';
import { X, Search } from 'lucide-react';

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
}

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  isOpen,
  onClose,
  selectedIcon,
  onSelectIcon,
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('All');

  const filteredIcons = useMemo(() => {
    const q = search.trim().toLowerCase();
    
    let list: { name: string; label: string; category: string }[] = [];
    ICON_CATEGORIES.forEach(cat => {
      cat.icons.forEach(icon => {
        list.push({ ...icon, category: cat.name });
      });
    });

    if (activeTab !== 'All') {
      list = list.filter(item => item.category === activeTab);
    }

    if (q) {
      list = list.filter(item => 
        item.name.toLowerCase().includes(q) || 
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [search, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161b22] border border-[#30363d] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg">
              <SoundIcon name={selectedIcon || 'Sparkles'} className="w-5 h-5" />
            </span>
            <h3 className="font-semibold text-lg text-white">Choose Icon</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#30363d]">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search icons (e.g. sword, thunder, beer)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
              autoFocus
            />
          </div>

          {/* Category Tabs */}
          <div className="flex space-x-1.5 overflow-x-auto pt-2 pb-1 text-xs no-scrollbar">
            {['All', ...ICON_CATEGORIES.map(c => c.name)].map(tabName => (
              <button
                key={tabName}
                onClick={() => setActiveTab(tabName)}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-medium transition-all ${
                  activeTab === tabName
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-[#21262d] text-gray-400 hover:text-gray-200'
                }`}
              >
                {tabName}
              </button>
            ))}
          </div>
        </div>

        {/* Icons Grid */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-4 sm:grid-cols-6 gap-2.5">
          {filteredIcons.map(({ name, label }) => {
            const isSelected = selectedIcon === name;
            return (
              <button
                key={name}
                onClick={() => {
                  onSelectIcon(name);
                  onClose();
                }}
                title={label}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center group ${
                  isSelected
                    ? 'bg-purple-600/30 border-purple-500 text-purple-300 ring-2 ring-purple-500/50'
                    : 'bg-[#21262d] border-[#30363d]/60 text-gray-300 hover:border-purple-500/60 hover:bg-[#282f3a]'
                }`}
              >
                <SoundIcon name={name} className="w-6 h-6 mb-1 text-gray-200 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] text-gray-400 line-clamp-1 w-full group-hover:text-gray-200">
                  {label}
                </span>
              </button>
            );
          })}

          {filteredIcons.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-500 text-sm">
              No matching icons found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#0d1117] border-t border-[#30363d] flex justify-between items-center text-xs text-gray-400">
          <span>{filteredIcons.length} icons available</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-200 rounded-lg"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
