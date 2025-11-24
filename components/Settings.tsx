
import React, { useState, useEffect } from 'react';
import { schemaStore } from '../services/schemaStore';
import { DynamicDataGrid } from './DynamicDataGrid';
import { Shield, Users, Database, Plus, Save, Trash2, Lock, Check, X, Activity, Server, HardDrive, ArrowUp, ArrowDown, Layout, CreditCard, Box, Eye, Edit2, Sliders, Type, AlignLeft } from 'lucide-react';
import { Role, PermissionRule, FormSection, FormLayout, ColumnDefinition } from '../types';
import { Modal } from './Modal';

export const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'permissions' | 'schema'>('dashboard');
    const [tables, setTables] = useState(schemaStore.getTables());
    const [roles, setRoles] = useState(schemaStore.getRoles());
    const [newTableName, setNewTableName] = useState('');
    
    // Role Creation State
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleColor, setNewRoleColor] = useState('#6366f1');
    const [isAddingRole, setIsAddingRole] = useState(false);

    // Schema Editor State
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [editingColumn, setEditingColumn] = useState<any>(null); // For permissions modal
    const [editingForm, setEditingForm] = useState<boolean>(false); // Toggle form designer mode

    // Form Designer State
    const [formSections, setFormSections] = useState<FormSection[]>([]);
    const [availableColumns, setAvailableColumns] = useState<string[]>([]);
    const [selectedFieldForProps, setSelectedFieldForProps] = useState<string | null>(null);

    // Force refresh when store updates
    useEffect(() => {
        const refresh = () => {
            setTables([...schemaStore.getTables()]);
            setRoles([...schemaStore.getRoles()]);
        };
        const unsub = schemaStore.subscribe(refresh);
        return unsub;
    }, []);

    const handleAddTable = () => {
        if(!newTableName) return;
        schemaStore.addTable(newTableName);
        setNewTableName('');
        alert(`Uus leht "${newTableName}" loodud! See on nüüd menüüs nähtav ja õiguste maatriksis.`);
    };

    const handleAddColumn = (tableId: string) => {
        const name = prompt("Veeru nimi:");
        if(!name) return;
        const key = name.toLowerCase().replace(/ /g, '_');
        schemaStore.addColumn(tableId, { key, label: name, type: 'text', width: 150 });
    };

    const handleCreateRole = () => {
        if (!newRoleName) return;
        schemaStore.addRole(newRoleName, newRoleColor);
        setNewRoleName('');
        setIsAddingRole(false);
    };

    const handleDeleteRole = (id: string) => {
        if(confirm("Oled kindel? See eemaldab rolli ja seotud õigused.")) {
            schemaStore.deleteRole(id);
        }
    };

    const togglePermission = (roleId: string, tableId: string, type: keyof PermissionRule) => {
        const current = schemaStore.getPermission(roleId, tableId);
        schemaStore.updatePermission(roleId, tableId, { [type]: !current[type] });
        setRoles([...schemaStore.getRoles()]); 
    };

    const toggleColPermission = (roleId: string, tableId: string, colKey: string, type: 'view' | 'edit') => {
        const current = schemaStore.getColumnPermission(roleId, tableId, colKey);
        schemaStore.updateColumnPermission(roleId, tableId, colKey, { [type]: !current[type] });
        // Force refresh via state hack or rely on store
        setRoles([...schemaStore.getRoles()]); 
    };

    const moveColumn = (tableId: string, colKey: string, direction: 'up' | 'down') => {
        schemaStore.moveColumn(tableId, colKey, direction);
        setTables([...schemaStore.getTables()]); // Trigger re-render
    };

    // --- FORM DESIGNER LOGIC ---
    const initFormDesigner = (tableId: string) => {
        const table = schemaStore.getTable(tableId);
        if(!table) return;
        
        setSelectedTableId(tableId);
        setEditingForm(true);

        // Load existing layout or create default
        if (table.formLayout) {
            setFormSections(JSON.parse(JSON.stringify(table.formLayout.sections)));
            const usedCols = new Set(table.formLayout.sections.flatMap(s => s.columnKeys));
            setAvailableColumns(table.columns.filter(c => !usedCols.has(c.key)).map(c => c.key));
        } else {
            // Default: One "General" section with all columns
            setFormSections([{ id: 's1', title: 'Üldinfo', columnKeys: table.columns.map(c => c.key), isTwoColumn: false }]);
            setAvailableColumns([]);
        }
    };

    const saveFormLayout = () => {
        if(selectedTableId) {
            schemaStore.saveFormLayout(selectedTableId, { sections: formSections });
            setEditingForm(false);
            setSelectedTableId(null);
            setSelectedFieldForProps(null);
        }
    };

    const addSection = () => {
        const title = prompt("Sektsiooni pealkiri:");
        if(title) {
            setFormSections([...formSections, { id: `s_${Date.now()}`, title, columnKeys: [], isTwoColumn: false }]);
        }
    };

    const moveColToSection = (colKey: string, sectionIndex: number) => {
        // Remove from source (avail or other section)
        let newAvail = availableColumns.filter(c => c !== colKey);
        const newSections = [...formSections];
        
        // Remove from any existing section
        newSections.forEach(s => {
            s.columnKeys = s.columnKeys.filter(k => k !== colKey);
        });

        // Add to target
        if (sectionIndex === -1) {
            newAvail.push(colKey);
        } else {
            newSections[sectionIndex].columnKeys.push(colKey);
        }

        setAvailableColumns(newAvail);
        setFormSections(newSections);
    };

    const toggleSectionLayout = (index: number) => {
        const newSections = [...formSections];
        newSections[index].isTwoColumn = !newSections[index].isTwoColumn;
        setFormSections(newSections);
    };

    // --- COLUMN PROPERTIES UPDATES ---
    const updateColumnProperty = (colKey: string, updates: any) => {
        if (selectedTableId) {
            schemaStore.updateColumn(selectedTableId, colKey, updates);
            // Force re-render to show updates in preview
            setTables([...schemaStore.getTables()]);
        }
    };
    
    const stats = schemaStore.getTotalStats();

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Süsteemi Seaded</h1>
            
            <div className="flex gap-6 mb-6 border-b border-slate-200 flex-shrink-0 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`pb-3 px-1 flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'border-b-2 border-teal-600 text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Activity size={18} /> Ülevaade
                </button>
                <button 
                    onClick={() => setActiveTab('users')}
                    className={`pb-3 px-1 flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'users' ? 'border-b-2 border-teal-600 text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Users size={18} /> Kasutajad
                </button>
                <button 
                    onClick={() => setActiveTab('permissions')}
                    className={`pb-3 px-1 flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'permissions' ? 'border-b-2 border-teal-600 text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Shield size={18} /> Õigused ja Rollid
                </button>
                <button 
                    onClick={() => setActiveTab('schema')}
                    className={`pb-3 px-1 flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'schema' ? 'border-b-2 border-teal-600 text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Database size={18} /> Andmebaas & Lehed
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 pb-20 custom-scrollbar">
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                        <Database size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 font-medium">Ridade Arv</p>
                                        <h3 className="text-2xl font-bold text-slate-800">{stats.totalRows.toLocaleString()}</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                                        <Server size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 font-medium">Aktiivsed Tabelid</p>
                                        <h3 className="text-2xl font-bold text-slate-800">{stats.totalTables}</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                                        <HardDrive size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 font-medium">Andmebaasi Staatus</p>
                                        <h3 className="text-2xl font-bold text-slate-800">Local (Mock)</h3>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
                            <h3 className="text-lg font-bold mb-2">Supabase Valmidus</h3>
                            <p className="text-slate-400 text-sm mb-4">
                                Süsteem kasutab hetkel brauseri mälu (`localStorage`). Suurte andmemahtude (1M+ rida) ja reaalajas koostöö jaoks tuleb ühendada PostgreSQL andmebaas.
                            </p>
                            <div className="flex items-center gap-2 text-sm font-mono bg-slate-800 p-3 rounded border border-slate-700">
                                <span className="text-green-400">$</span>
                                <span>npm install @supabase/supabase-js</span>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-[600px] overflow-hidden">
                        <DynamicDataGrid tableId="users" />
                    </div>
                )}

                {activeTab === 'permissions' && (
                    <div className="space-y-8">
                        {/* Roles Management */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-slate-800">Rollide Haldus</h3>
                                <button 
                                    onClick={() => setIsAddingRole(!isAddingRole)}
                                    className="text-sm bg-teal-50 text-teal-700 px-3 py-1.5 rounded hover:bg-teal-100 flex items-center gap-1 font-medium"
                                >
                                    <Plus size={14} /> Uus Roll
                                </button>
                            </div>

                            {isAddingRole && (
                                <div className="mb-6 p-4 bg-slate-50 rounded border border-slate-200 flex items-end gap-4 animate-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">ROLLI NIMETUS</label>
                                        <input 
                                            type="text" 
                                            value={newRoleName}
                                            onChange={e => setNewRoleName(e.target.value)}
                                            className="px-3 py-1.5 border border-slate-300 rounded text-sm w-64"
                                            placeholder="Nt. Praktikant"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">VÄRV</label>
                                        <input 
                                            type="color" 
                                            value={newRoleColor}
                                            onChange={e => setNewRoleColor(e.target.value)}
                                            className="h-8 w-16 cursor-pointer border border-slate-300 rounded"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleCreateRole}
                                        className="bg-teal-600 text-white px-4 py-1.5 rounded text-sm hover:bg-teal-700"
                                    >
                                        Loo Roll
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3">
                                {roles.map(role => (
                                    <div key={role.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium" style={{ borderColor: role.color + '40', backgroundColor: role.color + '10', color: role.color }}>
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }}></span>
                                        {role.name}
                                        {!role.isSystem && (
                                            <button onClick={() => handleDeleteRole(role.id)} className="ml-1 opacity-50 hover:opacity-100 p-0.5 rounded hover:bg-red-100 hover:text-red-600">
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                        {role.isSystem && <Lock size={10} className="opacity-50 ml-1" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Permission Matrix */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-200 bg-slate-50">
                                <h3 className="text-lg font-bold text-slate-800">Õiguste Maatriks</h3>
                                <p className="text-sm text-slate-500">Määra, mida iga roll saab süsteemis teha. Uued moodulid ilmuvad siia automaatselt.</p>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="py-3 px-4 font-medium text-slate-500 border-r border-slate-200 w-64 sticky left-0 bg-slate-50 z-10">
                                                MOODUL / TABEL
                                            </th>
                                            {roles.map(role => (
                                                <th key={role.id} className="py-3 px-4 font-medium text-center border-r border-slate-100 min-w-[180px]" style={{ color: role.color }}>
                                                    <div className="flex flex-col items-center">
                                                        <span>{role.name}</span>
                                                        {role.isSystem && role.id === 'admin' && <span className="text-[10px] text-slate-400 font-normal">(Kõik õigused)</span>}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {tables.map((table) => (
                                            <tr key={table.id} className="hover:bg-slate-50 group">
                                                <td className="py-3 px-4 font-medium text-slate-700 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50 z-10 flex items-center gap-2">
                                                    <Database size={14} className="text-slate-400" />
                                                    {table.name}
                                                </td>
                                                {roles.map(role => {
                                                    const perm = schemaStore.getPermission(role.id, table.id);
                                                    const isAdmin = role.id === 'admin';

                                                    return (
                                                        <td key={`${table.id}-${role.id}`} className="p-3 border-r border-slate-100 text-center">
                                                            <div className="flex justify-center gap-1">
                                                                {/* Permission Toggles */}
                                                                {[
                                                                    { key: 'view', label: 'V', title: 'Vaata' }, 
                                                                    { key: 'create', label: 'L', title: 'Lisa' }, 
                                                                    { key: 'edit', label: 'M', title: 'Muuda' }, 
                                                                    { key: 'delete', label: 'K', title: 'Kustuta' }
                                                                ].map((action) => {
                                                                    const isEnabled = perm[action.key as keyof PermissionRule];
                                                                    
                                                                    if (isAdmin) {
                                                                        return (
                                                                            <div key={action.key} className="w-8 h-8 rounded bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold cursor-not-allowed opacity-50" title="Adminil on alati õigus">
                                                                                {action.label}
                                                                            </div>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <button
                                                                            key={action.key}
                                                                            onClick={() => togglePermission(role.id, table.id, action.key as keyof PermissionRule)}
                                                                            className={`
                                                                                w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all border
                                                                                ${isEnabled 
                                                                                    ? 'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200' 
                                                                                    : 'bg-white text-slate-300 border-slate-200 hover:border-slate-300 hover:text-slate-400'}
                                                                            `}
                                                                            title={action.title}
                                                                        >
                                                                            {isEnabled ? action.label : <X size={12} />}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'schema' && !editingForm && (
                    <div className="space-y-8">
                        {/* Add New Page Section */}
                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                            <h3 className="text-blue-900 font-bold text-lg mb-2">Lisa Uus Leht</h3>
                            <p className="text-blue-700 text-sm mb-4">Uue lehe loomisel tekitatakse automaatselt andmebaasi tabel ja see ilmub vasakmenüüsse.</p>
                            <div className="flex gap-3">
                                <input 
                                    type="text" 
                                    placeholder="Nt. Tööriistad, Kliendid..." 
                                    className="flex-1 px-4 py-2 rounded border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newTableName}
                                    onChange={(e) => setNewTableName(e.target.value)}
                                />
                                <button 
                                    onClick={handleAddTable}
                                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 shadow-sm font-medium"
                                >
                                    + Loo Leht
                                </button>
                            </div>
                        </div>

                        {/* Existing Schemas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {tables.map(table => (
                                <div key={table.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{table.name}</h4>
                                            <code className="text-xs text-slate-400 bg-slate-100 px-1 rounded">ID: {table.id}</code>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => initFormDesigner(table.id)}
                                                className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded flex items-center gap-1"
                                                title="Disaini vormi"
                                            >
                                                <Layout size={12} /> Vorm
                                            </button>
                                            <button 
                                                onClick={() => handleAddColumn(table.id)}
                                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded flex items-center gap-1"
                                            >
                                                <Plus size={12} /> Veerg
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        {table.columns.map((col, idx) => (
                                            <div key={col.key} className="flex justify-between items-center text-sm py-1 border-b border-slate-50 last:border-0 group/col">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex flex-col opacity-0 group-hover/col:opacity-100 transition-opacity">
                                                        <button 
                                                            disabled={idx === 0}
                                                            onClick={() => moveColumn(table.id, col.key, 'up')}
                                                            className="text-slate-300 hover:text-teal-600 disabled:opacity-30"
                                                        >
                                                            <ArrowUp size={10} />
                                                        </button>
                                                        <button 
                                                            disabled={idx === table.columns.length - 1}
                                                            onClick={() => moveColumn(table.id, col.key, 'down')}
                                                            className="text-slate-300 hover:text-teal-600 disabled:opacity-30"
                                                        >
                                                            <ArrowDown size={10} />
                                                        </button>
                                                    </div>
                                                    <span className="text-slate-600">{col.label}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => { setSelectedTableId(table.id); setEditingColumn(col); }} className="opacity-0 group-hover/col:opacity-100 text-xs text-slate-400 hover:text-teal-600">
                                                        <Edit2 size={12} />
                                                    </button>
                                                    {col.type === 'reference' && <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded">LINK</span>}
                                                    <span className="text-xs text-slate-400 font-mono">{col.type}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* FORM DESIGNER UI 2.0 */}
                {activeTab === 'schema' && editingForm && selectedTableId && (
                    <div className="fixed inset-0 bg-slate-100 z-50 flex flex-col">
                        <div className="h-14 bg-white border-b border-slate-200 px-6 flex justify-between items-center shadow-sm">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Layout size={20} className="text-indigo-600" />
                                Vormi Disainer: {schemaStore.getTable(selectedTableId)?.name}
                            </h3>
                            <div className="flex gap-3">
                                <button onClick={() => setEditingForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm font-medium">Katkesta</button>
                                <button onClick={saveFormLayout} className="px-5 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                                    <Save size={16} /> Salvesta Paigutus
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Left Panel: Structure Editor */}
                            <div className="w-[400px] border-r border-slate-200 bg-white flex flex-col overflow-hidden">
                                <div className="p-4 border-b border-slate-200 bg-slate-50">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase">Struktuur</h4>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                     {formSections.map((section, idx) => (
                                         <div key={section.id} className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
                                             <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                                 <input 
                                                    value={section.title}
                                                    onChange={(e) => {
                                                        const ns = [...formSections];
                                                        ns[idx].title = e.target.value;
                                                        setFormSections(ns);
                                                    }}
                                                    className="font-bold text-slate-700 bg-transparent focus:bg-white border border-transparent focus:border-indigo-300 rounded px-1 text-sm w-32"
                                                 />
                                                 <div className="flex gap-1">
                                                     <button 
                                                        onClick={() => toggleSectionLayout(idx)}
                                                        className={`p-1 rounded ${section.isTwoColumn ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
                                                        title={section.isTwoColumn ? "2 Tulpa" : "1 Tulp"}
                                                     >
                                                         {section.isTwoColumn ? <LayoutGridIcon /> : <ListIcon />}
                                                     </button>
                                                     <button 
                                                        onClick={() => {
                                                            if(confirm("Kustuta sektsioon?")) {
                                                                setAvailableColumns([...availableColumns, ...section.columnKeys]);
                                                                setFormSections(formSections.filter((_, i) => i !== idx));
                                                            }
                                                        }}
                                                        className="p-1 text-slate-300 hover:text-red-500"
                                                     >
                                                         <Trash2 size={14} />
                                                     </button>
                                                 </div>
                                             </div>
                                             <div className="p-2 space-y-1 bg-slate-50/50 min-h-[50px]">
                                                 {section.columnKeys.map((colKey, colIdx) => {
                                                     const col = schemaStore.getTable(selectedTableId!)?.columns.find(c => c.key === colKey);
                                                     const isSelected = selectedFieldForProps === colKey;
                                                     return (
                                                         <div 
                                                            key={colKey} 
                                                            className={`p-2 rounded border flex justify-between items-center group cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                                            onClick={() => setSelectedFieldForProps(colKey)}
                                                         >
                                                             <span className="text-sm text-slate-700">{col?.label || colKey}</span>
                                                             <div className="flex gap-1">
                                                                 {colIdx > 0 && <button onClick={(e) => {
                                                                     e.stopPropagation();
                                                                     const ns = [...formSections];
                                                                     const temp = ns[idx].columnKeys[colIdx];
                                                                     ns[idx].columnKeys[colIdx] = ns[idx].columnKeys[colIdx-1];
                                                                     ns[idx].columnKeys[colIdx-1] = temp;
                                                                     setFormSections(ns);
                                                                 }}><ArrowUp size={12} className="text-slate-300 hover:text-slate-600" /></button>}
                                                                 <button onClick={(e) => { e.stopPropagation(); moveColToSection(colKey, -1); }}><X size={12} className="text-red-300 hover:text-red-500" /></button>
                                                             </div>
                                                         </div>
                                                     )
                                                 })}
                                                 {section.columnKeys.length === 0 && <p className="text-xs text-center text-slate-400 py-2">Lohista veerud siia</p>}
                                             </div>
                                         </div>
                                     ))}
                                     <button onClick={addSection} className="w-full py-2 border-2 border-dashed border-slate-300 rounded text-slate-500 text-sm hover:border-indigo-400 hover:text-indigo-600">+ Lisa Sektsioon</button>
                                </div>
                                
                                <div className="p-4 border-t border-slate-200 bg-slate-50 h-1/3 overflow-y-auto">
                                     <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Kasutamata Veerud</h4>
                                     <div className="space-y-1">
                                        {availableColumns.map(colKey => {
                                            const col = schemaStore.getTable(selectedTableId!)?.columns.find(c => c.key === colKey);
                                            return (
                                                <div key={colKey} className="flex justify-between items-center p-2 bg-white border border-slate-200 rounded shadow-sm">
                                                    <span className="text-sm">{col?.label}</span>
                                                    <button onClick={() => moveColToSection(colKey, 0)} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded"><Plus size={14}/></button>
                                                </div>
                                            )
                                        })}
                                     </div>
                                </div>
                            </div>

                            {/* Middle Panel: Live Preview */}
                            <div className="flex-1 bg-slate-100 p-8 overflow-y-auto flex justify-center">
                                <div className="w-full max-w-2xl">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase">Live Preview (Vormi eelvaade)</h4>
                                        <span className="text-xs text-slate-400">Kasutajad näevad seda</span>
                                    </div>
                                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                                         <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                                             <h3 className="text-lg font-bold text-slate-800">Lisa Uus Kirje</h3>
                                             <X size={20} className="text-slate-300" />
                                         </div>
                                         <div className="p-6 space-y-6">
                                             {formSections.map(section => (
                                                 <div key={section.id}>
                                                     <h5 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 border-b border-slate-100 pb-1">{section.title}</h5>
                                                     <div className={section.isTwoColumn ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
                                                         {section.columnKeys.map(colKey => {
                                                             const col = schemaStore.getTable(selectedTableId!)?.columns.find(c => c.key === colKey);
                                                             if(!col) return null;
                                                             const isSelected = selectedFieldForProps === colKey;
                                                             
                                                             // Simulated Input
                                                             return (
                                                                 <div key={colKey} className={`relative ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 rounded' : ''}`} onClick={() => setSelectedFieldForProps(colKey)}>
                                                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                                         {col.label} {col.validation?.required && <span className="text-red-500">*</span>}
                                                                     </label>
                                                                     <div className={`
                                                                        w-full border rounded p-2 text-sm bg-slate-50 text-slate-400
                                                                        ${col.style?.textSize === 'sm' ? 'text-xs' : col.style?.textSize === 'lg' ? 'text-lg' : 'text-sm'}
                                                                        ${col.style?.bold ? 'font-bold' : ''}
                                                                     `}>
                                                                         Sisesta {col.label.toLowerCase()}...
                                                                     </div>
                                                                 </div>
                                                             )
                                                         })}
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                         <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                                             <div className="h-9 w-24 bg-slate-200 rounded"></div>
                                             <div className="h-9 w-24 bg-teal-600 rounded"></div>
                                         </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Properties */}
                            {selectedFieldForProps && (
                                <div className="w-[300px] bg-white border-l border-slate-200 p-4 overflow-y-auto">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="font-bold text-slate-800">Välja Seaded</h4>
                                        <button onClick={() => setSelectedFieldForProps(null)}><X size={16} className="text-slate-400"/></button>
                                    </div>
                                    
                                    {(() => {
                                        const col = schemaStore.getTable(selectedTableId!)?.columns.find(c => c.key === selectedFieldForProps);
                                        if(!col) return null;
                                        return (
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Silt (Label)</label>
                                                    <input 
                                                        value={col.label} 
                                                        onChange={(e) => updateColumnProperty(col.key, { label: e.target.value })}
                                                        className="w-full border border-slate-300 rounded p-2 text-sm"
                                                    />
                                                </div>

                                                <div className="border-t border-slate-100 pt-4">
                                                    <h5 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Sliders size={14}/> Valideerimine</h5>
                                                    <div className="space-y-2">
                                                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={col.validation?.required || false}
                                                                onChange={(e) => updateColumnProperty(col.key, { validation: { ...col.validation, required: e.target.checked } })}
                                                            />
                                                            Kohustuslik väli
                                                        </label>
                                                        
                                                        <div>
                                                            <label className="text-xs text-slate-500 block mb-1">Min pikkus</label>
                                                            <input 
                                                                type="number" 
                                                                className="w-full border border-slate-300 rounded p-1 text-sm"
                                                                value={col.validation?.minLength || ''}
                                                                onChange={(e) => updateColumnProperty(col.key, { validation: { ...col.validation, minLength: parseInt(e.target.value) } })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-slate-500 block mb-1">Max pikkus</label>
                                                            <input 
                                                                type="number" 
                                                                className="w-full border border-slate-300 rounded p-1 text-sm"
                                                                value={col.validation?.maxLength || ''}
                                                                onChange={(e) => updateColumnProperty(col.key, { validation: { ...col.validation, maxLength: parseInt(e.target.value) } })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="border-t border-slate-100 pt-4">
                                                    <h5 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Type size={14}/> Stiil</h5>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="text-xs text-slate-500 block mb-1">Teksti suurus</label>
                                                            <div className="flex border rounded overflow-hidden">
                                                                {(['sm', 'md', 'lg'] as const).map(s => (
                                                                    <button 
                                                                        key={s}
                                                                        onClick={() => updateColumnProperty(col.key, { style: { ...col.style, textSize: s } })}
                                                                        className={`flex-1 py-1 text-xs font-medium ${col.style?.textSize === s || (!col.style?.textSize && s === 'md') ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                                                                    >
                                                                        {s.toUpperCase()}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={col.style?.bold || false}
                                                                onChange={(e) => updateColumnProperty(col.key, { style: { ...col.style, bold: e.target.checked } })}
                                                            />
                                                            <span className="font-bold">Bold</span> (Paks kiri)
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Column Permission Modal (existing) */}
            <Modal
                isOpen={!!editingColumn}
                onClose={() => setEditingColumn(null)}
                title={`Veeru seaded: ${editingColumn?.label}`}
                type="center"
            >
                {editingColumn && selectedTableId && (
                    <div className="space-y-6">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Õigused Rollide Kaupa</label>
                             <div className="border rounded-lg overflow-hidden">
                                 <table className="w-full text-sm">
                                     <thead className="bg-slate-50">
                                         <tr>
                                             <th className="p-2 text-left text-xs font-bold text-slate-500">Roll</th>
                                             <th className="p-2 text-center text-xs font-bold text-slate-500">Nähtav</th>
                                             <th className="p-2 text-center text-xs font-bold text-slate-500">Muudetav</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-slate-100">
                                         {roles.map(role => {
                                             const perm = schemaStore.getColumnPermission(role.id, selectedTableId, editingColumn.key);
                                             const isAdmin = role.id === 'admin';
                                             return (
                                                 <tr key={role.id}>
                                                     <td className="p-2 flex items-center gap-2">
                                                         <span className="w-2 h-2 rounded-full" style={{background: role.color}}></span>
                                                         {role.name}
                                                     </td>
                                                     <td className="p-2 text-center">
                                                         <input 
                                                            type="checkbox" 
                                                            disabled={isAdmin}
                                                            checked={perm.view} 
                                                            onChange={() => toggleColPermission(role.id, selectedTableId, editingColumn.key, 'view')}
                                                         />
                                                     </td>
                                                     <td className="p-2 text-center">
                                                          <input 
                                                            type="checkbox" 
                                                            disabled={isAdmin}
                                                            checked={perm.edit} 
                                                            onChange={() => toggleColPermission(role.id, selectedTableId, editingColumn.key, 'edit')}
                                                         />
                                                     </td>
                                                 </tr>
                                             )
                                         })}
                                     </tbody>
                                 </table>
                             </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

// Simple icons for layout buttons
const ListIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
)
const LayoutGridIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
)
