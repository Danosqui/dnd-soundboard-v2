import React, { useState } from 'react';
import { SoundCategory, SoundItem } from '../../types/sound';
import { storageService } from '../../services/storageService';
import { SoundIcon } from '../icons/IconLibrary';
import { IconPickerModal } from '../icons/IconPickerModal';
import { X, Plus, Trash2, Edit2, Check, Sparkles, FolderPlus } from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  categories: SoundCategory[];
  sounds: SoundItem[];
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  categories,
  sounds,
  onClose,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('FolderPlus');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [activeIconTarget, setActiveIconTarget] = useState<'new' | string>('new');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const newCat: SoundCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newCategoryName.trim(),
      icon: newCategoryIcon,
      color: 'purple',
      order: categories.length,
      createdAt: Date.now(),
    };

    await storageService.saveCategory(newCat);
    setNewCategoryName('');
    setNewCategoryIcon('FolderPlus');
  };

  const handleUpdateCategory = async (cat: SoundCategory) => {
    if (!editingName.trim()) return;
    await storageService.saveCategory({
      ...cat,
      name: editingName.trim(),
    });
    setEditingId(null);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (deleteConfirmId !== categoryId) {
      setDeleteConfirmId(categoryId);
      return;
    }
    await storageService.deleteCategory(categoryId);
    setDeleteConfirmId(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-[#161b22] border border-[#30363d] w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d]">
            <h3 className="font-semibold text-lg text-white flex items-center space-x-2">
              <span>Manage Categories</span>
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#21262d] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
            
            {/* Create new category form */}
            <form onSubmit={handleAddCategory} className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                Add New Category
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveIconTarget('new');
                    setIsIconPickerOpen(true);
                  }}
                  className="p-2.5 bg-[#161b22] border border-[#30363d] hover:border-purple-500 rounded-xl text-purple-400 flex items-center justify-center flex-shrink-0"
                  title="Choose Icon"
                >
                  <SoundIcon name={newCategoryIcon} className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  placeholder="e.g. Boss Fights, Weather, Traps..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />

                <button
                  type="submit"
                  disabled={!newCategoryName.trim()}
                  className="p-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                  title="Add Category"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Existing categories list */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block px-1">
                Your Categories ({categories.length})
              </span>

              <div className="space-y-1.5">
                {categories.map((cat) => {
                  const soundCount = sounds.filter(s => s.categoryId === cat.id).length;
                  const isEditing = editingId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-center justify-between space-x-2 text-sm"
                    >
                      {/* Icon */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveIconTarget(cat.id);
                          setIsIconPickerOpen(true);
                        }}
                        className="p-1.5 bg-[#161b22] border border-[#30363d] hover:border-purple-500 rounded-lg text-purple-400 flex-shrink-0"
                        title="Change icon"
                      >
                        <SoundIcon name={cat.icon || 'FolderPlus'} className="w-4 h-4" />
                      </button>

                      {/* Name or Edit input */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="w-full px-2 py-1 bg-[#161b22] border border-purple-500 rounded text-xs text-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateCategory(cat)}
                              className="p-1 text-emerald-400 hover:text-emerald-300"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-white truncate text-xs sm:text-sm">
                              {cat.name}
                            </span>
                            <span className="text-[10px] bg-[#21262d] text-gray-400 px-1.5 py-0.5 rounded-full">
                              {soundCount} sounds
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1">
                        {!isEditing && (
                          <button
                            onClick={() => {
                              setEditingId(cat.id);
                              setEditingName(cat.name);
                            }}
                            className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#21262d]"
                            title="Rename"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className={`p-1.5 rounded transition-colors ${
                            deleteConfirmId === cat.id
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'text-gray-400 hover:text-rose-400 hover:bg-[#21262d]'
                          }`}
                          title={deleteConfirmId === cat.id ? 'Click again to delete!' : 'Delete category'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="px-5 py-3 bg-[#0d1117] border-t border-[#30363d] flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-200 rounded-xl text-xs font-semibold"
            >
              Done
            </button>
          </div>

        </div>
      </div>

      <IconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        selectedIcon={activeIconTarget === 'new' ? newCategoryIcon : (categories.find(c => c.id === activeIconTarget)?.icon || 'FolderPlus')}
        onSelectIcon={async (iconName) => {
          if (activeIconTarget === 'new') {
            setNewCategoryIcon(iconName);
          } else {
            const cat = categories.find(c => c.id === activeIconTarget);
            if (cat) {
              await storageService.saveCategory({ ...cat, icon: iconName });
            }
          }
        }}
      />
    </>
  );
};
