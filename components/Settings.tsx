
import React, { useState, useEffect } from 'react';
import { schemaStore } from '../services/schemaStore';
import { DynamicDataGrid } from './DynamicDataGrid';
import { Shield, Users, Database, Plus, Save, Trash2, Lock, X, Activity, Server, HardDrive, ArrowUp, ArrowDown, Layout, Sliders, Type, Edit2, Columns, Smartphone, Monitor, ChevronLeft, MoreHorizontal, Table as TableIcon, FileText, ImageIcon } from 'lucide-react';
import { Role, PermissionRule, FormSection, ColumnDefinition } from '../types';
import { Modal } from './Modal';

export const Settings: React.FC = () => {
    // Navigation State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'permissions' | 'modules'>('dashboard');
    
    // Data State
    const [tables, setTables] = useState(schemaStore.getTables());
    const [roles, setRoles] = useState(schemaStore.getRoles());
    
    // Module Management State
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null); // Detail View ID
    const [newTableName, setNewTableName] = useState('');
    
    // Role Creation State
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleColor, setNewRoleColor] = useState('#6366f1');
    const [isAddingRole, setIsAddingRole] = useState(false);

    // Schema Editor State (Detail View)
    const [editingColumn, setEditingColumn] = useState<any>(null); // For permissions/props modal
    const [editingForm, setEditingForm] = useState<boolean>(false); // Toggle form designer mode

    // Form Designer State
    const [formSections, setFormSections] = useState<FormSection[]>([]);
    const [availableColumns, setAvailableColumns] = useState<string[]>([]);
    const [selectedFieldForProps, setSelectedFieldForProps] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

    // Force refresh when store updates
    useEffect(() => {
        const refresh = () => {
            setTables([...schemaStore.getTables()]);
            setRoles([...schemaStore.getRoles()]);
        };
        const unsub = schemaStore.subscribe(refresh);
        return unsub;
    }, []);

    // --- ACTIONS ---

    const handleAddTable = () => {
        if(!newTableName) return;
        const newTable = schemaStore.addTable(newTableName);
        setNewTableName('');
        // Auto-open the new module
        setSelectedModuleId(newTable.id);
    };

    const handleAddColumn = (tableId: string) => {
        const name = prompt("Veeru nimi:");
        if(!name) return;
        const key = name.toLowerCase().replace(/ /g, '_');
        schemaStore.addColumn(tableId, { key, label: name, type: 'text', width: 150 });
        
        // Update local state if in form designer
        if(editingForm && selectedModuleId === tableId) {
            setAvailableColumns(prev => [...prev, key]);
        }
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
        setRoles([...schemaStore.getRoles()]); 
    };

    const moveColumn = (tableId: string, colKey: string, direction: 'up' | 'down') => {
        schemaStore.moveColumn(tableId, colKey, direction);
        setTables([...schemaStore.getTables()]); 
    };

    // --- FORM DESIGNER LOGIC ---
    const initFormDesigner = (tableId: string) => {
        const table = schemaStore.getTable(tableId);
        if(!table) return;
        
        // Don't change selectedModuleId, just set editing mode
        setEditingForm(true);

        // Load existing layout or create default
        if (table.formLayout && table.formLayout.sections.length > 0) {
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
        if(selectedModuleId) {
            schemaStore.saveFormLayout(selectedModuleId, { sections: formSections });
            setEditingForm(false);
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
        let newAvail = availableColumns.filter(c => c !== colKey);
        const newSections = [...formSections];
        
        newSections.forEach(s => {
            s.columnKeys = s.columnKeys.filter(k => k !== colKey);
        });

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

    const updateColumnProperty = (colKey: string, updates: any) => {
        if (selectedModuleId) {
            schemaStore.updateColumn(selectedModuleId, colKey, updates);
            setTables([...schemaStore.getTables()]); 
            if(editingColumn && editingColumn.key === colKey) {
                setEditingColumn(prev => ({ ...prev, ...updates }));
            }
        }
    };
    
    const stats = schemaStore.getTotalStats();

    // --- RENDER HELPERS ---

    // Render the Module Detail View
    const renderModuleEditor = () => {
        const table = schemaStore.getTable(selectedModuleId!);
        if (!table) return <div>Moodulit ei leitud.</div>;

        return (
            <div className="flex flex-col h-full bg-white">
                {/* Editor Header */}
                <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-white sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setSelectedModuleId(null)} 
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-slate-800">{table.name}</h2>
                                {table.isSystem && <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Süsteemne</span>}
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {table.id} • {table.rows.length} kirjet</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <button 
                            onClick={() => initFormDesigner(table.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium text-sm transition-colors border border-indigo-200"
                        >
                            <Layout size={16} /> Vormi Disainer
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium text-sm transition-colors border border-slate-200">
                             <Lock size={16} /> Õigused
                        </button>
                    </div>
                </div>

                {/* Editor Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                    <div className="max-w-5xl mx-auto space-y-8">
                        
                        {/* Structure Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                                <div>
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <Columns size={18} className="text-teal-600"/>
                                        Veergude Haldus
                                    </h3>
                                    <p className="text-xs text-slate-500">Määra väljad ja nende tüübid.</p>
                                </div>
                                <button 
                                    onClick={() => handleAddColumn(table.id)}
                                    className="text-sm bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg hover:bg-teal-100 font-medium flex items-center gap-1"
                                >
                                    <Plus size={14} /> Lisa Väli
                                </button>
                            </div>
                            
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left w-12">#</th>
                                        <th className="px-6 py-3 text-left">Nimetus (Label)</th>
                                        <th className="px-6 py-3 text-left">Võti (Key)</th>
                                        <th className="px-6 py-3 text-left">Tüüp</th>
                                        <th className="px-6 py-3 text-center">Tegevused</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {table.columns.map((col, idx) => (
                                        <tr key={col.key} className="hover:bg-slate-50 group transition-colors">
                                            <td className="px-6 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                                            <td className="px-6 py-3 font-medium text-slate-700">
                                                <div className="flex items-center gap-2">
                                                    {col.label}
                                                    {col.validation?.required && <span className="text-red-500 text-xs" title="Kohustuslik">*</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-slate-500 font-mono text-xs">{col.key}</td>
                                            <td className="px-6 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border
                                                    ${col.type === 'reference' ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                                                      col.type === 'file' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                                                      col.type === 'image' ? 'bg-pink-50 text-pink-700 border-pink-100' : 
                                                      'bg-slate-100 text-slate-600 border-slate-200'}
                                                `}>
                                                    {col.type === 'reference' ? <LinkIconSmall /> : 
                                                     col.type === 'file' ? <FileText size={10}/> :
                                                     col.type === 'image' ? <ImageIcon size={10}/> :
                                                     <TypeIconSmall />}
                                                    {col.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => moveColumn(table.id, col.key, 'up')} disabled={idx === 0} className="p-1.5 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-30"><ArrowUp size={14}/></button>
                                                    <button onClick={() => moveColumn(table.id, col.key, 'down')} disabled={idx === table.columns.length - 1} className="p-1.5 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-30"><ArrowDown size={14}/></button>
                                                    <button onClick={() => setEditingColumn(col)} className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded"><Edit2 size={14}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-[1920px] mx-auto h-full flex flex-col bg-slate-50">
            {/* Header / Tabs - Hide if editing form */}
            {!editingForm && !selectedModuleId && (
                <div className="flex-shrink-0 bg-white border-b border-slate-200 px-8 pt-6">
                    <h1 className="text-2xl font-bold text-slate-800 mb-6">Süsteemi Seaded</h1>
                    
                    <div className="flex gap-8">
                        {/* Group: General */}
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setActiveTab('dashboard')}
                                className={`pb-3 px-3 flex items-center gap-2 text-sm font-medium transition-all border-b-2 ${activeTab === 'dashboard' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <Activity size={18} /> Ülevaade
                            </button>
                            <button 
                                onClick={() => setActiveTab('users')}
                                className={`pb-3 px-3 flex items-center gap-2 text-sm font-medium transition-all border-b-2 ${activeTab === 'users' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <Users size={18} /> Kasutajad
                            </button>
                        </div>
                        
                        <div className="w-px bg-slate-200 h-6 my-auto"></div>

                        {/* Group: Administration */}
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setActiveTab('modules')}
                                className={`pb-3 px-3 flex items-center gap-2 text-sm font-medium transition-all border-b-2 ${activeTab === 'modules' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <Server size={18} /> Moodulite Haldus
                            </button>
                            <button 
                                onClick={() => setActiveTab('permissions')}
                                className={`pb-3 px-3 flex items-center gap-2 text-sm font-medium transition-all border-b-2 ${activeTab === 'permissions' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <Shield size={18} /> Õigused
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-hidden flex flex-col relative">
                
                {/* --- DASHBOARD TAB --- */}
                {activeTab === 'dashboard' && !editingForm && !selectedModuleId && (
                    <div className="space-y-6 overflow-y-auto p-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard icon={<Database size={24} />} title="Ridade Arv" value={stats.totalRows.toLocaleString()} color="bg-blue-50 text-blue-600" />
                            <StatCard icon={<Server size={24} />} title="Aktiivsed Moodulid" value={stats.totalTables} color="bg-purple-50 text-purple-600" />
                            <StatCard icon={<HardDrive size={24} />} title="Andmebaasi Mootor" value="IndexedDB" color="bg-green-50 text-green-600" />
                        </div>
                    </div>
                )}

                {/* --- USERS TAB --- */}
                {activeTab === 'users' && !editingForm && !selectedModuleId && (
                    <div className="h-full p-6">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full overflow-hidden">
                            <DynamicDataGrid tableId="users" />
                        </div>
                    </div>
                )}

                {/* --- PERMISSIONS TAB --- */}
                {activeTab === 'permissions' && !editingForm && !selectedModuleId && (
                    <div className="space-y-8 overflow-y-auto p-8 custom-scrollbar">
                        {/* Roles */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-slate-800">Rollid</h3>
                                <button onClick={() => setIsAddingRole(!isAddingRole)} className="text-sm bg-teal-50 text-teal-700 px-3 py-1.5 rounded hover:bg-teal-100 flex items-center gap-1 font-medium"><Plus size={14}/> Uus</button>
                            </div>
                            {isAddingRole && (
                                <div className="mb-4 p-4 bg-slate-50 rounded border border-slate-200 flex gap-4 items-end">
                                    <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Rolli nimi" className="border px-3 py-1.5 rounded text-sm"/>
                                    <input type="color" value={newRoleColor} onChange={e => setNewRoleColor(e.target.value)} className="h-8 w-8 cursor-pointer border rounded"/>
                                    <button onClick={handleCreateRole} className="bg-teal-600 text-white px-3 py-1.5 rounded text-sm">Loo</button>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-3">
                                {roles.map(role => (
                                    <div key={role.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium" style={{ borderColor: role.color + '40', backgroundColor: role.color + '10', color: role.color }}>
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }}></span>
                                        {role.name}
                                        {!role.isSystem && <button onClick={() => handleDeleteRole(role.id)}><Trash2 size={12} className="opacity-50 hover:opacity-100 hover:text-red-500"/></button>}
                                        {role.isSystem && <Lock size={10} className="opacity-50"/>}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Matrix */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4 font-medium text-slate-500 w-64">Moodul</th>
                                        {roles.map(r => <th key={r.id} className="py-3 px-4 text-center" style={{color: r.color}}>{r.name}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tables.map(t => (
                                        <tr key={t.id} className="hover:bg-slate-50">
                                            <td className="py-3 px-4 font-medium text-slate-700">{t.name}</td>
                                            {roles.map(r => {
                                                const p = schemaStore.getPermission(r.id, t.id);
                                                return (
                                                    <td key={r.id} className="text-center p-2">
                                                        <div className="flex justify-center gap-1">
                                                            {['view','create','edit','delete'].map(k => (
                                                                <button 
                                                                    key={k} 
                                                                    disabled={r.id === 'admin'}
                                                                    onClick={() => togglePermission(r.id, t.id, k as any)}
                                                                    className={`w-6 h-6 rounded text-[10px] font-bold border ${p[k as keyof PermissionRule] ? 'bg-teal-100 text-teal-700 border-teal-200' : 'bg-white text-slate-300 border-slate-200'}`}
                                                                >
                                                                    {k[0].toUpperCase()}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- MODULES TAB (Master View) --- */}
                {activeTab === 'modules' && !editingForm && !selectedModuleId && (
                    <div className="space-y-6 overflow-y-auto p-8 custom-scrollbar">
                        
                        {/* Create Module Header */}
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Andmemoodulid</h2>
                                <p className="text-sm text-slate-500">Siin saad luua ja hallata süsteemi andmetabeleid ja nende struktuuri.</p>
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    value={newTableName}
                                    onChange={e => setNewTableName(e.target.value)}
                                    placeholder="Uue mooduli nimi..."
                                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                                <button 
                                    onClick={handleAddTable}
                                    className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 shadow-sm flex items-center gap-2"
                                >
                                    <Plus size={16}/> Loo
                                </button>
                            </div>
                        </div>

                        {/* Modules Table (Compact List) */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                             <table className="w-full text-sm text-left">
                                 <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                     <tr>
                                         <th className="px-6 py-3">Mooduli Nimi</th>
                                         <th className="px-6 py-3">Süsteemi ID</th>
                                         <th className="px-6 py-3 text-center">Veerge</th>
                                         <th className="px-6 py-3 text-center">Kirjeid</th>
                                         <th className="px-6 py-3 text-right">Tegevused</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                     {tables.map(table => (
                                         <tr 
                                            key={table.id} 
                                            onClick={() => setSelectedModuleId(table.id)}
                                            className="hover:bg-blue-50/50 cursor-pointer group transition-colors"
                                         >
                                             <td className="px-6 py-4 font-medium text-slate-700 flex items-center gap-3">
                                                 <div className={`p-2 rounded-lg ${table.isSystem ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                                     <Database size={16} />
                                                 </div>
                                                 <div>
                                                     {table.name}
                                                     {table.isSystem && <span className="ml-2 text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200">SYS</span>}
                                                 </div>
                                             </td>
                                             <td className="px-6 py-4 font-mono text-xs text-slate-400">
                                                 {table.id}
                                             </td>
                                             <td className="px-6 py-4 text-center">
                                                 <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{table.columns.length}</span>
                                             </td>
                                             <td className="px-6 py-4 text-center">
                                                 <span className="text-slate-600">{table.rows.length.toLocaleString()}</span>
                                             </td>
                                             <td className="px-6 py-4 text-right">
                                                 <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                     <button className="text-xs text-indigo-600 hover:underline font-medium bg-indigo-50 px-2 py-1 rounded border border-indigo-100">Ava Seaded</button>
                                                 </div>
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                        </div>
                    </div>
                )}

                {/* --- MODULE DETAIL EDITOR (Master-Detail) --- */}
                {selectedModuleId && !editingForm && renderModuleEditor()}

                {/* --- FORM DESIGNER (Overlay) --- */}
                {editingForm && selectedModuleId && (
                    <div className="fixed inset-0 bg-slate-100 z-50 flex flex-col animate-in fade-in duration-200">
                        {/* Header */}
                        <div className="h-14 bg-white border-b border-slate-200 px-6 flex justify-between items-center shadow-sm flex-shrink-0">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Layout size={20} className="text-indigo-600" />
                                Vormi Disainer: {schemaStore.getTable(selectedModuleId)?.name}
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1">
                                    <button 
                                        onClick={() => setPreviewMode('desktop')}
                                        className={`p-1.5 rounded ${previewMode === 'desktop' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <Monitor size={16} />
                                    </button>
                                    <button 
                                        onClick={() => setPreviewMode('mobile')}
                                        className={`p-1.5 rounded ${previewMode === 'mobile' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <Smartphone size={16} />
                                    </button>
                                </div>
                                <div className="h-6 w-px bg-slate-200"></div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm font-medium">Katkesta</button>
                                    <button onClick={saveFormLayout} className="px-5 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                                        <Save size={16} /> Salvesta Paigutus
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Left Panel: Structure Editor */}
                            <div className="w-[350px] border-r border-slate-200 bg-white flex flex-col overflow-hidden shadow-lg z-10">
                                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase">Struktuur</h4>
                                    <button onClick={addSection} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 font-medium">+ Lisa Sektsioon</button>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                     {formSections.map((section, idx) => (
                                         <div key={section.id} className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
                                             <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center group">
                                                 <input 
                                                    value={section.title}
                                                    onChange={(e) => {
                                                        const ns = [...formSections];
                                                        ns[idx].title = e.target.value;
                                                        setFormSections(ns);
                                                    }}
                                                    className="font-bold text-slate-700 bg-transparent focus:bg-white border border-transparent focus:border-indigo-300 rounded px-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                                 />
                                                 <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                     <button 
                                                        onClick={() => toggleSectionLayout(idx)}
                                                        className={`p-1 rounded ${section.isTwoColumn ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
                                                        title={section.isTwoColumn ? "2 Tulpa" : "1 Tulp"}
                                                     >
                                                         {section.isTwoColumn ? <Columns size={14} /> : <ListIcon />}
                                                     </button>
                                                     <button 
                                                        onClick={() => {
                                                            if(confirm("Kustuta sektsioon? Väljad liiguvad tagasi panka.")) {
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
                                                     const col = schemaStore.getTable(selectedModuleId!)?.columns.find(c => c.key === colKey);
                                                     const isSelected = selectedFieldForProps === colKey;
                                                     return (
                                                         <div 
                                                            key={colKey} 
                                                            className={`p-2 rounded border flex justify-between items-center group cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-300 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'}`}
                                                            onClick={() => setSelectedFieldForProps(colKey)}
                                                         >
                                                             <div className="flex items-center gap-2">
                                                                 <div className="w-1.5 h-6 rounded-full bg-slate-200 group-hover:bg-slate-300 cursor-move"></div>
                                                                 <span className="text-sm text-slate-700 font-medium">{col?.label || colKey}</span>
                                                                 {col?.validation?.required && <span className="text-red-500 text-xs">*</span>}
                                                             </div>
                                                             <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                                                 <button onClick={(e) => {
                                                                     e.stopPropagation();
                                                                     if(colIdx > 0) {
                                                                         const ns = [...formSections];
                                                                         const temp = ns[idx].columnKeys[colIdx];
                                                                         ns[idx].columnKeys[colIdx] = ns[idx].columnKeys[colIdx-1];
                                                                         ns[idx].columnKeys[colIdx-1] = temp;
                                                                         setFormSections(ns);
                                                                     }
                                                                 }}><ArrowUp size={12} className="text-slate-300 hover:text-slate-600" /></button>
                                                                 <button onClick={(e) => { e.stopPropagation(); moveColToSection(colKey, -1); }}><X size={12} className="text-red-300 hover:text-red-500" /></button>
                                                             </div>
                                                         </div>
                                                     )
                                                 })}
                                                 {section.columnKeys.length === 0 && <p className="text-xs text-center text-slate-400 py-4 border-2 border-dashed border-slate-200 rounded">Lohista veerud siia</p>}
                                             </div>
                                         </div>
                                     ))}
                                     
                                     {/* Unused Columns Pool */}
                                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                          <div className="flex justify-between items-center mb-3">
                                               <h4 className="text-xs font-bold text-slate-500 uppercase">Kasutamata Väljad</h4>
                                               <button onClick={() => handleAddColumn(selectedModuleId!)} className="text-xs bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-50 flex items-center gap-1">
                                                   <Plus size={10} /> Uus Veerg
                                               </button>
                                          </div>
                                          <div className="space-y-2">
                                              {availableColumns.length === 0 && <p className="text-xs text-slate-400 italic">Kõik väljad on kasutusel.</p>}
                                              {availableColumns.map(colKey => {
                                                  const col = schemaStore.getTable(selectedModuleId!)?.columns.find(c => c.key === colKey);
                                                  return (
                                                      <div key={colKey} className="flex justify-between items-center p-2 bg-white border border-slate-200 rounded shadow-sm hover:border-teal-400 group">
                                                          <span className="text-sm font-medium text-slate-600">{col?.label}</span>
                                                          <button onClick={() => moveColToSection(colKey, 0)} className="text-teal-600 bg-teal-50 hover:bg-teal-100 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={14}/></button>
                                                      </div>
                                                  )
                                              })}
                                          </div>
                                     </div>
                                </div>
                            </div>

                            {/* Middle Panel: Live Preview */}
                            <div className="flex-1 bg-slate-100/50 p-8 overflow-y-auto flex flex-col items-center relative">
                                <div className="absolute inset-0 pattern-grid opacity-5 pointer-events-none"></div>
                                
                                <div className="mb-4 flex flex-col items-center">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Live Eelvaade</h4>
                                    <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">{previewMode === 'desktop' ? '600px laius' : '375px laius'}</span>
                                </div>

                                <div 
                                    className={`bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 ${previewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-2xl'}`}
                                    style={{ minHeight: '500px' }}
                                >
                                     {/* Mock Modal Header */}
                                     <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                                         <h3 className="text-lg font-bold text-slate-800">Muuda Kirjet</h3>
                                         <button className="p-2 rounded-full bg-slate-50 text-slate-300"><X size={20} /></button>
                                     </div>
                                     
                                     {/* Mock Form Content */}
                                     <div className="p-6 space-y-8 flex-1">
                                         {formSections.map(section => (
                                             <div key={section.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                 <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                                    <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                                                    {section.title}
                                                 </h5>
                                                 <div className={`grid gap-5 ${section.isTwoColumn ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                     {section.columnKeys.map(colKey => {
                                                         const col = schemaStore.getTable(selectedModuleId!)?.columns.find(c => c.key === colKey);
                                                         if(!col) return null;
                                                         const isSelected = selectedFieldForProps === colKey;
                                                         
                                                         return (
                                                             <div 
                                                                key={colKey} 
                                                                className={`relative group cursor-pointer p-2 rounded -m-2 transition-all ${isSelected ? 'bg-indigo-50/50 ring-2 ring-indigo-400/30' : 'hover:bg-slate-50'}`} 
                                                                onClick={() => setSelectedFieldForProps(colKey)}
                                                             >
                                                                 <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex justify-between">
                                                                     <span>{col.label} {col.validation?.required && <span className="text-red-500">*</span>}</span>
                                                                     {isSelected && <span className="text-[10px] text-indigo-500 bg-indigo-100 px-1 rounded">Valitud</span>}
                                                                 </label>
                                                                 <div className={`
                                                                    w-full border rounded-lg px-3 py-2.5 text-sm bg-white shadow-sm border-slate-300 text-slate-400 flex items-center justify-between
                                                                    ${col.style?.textSize === 'sm' ? 'text-xs' : col.style?.textSize === 'lg' ? 'text-lg' : 'text-sm'}
                                                                    ${col.style?.bold ? 'font-bold' : ''}
                                                                 `}>
                                                                     <span>Sisesta {col.label.toLowerCase()}...</span>
                                                                     {col.type === 'date' && <span className="opacity-50">📅</span>}
                                                                     {col.type === 'select' && <span className="opacity-50">▼</span>}
                                                                 </div>
                                                             </div>
                                                         )
                                                     })}
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                </div>
                            </div>

                            {/* Right Panel: Properties */}
                            <div className={`w-[320px] bg-white border-l border-slate-200 flex flex-col transition-transform duration-300 z-20 shadow-xl ${selectedFieldForProps ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full'}`}>
                                <div className="h-14 border-b border-slate-100 flex items-center justify-between px-4 bg-slate-50">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-2"><Sliders size={16}/> Välja Seaded</h4>
                                    <button onClick={() => setSelectedFieldForProps(null)} className="p-1 hover:bg-slate-200 rounded text-slate-400"><X size={16} /></button>
                                </div>
                                
                                {selectedFieldForProps && (() => {
                                    const col = schemaStore.getTable(selectedModuleId!)?.columns.find(c => c.key === selectedFieldForProps);
                                    if(!col) return null;
                                    
                                    return (
                                        <div className="p-6 space-y-8 overflow-y-auto">
                                            {/* Basic Info */}
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Silt (Label)</label>
                                                    <input 
                                                        value={col.label} 
                                                        onChange={(e) => updateColumnProperty(col.key, { label: e.target.value })}
                                                        className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Andmetüüp</label>
                                                    <select
                                                        value={col.type}
                                                        onChange={(e) => updateColumnProperty(col.key, { type: e.target.value })}
                                                        className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                                    >
                                                        <option value="text">Tekst</option>
                                                        <option value="number">Number</option>
                                                        <option value="date">Kuupäev</option>
                                                        <option value="select">Valikud (Select)</option>
                                                        <option value="status">Staatus</option>
                                                        <option value="file">Fail / Dokument</option>
                                                        <option value="image">Pilt / Meedia</option>
                                                        <option value="reference">Viide (Reference)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Type Specific Settings */}
                                            {(col.type === 'file' || col.type === 'image') && (
                                                <div className="border-t border-slate-100 pt-6">
                                                     <h5 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><HardDrive size={14} className="text-orange-500"/> Failihalduse Seaded</h5>
                                                     <div className="space-y-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
                                                        <p className="text-xs text-orange-800 mb-2">Seadista, kuidas faile sellel väljal käsitletakse.</p>
                                                        <label className="flex items-center gap-3 text-sm text-slate-700">
                                                            <input type="checkbox" className="w-4 h-4 text-teal-600 rounded" />
                                                            <span>Luba mitu faili</span>
                                                        </label>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Max faili suurus (MB)</label>
                                                            <input type="number" placeholder="10" className="w-full border border-slate-300 rounded p-1.5 text-sm"/>
                                                        </div>
                                                     </div>
                                                </div>
                                            )}

                                            {/* Validation Rules */}
                                            <div className="border-t border-slate-100 pt-6">
                                                <h5 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Shield size={14} className="text-teal-500"/> Valideerimine</h5>
                                                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                    <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer select-none">
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${col.validation?.required ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-slate-300'}`}>
                                                            {col.validation?.required && <Check size={12} strokeWidth={4} />}
                                                        </div>
                                                        <input 
                                                            type="checkbox" 
                                                            className="hidden"
                                                            checked={col.validation?.required || false}
                                                            onChange={(e) => updateColumnProperty(col.key, { validation: { ...col.validation, required: e.target.checked } })}
                                                        />
                                                        <span className="font-medium">Kohustuslik väli</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Column Permission Modal */}
            <Modal
                isOpen={!!editingColumn}
                onClose={() => setEditingColumn(null)}
                title={`Veeru seaded: ${editingColumn?.label}`}
                type="center"
            >
                {editingColumn && selectedModuleId && (
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
                                             const perm = schemaStore.getColumnPermission(role.id, selectedModuleId, editingColumn.key);
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
                                                            onChange={() => toggleColPermission(role.id, selectedModuleId, editingColumn.key, 'view')}
                                                         />
                                                     </td>
                                                     <td className="p-2 text-center">
                                                          <input 
                                                            type="checkbox" 
                                                            disabled={isAdmin}
                                                            checked={perm.edit} 
                                                            onChange={() => toggleColPermission(role.id, selectedModuleId, editingColumn.key, 'edit')}
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

// StatCard Component
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className={`p-4 rounded-xl ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        </div>
    </div>
);

// Icons
const ListIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
)
const Check = ({ size, strokeWidth }: { size: number, strokeWidth: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}><polyline points="20 6 9 17 4 12"></polyline></svg>
)
const LinkIconSmall = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
const TypeIconSmall = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>;
