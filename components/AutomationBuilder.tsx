
import React, { useState } from 'react';
import { AutomationTriggerType, AutomationActionType, Automation } from '../types';
import { automationEngine } from '../services/automationEngine';
import { Plus, Trash2, Save, Zap } from 'lucide-react';

export const AutomationBuilder: React.FC<{ tableId: string; onClose: () => void }> = ({ tableId, onClose }) => {
    const [name, setName] = useState('Uus Automatiseering');
    const [triggerType, setTriggerType] = useState<AutomationTriggerType>('ROW_CREATED');
    const [actionType, setActionType] = useState<AutomationActionType>('NOTIFY_USER');
    const [config, setConfig] = useState<any>({ message: 'Rida muudeti!' });

    const handleSave = () => {
        const newAuto: Automation = {
            id: `auto_${Date.now()}`,
            name,
            active: true,
            tableId,
            trigger: { type: triggerType },
            conditions: [],
            actions: [{ type: actionType, payload: config }],
            runCount: 0
        };
        automationEngine.addAutomation(newAuto);
        onClose();
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nimetus</label>
                <input 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 text-sm"
                />
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-4 text-purple-600 font-bold text-sm">
                    <Zap size={16} /> KUI (Trigger)
                </div>
                <select 
                    value={triggerType} 
                    onChange={(e) => setTriggerType(e.target.value as any)}
                    className="w-full border border-slate-300 rounded p-2 text-sm bg-white"
                >
                    <option value="ROW_CREATED">Uus rida luuakse</option>
                    <option value="ROW_UPDATED">Rida muudetakse</option>
                    <option value="STATUS_CHANGED">Staatus muutub</option>
                </select>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-4 text-teal-600 font-bold text-sm">
                    SIIS (Action)
                </div>
                <select 
                    value={actionType} 
                    onChange={(e) => setActionType(e.target.value as any)}
                    className="w-full border border-slate-300 rounded p-2 text-sm bg-white mb-3"
                >
                    <option value="NOTIFY_USER">Saada teavitus</option>
                    <option value="UPDATE_ROW">Uuenda rida</option>
                </select>
                
                {actionType === 'NOTIFY_USER' && (
                    <input 
                        placeholder="Teavituse sisu..."
                        value={config.message}
                        onChange={e => setConfig({ ...config, message: e.target.value })}
                        className="w-full border border-slate-300 rounded p-2 text-sm"
                    />
                )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Katkesta</button>
                <button onClick={handleSave} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 flex items-center gap-2">
                    <Save size={16} /> Salvesta
                </button>
            </div>
        </div>
    );
};
