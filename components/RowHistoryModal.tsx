
import React, { useState, useEffect } from 'react';
import { historyStore } from '../services/historyStore';
import { HistoryEntry } from '../types';
import { MOCK_USERS } from '../constants';
import { Clock, CheckCircle, Edit3, Trash2, PlusCircle, User } from 'lucide-react';

interface RowHistoryModalProps {
    tableId: string;
    rowId: string;
}

export const RowHistoryModal: React.FC<RowHistoryModalProps> = ({ tableId, rowId }) => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);

    useEffect(() => {
        // Fetch history immediately
        setHistory(historyStore.getByRow(tableId, rowId));
        
        // Poll for updates (in a real app, use subscriptions)
        const interval = setInterval(() => {
            setHistory(historyStore.getByRow(tableId, rowId));
        }, 1000);
        return () => clearInterval(interval);
    }, [tableId, rowId]);

    const getUser = (userId: string) => MOCK_USERS.find(u => u.id === userId) || { name: 'Süsteem', avatarUrl: 'SYS', color: '#64748b' };

    const getIcon = (type: string) => {
        switch(type) {
            case 'CREATE': return <PlusCircle size={16} className="text-green-600" />;
            case 'UPDATE': return <Edit3 size={16} className="text-blue-600" />;
            case 'DELETE': return <Trash2 size={16} className="text-red-600" />;
            default: return <Clock size={16} className="text-slate-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <Clock size={16} />
                <span>Tegevuste ajalugu rea ID-ga: <span className="font-mono text-slate-700">{rowId}</span></span>
            </div>

            <div className="relative border-l-2 border-slate-100 ml-4 space-y-8">
                {history.length === 0 ? (
                    <div className="pl-6 text-slate-400 italic text-sm">Selle rea kohta puudub varasem ajalugu.</div>
                ) : (
                    history.map((entry) => {
                        const user = getUser(entry.userId);
                        const diff = historyStore.getHumanReadableDiff(entry);
                        
                        return (
                            <div key={entry.id} className="relative pl-6">
                                {/* Timeline Dot */}
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                </div>
                                
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                            <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[8px] font-bold">
                                                {user.avatarUrl}
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">{user.name}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            {entry.timestamp.toLocaleString('et-EE')}
                                        </span>
                                    </div>
                                    
                                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm mt-1 group hover:border-blue-200 transition-colors">
                                        <div className="flex items-start gap-2">
                                            <div className="mt-0.5">{getIcon(entry.type)}</div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700 uppercase mb-1">{entry.type}</p>
                                                <p className="text-sm text-slate-600 leading-relaxed">{diff}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
