
import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, Zap, Database, FileText, Settings, Command, FolderPlus } from 'lucide-react';
import { ViewType } from '../types';
import { schemaStore } from '../services/schemaStore';

interface CommandPaletteProps {
    onNavigate: (view: ViewType) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const commands = [
        { id: 'goto_dash', label: 'Mine Armatuurlauale', icon: <Database size={16}/>, action: () => onNavigate(ViewType.DASHBOARD) },
        { id: 'goto_proj', label: 'Mine Projektidesse', icon: <FileText size={16}/>, action: () => onNavigate(ViewType.PROJECTS) },
        { id: 'goto_files', label: 'Mine Failidesse', icon: <FolderPlus size={16}/>, action: () => onNavigate(ViewType.FILES) },
        { id: 'goto_settings', label: 'Ava Seaded', icon: <Settings size={16}/>, action: () => onNavigate(ViewType.SETTINGS) },
        { id: 'new_table', label: 'Loo Uus Tabel', icon: <Zap size={16}/>, action: () => { const name = prompt("Tabeli nimi:"); if(name) schemaStore.addTable(name); } },
        { id: 'export_csv', label: 'Ekspordi CSV', icon: <Command size={16}/>, action: () => alert('Eksport käivitatud') },
    ];

    const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen(prev => !prev);
                setQuery('');
            }
            if (isOpen) {
                if (e.key === 'Escape') setIsOpen(false);
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(i => Math.max(i - 1, 0));
                }
                if (e.key === 'Enter' && filtered[selectedIndex]) {
                    e.preventDefault();
                    filtered[selectedIndex].action();
                    setIsOpen(false);
                }
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, filtered, selectedIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[20vh]" onClick={() => setIsOpen(false)}>
            <div className="bg-white w-[600px] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-100" onClick={e => e.stopPropagation()}>
                <div className="flex items-center px-4 py-3 border-b border-slate-100">
                    <Search className="text-slate-400 mr-3" size={20} />
                    <input 
                        autoFocus
                        className="flex-1 text-lg outline-none text-slate-700 placeholder:text-slate-400"
                        placeholder="Mida soovid teha?"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                    />
                    <div className="text-xs font-bold text-slate-300 bg-slate-100 px-2 py-1 rounded">ESC</div>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2">
                    {filtered.length === 0 ? (
                        <div className="p-4 text-center text-slate-400">Tulemusi ei leitud</div>
                    ) : (
                        filtered.map((cmd, idx) => (
                            <div 
                                key={cmd.id}
                                className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer ${idx === selectedIndex ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                onClick={() => { cmd.action(); setIsOpen(false); }}
                                onMouseEnter={() => setSelectedIndex(idx)}
                            >
                                <div className="flex items-center gap-3">
                                    {cmd.icon}
                                    <span className="font-medium">{cmd.label}</span>
                                </div>
                                {idx === selectedIndex && <ArrowRight size={16} />}
                            </div>
                        ))
                    )}
                </div>
                <div className="bg-slate-50 px-4 py-2 text-xs text-slate-400 border-t border-slate-100 flex justify-between">
                    <span>Liigu nooltega, vali Enteriga</span>
                    <span>Rivest Enterprise OS</span>
                </div>
            </div>
        </div>
    );
};
