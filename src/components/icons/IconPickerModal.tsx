import React, { useState, useMemo } from 'react';
import {
  ICON_CATEGORIES,
  SoundIcon,
  useGiIcons,
  getGiCategories,
  getLucideCatalog,
  getGiCatalog,
} from './IconLibrary';
import { X, Search, Loader2 } from 'lucide-react';

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
}

interface PickerItem {
  name: string;
  label: string;
  category: string;
}

const TAB_ALL = 'All';
const TAB_ALL_LUCIDE = 'All Lucide';
const TAB_ALL_GI = 'All Game Icons';

// Máximo de iconos renderizados a la vez (hay +5000 en total, no se pueden dibujar todos juntos)
const MAX_RENDER = 300;

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  isOpen,
  onClose,
  selectedIcon,
  onSelectIcon,
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>(TAB_ALL);

  // Carga lazy de Game Icons: solo se dispara cuando el modal está abierto
  const gi = useGiIcons(isOpen);

  const giCategories = useMemo(() => getGiCategories(gi), [gi]);

  const tabs = useMemo(
    () => [
      TAB_ALL,
      ...ICON_CATEGORIES.map((c) => c.name),
      ...giCategories.map((c) => c.name),
      TAB_ALL_LUCIDE,
      TAB_ALL_GI,
    ],
    [giCategories]
  );

  const { items, total } = useMemo(() => {
    const q = search.trim().toLowerCase();

    const curated: PickerItem[] = [
      ...ICON_CATEGORIES.flatMap((cat) => cat.icons.map((i) => ({ ...i, category: cat.name }))),
      ...giCategories.flatMap((cat) => cat.icons.map((i) => ({ ...i, category: cat.name }))),
    ];

    let list: PickerItem[];

    if (activeTab === TAB_ALL) {
      // Sin búsqueda: solo los curados. Con búsqueda: se busca en TODO el catálogo.
      list = q
        ? [
            ...getLucideCatalog().map((i) => ({ ...i, category: TAB_ALL_LUCIDE })),
            ...getGiCatalog(gi).map((i) => ({ ...i, category: TAB_ALL_GI })),
          ]
        : curated;
    } else if (activeTab === TAB_ALL_LUCIDE) {
      list = getLucideCatalog().map((i) => ({ ...i, category: TAB_ALL_LUCIDE }));
    } else if (activeTab === TAB_ALL_GI) {
      list = getGiCatalog(gi).map((i) => ({ ...i, category: TAB_ALL_GI }));
    } else {
      list = curated.filter((item) => item.category === activeTab);
    }

    if (q) {
      const qc = q.replace(/\s+/g, '');
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(qc) ||
          item.label.toLowerCase().includes(q) ||
          item.label.toLowerCase().replace(/\s+/g, '').includes(qc) ||
          item.category.toLowerCase().includes(q)
      );
    }

    return { items: list.slice(0, MAX_RENDER), total: list.length };
  }, [search, activeTab, gi, giCategories]);

  if (!isOpen) return null;

  const isGiTab =
    activeTab === TAB_ALL_GI || giCategories.some((c) => c.name === activeTab);
  const loadingGi = !gi && (isGiTab || (activeTab === TAB_ALL && search.trim() !== ''));

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
              placeholder="Search icons (e.g. sword, dragon, beer)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
              autoFocus
            />
          </div>

          {/* Category Tabs */}
          <div className="flex space-x-1.5 overflow-x-auto pt-2 pb-1 text-xs no-scrollbar">
            {tabs.map((tabName) => (
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
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-4 sm:grid-cols-6 gap-2.5 content-start">
          {items.map(({ name, label }) => {
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
                <SoundIcon
                  name={name}
                  className="w-6 h-6 mb-1 text-gray-200 group-hover:scale-110 transition-transform"
                />
                <span className="text-[10px] text-gray-400 line-clamp-1 w-full group-hover:text-gray-200">
                  {label}
                </span>
              </button>
            );
          })}

          {loadingGi && (
            <div className="col-span-full py-6 flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading Game Icons...
            </div>
          )}

          {!loadingGi && items.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-500 text-sm">
              No matching icons found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#0d1117] border-t border-[#30363d] flex justify-between items-center text-xs text-gray-400">
          <span>
            {total > MAX_RENDER
              ? `Showing ${MAX_RENDER} of ${total} icons — use search to narrow down`
              : `${total} icons available`}
          </span>
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