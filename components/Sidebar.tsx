import React, { useState } from 'react';
import { SidebarItem, ViewType } from '../types';
import { ChevronRight, ChevronDown, Menu, Search } from 'lucide-react';

interface SidebarProps {
  items: SidebarItem[];
  activeView: ViewType;
  onNavigate: (view: ViewType, item?: SidebarItem) => void;
}

const SidebarNode: React.FC<{
  item: SidebarItem;
  level: number;
  activeView: ViewType;
  onNavigate: (view: ViewType, item?: SidebarItem) => void;
}> = ({ item, level, activeView, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(item.isOpen || false);
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    } else if (item.view) {
      onNavigate(item.view, item);
    }
  };

  // Logic to determine active state needs to check tableId for dynamic views
  // Simplified here to just check view type, but in a real app we'd match IDs
  const isActive = item.view === activeView && (!item.tableId || (item.tableId && activeView === ViewType.DYNAMIC)); // Simplified check

  return (
    <div className="select-none">
      <div
        onClick={handleClick}
        className={`
          flex items-center py-1.5 px-2 mx-2 rounded-md cursor-pointer transition-colors text-sm
          ${isActive ? 'bg-teal-100 text-teal-800 font-medium' : 'text-slate-600 hover:bg-slate-100'}
        `}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <span className="mr-2 opacity-70">
            {item.icon ? item.icon : (hasChildren ? null : <div className="w-4" />)}
        </span>
        
        <span className="flex-1 truncate">{item.label}</span>
        
        {hasChildren && (
          <span className="opacity-50">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
      </div>
      
      {hasChildren && isOpen && (
        <div className="border-l border-slate-200 ml-5 my-1">
          {item.children!.map((child) => (
            <SidebarNode
              key={child.id}
              item={child}
              level={level + 1}
              activeView={activeView}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ items, activeView, onNavigate }) => {
  return (
    <div className="w-72 h-full bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
      {/* Branding Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="flex items-center gap-2">
            <svg className="w-8 h-8 text-teal-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/>
            </svg>
            <span className="text-2xl font-bold text-slate-800 tracking-tight">rivest</span>
        </div>
      </div>

      {/* Search/Filter */}
      <div className="p-3">
        <div className="relative">
            <Search className="absolute left-2 top-2.5 text-slate-400" size={16} />
            <input 
                type="text" 
                placeholder="Otsi lehte..." 
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
        </div>
      </div>

      {/* Navigation Tree */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 custom-scrollbar">
        {items.map((item) => (
          <SidebarNode
            key={item.id}
            item={item}
            level={0}
            activeView={activeView}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors" onClick={() => onNavigate(ViewType.SETTINGS)}>
            <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
                KN
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-800">Kristofer Nilp</span>
                <span className="text-xs text-slate-500">Admin • Seaded</span>
            </div>
        </div>
      </div>
    </div>
  );
};
