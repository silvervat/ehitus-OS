
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ProjectTable } from './components/ProjectTable';
import { VehicleForm } from './components/VehicleForm';
import { DynamicDataGrid } from './components/DynamicDataGrid';
import { Settings } from './components/Settings';
import { FilesManager } from './components/FilesManager';
import { SIDEBAR_DATA } from './constants';
import { ViewType, SidebarItem } from './types';
import { schemaStore } from './services/schemaStore';
import { Database, FolderOpen } from 'lucide-react';
import { AIAssistant } from './components/AIAssistant';
import { CommandPalette } from './components/CommandPalette';
import { automationEngine } from './services/automationEngine'; // Init engine
import { historyStore } from './services/historyStore'; // Init history

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.DASHBOARD);
  const [dynamicTableId, setDynamicTableId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<string[]>([]);
  
  // Merge static sidebar items with dynamic tables
  const [navItems, setNavItems] = useState<SidebarItem[]>(SIDEBAR_DATA);

  // Automation Toasts
  useEffect(() => {
      const handleToast = (e: any) => {
          const msg = e.detail.message;
          setToasts(prev => [...prev, msg]);
          setTimeout(() => setToasts(prev => prev.filter(t => t !== msg)), 5000);
      };
      window.addEventListener('automation-toast', handleToast);
      return () => window.removeEventListener('automation-toast', handleToast);
  }, []);

  // Keyboard Shortcuts (Undo/Redo)
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
              if (e.shiftKey) {
                  e.preventDefault();
                  historyStore.redo();
              } else {
                  e.preventDefault();
                  historyStore.undo();
              }
          }
          // Some browsers use Ctrl+Y for Redo
          if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
              e.preventDefault();
              historyStore.redo();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const syncNavigation = () => {
        const tables = schemaStore.getTables();
        
        const dynamicItems: SidebarItem[] = tables
            .filter(t => t.id !== 'users' && t.id !== 'documents') // Users & Docs are managed elsewhere or have system pages
            .map(t => ({
                id: `dyn_${t.id}`,
                label: t.name,
                icon: <Database size={16} />,
                tableId: t.id, // Custom property to identify the table
                view: ViewType.DYNAMIC
            }));

        const newNav = [...SIDEBAR_DATA];
        
        // Ensure Files is mapped correctly
        const filesItem = newNav.find(i => i.id === 'files');
        if(filesItem) filesItem.view = ViewType.FILES;

        // Find or Create "Databases" section
        let dbSection = newNav.find(i => i.id === 'databases');
        if (!dbSection) {
            dbSection = {
                id: 'databases',
                label: 'Andmebaasid',
                icon: <Database size={18} />,
                children: []
            };
            // Insert before Settings
            newNav.splice(newNav.length - 1, 0, dbSection);
        }
        
        dbSection.children = dynamicItems;
        
        // Ensure Settings is wired correctly
        const settingsItem = newNav.find(i => i.id === 'settings');
        if(settingsItem) settingsItem.view = ViewType.SETTINGS;

        setNavItems([...newNav]);
    };

    syncNavigation();
    return schemaStore.subscribe(syncNavigation);
  }, []);

  const handleNavigate = (view: ViewType, item?: SidebarItem) => {
      setCurrentView(view);
      // Fix: Check for tableId in the item to set the dynamic context
      if (view === ViewType.DYNAMIC && item?.tableId) {
          setDynamicTableId(item.tableId);
      } else {
          setDynamicTableId(null);
      }
  };

  const renderContent = () => {
    switch (currentView) {
      case ViewType.DASHBOARD:
        return <Dashboard />;
      case ViewType.FILES:
        return <FilesManager />;
      case ViewType.PROJECTS:
        return <ProjectTable />;
      case ViewType.INSPECTION:
        return <VehicleForm />;
      case ViewType.SETTINGS:
        return <Settings />;
      case ViewType.DYNAMIC:
        return dynamicTableId ? <DynamicDataGrid tableId={dynamicTableId} /> : <div className="p-8 text-slate-400">Vali tabel menüüst</div>;
      default:
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="text-6xl mb-4">🚧</div>
                <h2 className="text-xl font-medium">See leht on arendamisel</h2>
            </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      {/* Global Features */}
      <CommandPalette onNavigate={handleNavigate} />
      
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
          {toasts.map((msg, i) => (
              <div key={i} className="bg-slate-800 text-white px-4 py-2 rounded shadow-lg animate-in slide-in-from-right text-sm font-medium">
                  {msg}
              </div>
          ))}
      </div>

      {/* Left Sidebar */}
      <Sidebar 
        items={navItems} 
        activeView={currentView}
        onNavigate={handleNavigate} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Bar (Global) */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 z-20">
             <div className="flex items-center gap-4">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    {currentView === ViewType.DYNAMIC ? <Database size={14}/> : null}
                    {currentView === ViewType.FILES ? <FolderOpen size={14}/> : null}
                    {currentView} 
                    {dynamicTableId && currentView === ViewType.DYNAMIC && ` / ${schemaStore.getTable(dynamicTableId)?.name}`}
                </h2>
             </div>
             <div className="flex items-center gap-4">
                 <div className="text-xs text-slate-400">Sünkroniseeritud</div>
                 <div className="w-2 h-2 bg-green-500 rounded-full" title="Online"></div>
             </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto relative scroll-smooth bg-slate-50">
            {renderContent()}
        </main>
        
        {/* AI Assistant Overlay */}
        <AIAssistant />
      </div>
    </div>
  );
};

export default App;
