
import React, { useState } from 'react';
import { ColumnDefinition } from '../types';

interface FormulaEditorProps {
    value: string;
    columns: ColumnDefinition[];
    onChange: (val: string) => void;
}

export const FormulaEditor: React.FC<FormulaEditorProps> = ({ value, columns, onChange }) => {
    return (
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
            <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 border-r border-slate-300 text-slate-500 font-mono text-sm">fx</div>
                <input 
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="=SUM({Tunnid}) * 20"
                    className="flex-1 px-3 py-2 text-sm font-mono focus:outline-none"
                />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
                {columns.map(col => (
                    <button 
                        key={col.key}
                        onClick={() => onChange(value + `{${col.key}}`)}
                        className="text-xs bg-white border border-slate-200 px-2 py-1 rounded hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 transition-colors"
                    >
                        {col.label}
                    </button>
                ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Toetatud: +, -, *, /, IF, CONCAT, TODAY</p>
        </div>
    );
};
