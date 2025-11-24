
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TableDefinition, SortConfig, ColumnDefinition, ContextMenuState, ViewMode, GridFocus, SavedView } from '../types';
import { schemaStore } from '../services/schemaStore';
import { analyzeImageContent } from '../services/geminiService';
import { Search, Filter, Download, MoreHorizontal, Plus, ChevronUp, ChevronDown, ArrowUpDown, Settings as SettingsIcon, Copy, Trash2, FileText, Edit, EyeOff, LayoutGrid, Table as TableIcon, Calendar as CalendarIcon, Image as ImageIcon, Sparkles, CheckSquare, Save, KanbanSquare } from 'lucide-react';
import { Modal } from './Modal';
import { Timeline } from './Timeline';

interface DynamicDataGridProps {
    tableId: string;
}

const ROW_HEIGHT = 40;
const OVERSCAN = 10;

// Mock current user role for demo purposes. In real app, get from Auth Context.
const CURRENT_USER_ROLE = 'admin'; // Try changing to 'worker' to test permissions

export const DynamicDataGrid: React.FC<DynamicDataGridProps> = ({ tableId }) => {
    const [tableData, setTableData] = useState<TableDefinition | undefined>(schemaStore.getTable(tableId));
    const [referenceMaps, setReferenceMaps] = useState<Record<string, Record<string, string>>>({});
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    
    // View Management
    const [activeViewId, setActiveViewId] = useState<string | null>(null);
    const [hiddenColumnKeys, setHiddenColumnKeys] = useState<Set<string>>(new Set());

    // Virtualization State
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(600);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Interaction State
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, rowId: null });
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
    const lastSelectedRowId = useRef<string | null>(null); // For Shift+Click range
    
    // Excel-like navigation & Inline Editing
    const [focusedCell, setFocusedCell] = useState<GridFocus | null>(null);
    const [editingCell, setEditingCell] = useState<GridFocus | null>(null); // Inline edit state
    const [editingValue, setEditingValue] = useState<string>('');
    
    // Modals State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
    const [newViewName, setNewViewName] = useState('');

    const [editingRow, setEditingRow] = useState<any>(null); // For Modal editing
    const [formData, setFormData] = useState<any>({});
    const [processingFiles, setProcessingFiles] = useState<boolean>(false);

    // Refresh data when tableId changes or store updates
    useEffect(() => {
        const updateData = () => {
            const t = schemaStore.getTable(tableId);
            setTableData(t ? JSON.parse(JSON.stringify(t)) : undefined);
            
            // Reset view state on table switch
            if (t && (!tableData || t.id !== tableData.id)) {
                 setActiveViewId(null);
                 setFilters({});
                 setSortConfig(null);
                 
                 // Initialize hidden columns based on Global + Permissions
                 const initialHidden = new Set<string>();
                 t.columns.forEach(c => {
                     if (c.hidden) initialHidden.add(c.key);
                     // Check field level security
                     const perm = schemaStore.getColumnPermission(CURRENT_USER_ROLE, t.id, c.key);
                     if (!perm.view) initialHidden.add(c.key);
                 });
                 setHiddenColumnKeys(initialHidden);
                 setViewMode('grid');
                 setEditingCell(null);
                 setSelectedRowIds(new Set());
            }
        };

        updateData();
        const unsubscribe = schemaStore.subscribe(updateData);
        
        // Build Lookup Maps
        const t = schemaStore.getTable(tableId);
        if (t) {
            const maps: Record<string, Record<string, string>> = {};
            t.columns.forEach(col => {
                if (col.type === 'reference' && col.referenceTableId && col.referenceLabelKey) {
                    maps[col.key] = schemaStore.getLookupMap(col.referenceTableId, col.referenceLabelKey);
                }
            });
            setReferenceMaps(maps);
        }

        return unsubscribe;
    }, [tableId]); // Only depend on tableId changes for reset logic

    // Process Data - Moved up to be available for keyboard handlers
    const processedData = useMemo(() => {
        if (!tableData) return [];
        let result = [...tableData.rows];

        // 1. Filter
        if (Object.keys(filters).length > 0) {
            result = result.filter(row => {
                return Object.entries(filters).every(([key, value]) => {
                    if (!value) return true;
                    const cellValue = row[key];
                    return String(cellValue).toLowerCase().includes(String(value).toLowerCase());
                });
            });
        }

        // 2. Sort
        if (sortConfig) {
            result.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                const colDef = tableData.columns.find(c => c.key === sortConfig.key);
                if (colDef?.type === 'reference') {
                    aVal = referenceMaps[sortConfig.key]?.[aVal] || aVal;
                    bVal = referenceMaps[sortConfig.key]?.[bVal] || bVal;
                }
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [tableData, filters, sortConfig, referenceMaps]);

    // --- VIEW LOADING LOGIC ---
    const loadView = (view: SavedView) => {
        setActiveViewId(view.id);
        setViewMode(view.viewMode);
        setFilters(view.filters);
        setSortConfig(view.sortConfig);
        setHiddenColumnKeys(new Set(view.hiddenColumnKeys));
    };
    
    const handleSaveView = () => {
        if(!newViewName) return;
        const newView: SavedView = {
            id: `view_${Date.now()}`,
            name: newViewName,
            viewMode: viewMode,
            filters: { ...filters },
            sortConfig: sortConfig,
            hiddenColumnKeys: Array.from(hiddenColumnKeys)
        };
        schemaStore.addView(tableId, newView);
        setActiveViewId(newView.id);
        setIsSaveViewModalOpen(false);
        setNewViewName('');
    };

    const handleDeleteView = (viewId: string) => {
        if(confirm("Kas soovid selle vaate kustutada?")) {
            schemaStore.deleteView(tableId, viewId);
            if(activeViewId === viewId) setActiveViewId(null);
        }
    }

    // --- INLINE EDITING LOGIC ---
    const startEditing = (rowIndex: number, colKey: string, initialValue: string) => {
        // Check edit permission
        const perm = schemaStore.getColumnPermission(CURRENT_USER_ROLE, tableId, colKey);
        if (!perm.edit) return;

        setEditingCell({ rowIndex, colKey });
        setEditingValue(initialValue);
    };

    const commitEditing = () => {
        if (editingCell) {
            const row = processedData[editingCell.rowIndex];
            if (row) {
                schemaStore.updateRow(tableId, row.id, { [editingCell.colKey]: editingValue });
            }
            setEditingCell(null);
        }
    };

    const cancelEditing = () => {
        setEditingCell(null);
        setEditingValue('');
    };
    
    const handleFooterAdd = () => {
        // Add empty row
        const newId = schemaStore.addRow(tableId, {});
        // Immediately focus first editable cell
        if(newId) {
             // We need to wait for store update loop, but for now we can select it
             // In real app, we'd use a callback or effect
             // Simple fallback: open modal
             handleEdit({id: newId});
        }
    }

    // --- KEYBOARD & FOCUS LOGIC ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isAddModalOpen || isSettingsModalOpen || isSaveViewModalOpen) return;

            // If editing inline
            if (editingCell) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commitEditing();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEditing();
                }
                return;
            }

            if (!focusedCell) return;

            // Arrow keys for Navigation
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                let { rowIndex, colKey } = focusedCell;
                const visibleCols = tableData?.columns.filter(c => !hiddenColumnKeys.has(c.key)) || [];
                const colIdx = visibleCols.findIndex(c => c.key === colKey);
                
                if (e.key === 'ArrowUp' && rowIndex > 0) rowIndex--;
                if (e.key === 'ArrowDown' && rowIndex < (processedData.length - 1)) rowIndex++;
                if (e.key === 'ArrowLeft' && colIdx > 0) colKey = visibleCols[colIdx - 1].key;
                if (e.key === 'ArrowRight' && colIdx < visibleCols.length - 1) colKey = visibleCols[colIdx + 1].key;

                setFocusedCell({ rowIndex, colKey });
                
                // Scroll into view logic (simplified)
                const rowEl = document.getElementById(`row-${rowIndex}`);
                if(rowEl) rowEl.scrollIntoView({ block: 'nearest' });
            }
            
            // Enter to Edit
            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                const row = processedData[focusedCell.rowIndex];
                if(row) {
                    startEditing(focusedCell.rowIndex, focusedCell.colKey, String(row[focusedCell.colKey] || ''));
                }
            }
            
            // Copy (Ctrl+C)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                const row = processedData[focusedCell.rowIndex];
                if(row) {
                    const val = row[focusedCell.colKey];
                    navigator.clipboard.writeText(String(val || ''));
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [focusedCell, processedData, hiddenColumnKeys, isAddModalOpen, tableId, editingCell, editingValue]);

    useEffect(() => {
        const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [contextMenu]);

    // Resize Observer for Virtualization
    useEffect(() => {
        if (scrollContainerRef.current) {
            const observer = new ResizeObserver(entries => {
                if(entries[0]) setContainerHeight(entries[0].contentRect.height);
            });
            observer.observe(scrollContainerRef.current);
            return () => observer.disconnect();
        }
    }, []);

    if (!tableData) return <div className="p-8 text-slate-400">Tabelit ei leitud.</div>;

    // Virtualization
    const totalHeight = processedData.length * ROW_HEIGHT;
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const endIndex = Math.min(processedData.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN);
    const visibleRows = processedData.slice(startIndex, endIndex);
    const paddingTop = startIndex * ROW_HEIGHT;
    
    // Aggregations
    const calculateTotal = (key: string) => {
        return processedData.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
    }

    // Handlers
    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleContextMenu = (e: React.MouseEvent, rowId: string) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            rowId
        });
        // Select row on right click if not already selected
        if (!selectedRowIds.has(rowId)) {
            setSelectedRowIds(new Set([rowId]));
            lastSelectedRowId.current = rowId;
        }
    };

    const handleRowClick = (rowId: string, rowIndex: number, e: React.MouseEvent) => {
        if (e.shiftKey && lastSelectedRowId.current) {
            // Range selection
            const lastIdx = processedData.findIndex(r => r.id === lastSelectedRowId.current);
            if (lastIdx !== -1) {
                const start = Math.min(lastIdx, rowIndex);
                const end = Math.max(lastIdx, rowIndex);
                const newSet = new Set(selectedRowIds);
                for (let i = start; i <= end; i++) {
                    newSet.add(processedData[i].id);
                }
                setSelectedRowIds(newSet);
            }
        } else if (e.ctrlKey || e.metaKey) {
            // Multi select
            const newSet = new Set(selectedRowIds);
            if (newSet.has(rowId)) newSet.delete(rowId);
            else newSet.add(rowId);
            setSelectedRowIds(newSet);
            lastSelectedRowId.current = rowId;
        } else {
             // Single select (optional, usually click selects cell not row)
             // Keeping it simple: clicking row bg selects row? 
             // Currently clicking selects cell, row selection is auxiliary.
        }
    };
    
    const handleCellClick = (rowIndex: number, colKey: string) => {
        setFocusedCell({ rowIndex, colKey });
    };

    const handleDuplicate = () => {
        if (contextMenu.rowId) {
            schemaStore.duplicateRow(tableId, contextMenu.rowId);
        }
    };

    const handleDelete = () => {
        if (contextMenu.rowId) {
            if (confirm('Kas oled kindel, et soovid rea kustutada?')) {
                schemaStore.deleteRow(tableId, contextMenu.rowId);
            }
        }
    };
    
    const toggleColumnVisibility = (key: string) => {
        const newSet = new Set(hiddenColumnKeys);
        if(newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
        setHiddenColumnKeys(newSet);
    }

    const handleEdit = (row?: any) => {
        const targetRow = row || (contextMenu.rowId ? tableData.rows.find(r => r.id === contextMenu.rowId) : null);
        if(targetRow) {
            setEditingRow(targetRow);
            setFormData({...targetRow});
            setIsAddModalOpen(true);
        }
    };

    const handleSaveForm = async () => {
        // 1. Save row immediately
        let rowId = editingRow ? editingRow.id : null;
        const isNew = !rowId;
        
        if (isNew) {
            rowId = schemaStore.addRow(tableId, formData);
        } else {
            schemaStore.updateRow(tableId, rowId, formData);
        }

        // 2. Trigger AI Analysis if Image/File changed
        const fileColumns = tableData.columns.filter(c => c.type === 'image' || c.type === 'file');
        for (const col of fileColumns) {
             const url = formData[col.key];
             if (url && (isNew || url !== editingRow[col.key])) {
                 setProcessingFiles(true);
                 // Only simulate if we have corresponding AI columns
                 const hasAiTags = tableData.columns.some(c => c.key === 'ai_tags');
                 if (hasAiTags) {
                     const analysis = await analyzeImageContent(url);
                     schemaStore.updateRow(tableId, rowId, {
                         ai_tags: analysis.tags,
                         ai_description: analysis.description,
                         ai_summary: analysis.description 
                     });
                 }
             }
        }
        
        setProcessingFiles(false);
        setIsAddModalOpen(false);
        setEditingRow(null);
        setFormData({});
    };

    // --- FORM RENDERING (MODAL) ---
    const renderInputForColumn = (col: ColumnDefinition) => {
        const perm = schemaStore.getColumnPermission(CURRENT_USER_ROLE, tableId, col.key);
        if (!perm.view) return null; // Don't render hidden fields

        const isDisabled = !perm.edit;

        // Apply Styles
        const inputStyle = `
            w-full border border-slate-300 rounded p-2 
            disabled:bg-slate-100 disabled:text-slate-400
            ${col.style?.textSize === 'sm' ? 'text-xs' : col.style?.textSize === 'lg' ? 'text-lg' : 'text-sm'}
            ${col.style?.bold ? 'font-bold' : ''}
        `;

        let content;
        if (col.type === 'select' || col.type === 'status') {
            content = (
                <select 
                    className={inputStyle}
                    value={formData[col.key] || ''}
                    onChange={e => setFormData({...formData, [col.key]: e.target.value})}
                    disabled={isDisabled}
                    required={col.validation?.required}
                >
                    <option value="">- Vali -</option>
                    {col.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    {col.type === 'status' && ['active', 'inactive', 'Töös', 'Planeerimisel', 'Lõpetatud', 'client', 'supplier'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            );
        } else if (col.type === 'image') {
            content = (
                <div className="space-y-2">
                    {!isDisabled && (
                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setFormData({...formData, [col.key]: `https://source.unsplash.com/random/400x300?construction&sig=${Date.now()}`})}>
                            {formData[col.key] ? (
                                <div className="relative">
                                    <img src={formData[col.key]} alt="Preview" className="w-full h-32 object-cover rounded" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs opacity-0 hover:opacity-100">Muuda pilti</div>
                                </div>
                            ) : (
                                <div className="text-slate-400 text-xs">
                                    <ImageIcon className="mx-auto mb-1" />
                                    Kliki siia et lisada pilt (Simulatsioon)
                                </div>
                            )}
                        </div>
                    )}
                    {isDisabled && formData[col.key] && (
                        <img src={formData[col.key]} alt="View" className="w-full h-32 object-cover rounded" />
                    )}
                    <p className="text-[10px] text-slate-400">Pildi lisamisel analüüsib AI seda automaatselt.</p>
                </div>
            );
        } else if (col.type === 'long_text') {
            content = (
                <textarea 
                    className={`${inputStyle} h-24`}
                    value={formData[col.key] || ''}
                    onChange={e => setFormData({...formData, [col.key]: e.target.value})}
                    disabled={isDisabled}
                    required={col.validation?.required}
                />
            );
        } else {
            content = (
                <input 
                    type={col.type === 'number' || col.type === 'currency' || col.type === 'progress' ? 'number' : (col.type === 'date' ? 'date' : 'text')}
                    className={inputStyle}
                    value={formData[col.key] || ''}
                    onChange={e => setFormData({...formData, [col.key]: e.target.value})}
                    disabled={isDisabled}
                    required={col.validation?.required}
                    minLength={col.validation?.minLength}
                    maxLength={col.validation?.maxLength}
                />
            );
        }

        return (
            <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                    {col.label}
                    {col.validation?.required && <span className="text-red-500">*</span>}
                    {col.type === 'image' && <Sparkles size={10} className="text-teal-500" />}
                    {isDisabled && <span className="ml-auto text-[10px] bg-slate-100 px-1 rounded text-slate-400 font-normal normal-case">Read-only</span>}
                </label>
                {content}
            </div>
        )
    };

    // --- CELL RENDERING ---
    const renderCell = (row: any, col: ColumnDefinition, actualIndex: number) => {
        // Inline Editing Check
        const isEditing = editingCell?.rowIndex === actualIndex && editingCell?.colKey === col.key;
        
        if (isEditing) {
            return (
                <input 
                    autoFocus
                    className="w-full h-full px-1 border-2 border-indigo-500 rounded-sm outline-none text-sm bg-white shadow-lg z-10"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={commitEditing}
                    onClick={(e) => e.stopPropagation()}
                />
            )
        }

        // Check Field Level Security for viewing
        const perm = schemaStore.getColumnPermission(CURRENT_USER_ROLE, tableId, col.key);
        if(!perm.view) return <span className="text-slate-300 italic text-xs">Peidetud</span>;

        const val = row[col.key];

        // Style Application
        const textStyle = `
            ${col.style?.textSize === 'sm' ? 'text-xs' : col.style?.textSize === 'lg' ? 'text-lg' : 'text-sm'}
            ${col.style?.bold ? 'font-bold' : ''}
        `;

        if (col.type === 'reference') {
            const label = referenceMaps[col.key]?.[val];
            return (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center text-xs font-medium">
                    {label || val || <span className="text-red-300 italic">Puudub</span>}
                </span>
            );
        }
        if (col.type === 'status' || col.type === 'select') {
            const colors: Record<string, string> = {
                'active': 'bg-green-100 text-green-800',
                'inactive': 'bg-slate-100 text-slate-600',
                'Töös': 'bg-blue-100 text-blue-800',
                'Lõpetatud': 'bg-green-100 text-green-800',
                'Planeerimisel': 'bg-yellow-100 text-yellow-800',
                'Peatatud': 'bg-red-100 text-red-800',
                'client': 'bg-purple-100 text-purple-800',
                'supplier': 'bg-orange-100 text-orange-800',
                'PDF': 'bg-red-50 text-red-700',
                'Joonis': 'bg-indigo-50 text-indigo-700'
            };
            return (
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${colors[val] || 'bg-gray-100'}`}>
                    {val}
                </span>
            );
        }
        if (col.type === 'tags') {
             if (!val || !Array.isArray(val)) return null;
             return (
                 <div className="flex gap-1 overflow-hidden">
                     {val.slice(0, 2).map((tag: string, i: number) => (
                         <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-[10px] rounded text-slate-600 border border-slate-200 truncate">
                             {tag}
                         </span>
                     ))}
                     {val.length > 2 && <span className="text-[9px] text-slate-400 self-center">+{val.length - 2}</span>}
                 </div>
             )
        }
        if (col.type === 'currency') {
            return <span className={`font-mono ${textStyle}`}>{Number(val).toLocaleString('et-EE', { style: 'currency', currency: 'EUR' })}</span>;
        }
        if (col.type === 'image' || col.type === 'file') {
             const isImg = col.type === 'image' || (val && (val.endsWith('.jpg') || val.endsWith('.png')));
             
             if (isImg && val) {
                 return (
                    <div className="group relative flex items-center gap-2">
                        <img src={val} alt="img" className="h-8 w-8 rounded object-cover border border-slate-200" />
                        {/* AI Indicator */}
                        {row.ai_tags && row.ai_tags.length > 0 && (
                            <div className="absolute -top-1 -right-1 bg-teal-100 text-teal-700 rounded-full p-0.5 border border-white shadow-sm">
                                <Sparkles size={8} fill="currentColor" />
                            </div>
                        )}
                        {row.ai_description && (
                            <div className="absolute left-10 top-0 bg-slate-800 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 w-48 shadow-xl">
                                {row.ai_description}
                            </div>
                        )}
                    </div>
                 );
             }
             return <span className="text-slate-300 text-xs truncate max-w-[100px]">{val || 'Puudub'}</span>;
        }
        if (col.type === 'progress') {
             const pct = Math.min(100, Math.max(0, Number(val) || 0));
             let color = 'bg-teal-500';
             if (pct > 90) color = 'bg-red-500';
             else if (pct > 75) color = 'bg-yellow-500';
             
             return (
                 <div className="w-full max-w-[140px] flex items-center gap-2">
                     <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                         <div className={`h-full ${color}`} style={{ width: `${pct}%` }}></div>
                     </div>
                     <span className="text-[10px] font-mono text-slate-500 w-8 text-right">{pct}%</span>
                 </div>
             );
        }
        return <span className={`truncate block max-w-full ${textStyle}`} title={val}>{val}</span>;
    };

    const visibleCols = tableData.columns.filter(c => !hiddenColumnKeys.has(c.key));

    // --- RENDER TIMELINE IF ACTIVE ---
    // Fix: Explicitly cast viewMode to string to avoid type overlap error reported by TS
    if ((viewMode as string) === 'gantt') {
        return <Timeline data={tableData} />;
    }

    return (
        <div className="h-full flex flex-col bg-white relative">
            {/* Toolbar */}
            <div className="h-14 border-b border-slate-200 flex justify-between items-center px-4 bg-white z-10">
                <div className="flex items-center gap-3">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded" onClick={() => setIsSettingsModalOpen(true)}>
                        <SettingsIcon size={16} className="text-teal-600" />
                        {tableData.name}
                    </h2>
                    
                    {/* View Switcher Dropdown */}
                    <div className="relative group ml-2">
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium hover:bg-white hover:shadow-sm text-slate-700">
                             {activeViewId ? (tableData.views?.find(v => v.id === activeViewId)?.name || 'Tundmatu') : 'Vaikimisi vaade'}
                             <ChevronDown size={14} className="opacity-50" />
                        </button>
                        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 p-1 hidden group-hover:block z-50">
                             <div className="px-2 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Vali Vaade</div>
                             <button 
                                onClick={() => { setActiveViewId(null); setViewMode('grid'); setFilters({}); setSortConfig(null); setHiddenColumnKeys(new Set()); }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between ${!activeViewId ? 'bg-teal-50 text-teal-700' : 'hover:bg-slate-50 text-slate-700'}`}
                             >
                                 Vaikimisi vaade
                                 {!activeViewId && <CheckSquare size={14} />}
                             </button>
                             {tableData.views?.map(view => (
                                 <div key={view.id} className="group/item relative">
                                     <button 
                                        onClick={() => loadView(view)}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between ${activeViewId === view.id ? 'bg-teal-50 text-teal-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                     >
                                         {view.name}
                                         {activeViewId === view.id && <CheckSquare size={14} />}
                                     </button>
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteView(view.id); }}
                                        className="absolute right-2 top-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100"
                                     >
                                         <Trash2 size={12} />
                                     </button>
                                 </div>
                             ))}
                             <div className="h-px bg-slate-100 my-1"></div>
                             <button onClick={() => setIsSaveViewModalOpen(true)} className="w-full text-left px-3 py-2 text-sm text-teal-600 hover:bg-teal-50 rounded-md flex items-center gap-2">
                                 <Plus size={14} /> Salvesta uus vaade...
                             </button>
                        </div>
                    </div>

                    <div className="h-4 w-px bg-slate-200 mx-2"></div>
                    
                    {/* View Mode Toggles */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                        <button 
                            onClick={() => setViewMode('grid')} 
                            className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all ${viewMode === 'grid' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Tabel"
                        >
                            <TableIcon size={14} />
                        </button>
                        <button 
                            onClick={() => setViewMode('gallery')} 
                            className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all ${viewMode === 'gallery' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Galerii"
                        >
                            <LayoutGrid size={14} />
                        </button>
                        <button 
                            onClick={() => setViewMode('calendar')} 
                            className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all ${viewMode === 'calendar' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Kalender"
                        >
                            <CalendarIcon size={14} />
                        </button>
                         <button 
                            onClick={() => setViewMode('gantt')} 
                            className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all ${viewMode === 'gantt' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Ajatelg"
                        >
                            <KanbanSquare size={14} />
                        </button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 hover:bg-slate-100 rounded text-slate-600" onClick={() => { setEditingRow(null); setFormData({}); setIsAddModalOpen(true); }}>
                        <Plus size={18} />
                    </button>
                    <button className="p-2 hover:bg-slate-100 rounded text-slate-600">
                        <Download size={18} />
                    </button>
                </div>
            </div>

            {/* View Content */}
            {viewMode === 'grid' && (
                <>
                    {/* Grid Header */}
                    <div className="flex border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 overflow-hidden pr-2">
                        {visibleCols.map(col => (
                            <div key={col.key} style={{ width: col.width }} className="flex-shrink-0 p-2 border-r border-slate-200 last:border-0 group">
                                <div 
                                    className="flex justify-between items-center text-xs font-bold text-slate-600 uppercase cursor-pointer hover:text-teal-600 mb-2"
                                    onClick={() => handleSort(col.key)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.label} 
                                        {col.validation?.required && <span className="text-red-400 text-[9px]">*</span>}
                                    </div>
                                    {sortConfig?.key === col.key ? (
                                        sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                                    ) : <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-30" />}
                                </div>
                                <div className="relative">
                                    <input 
                                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-teal-500"
                                        placeholder="Otsi..."
                                        value={filters[col.key] || ''}
                                        onChange={(e) => setFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                                    />
                                    <Filter size={10} className="absolute right-2 top-1.5 text-slate-300" />
                                </div>
                            </div>
                        ))}
                        <div className="w-12 border-l border-slate-200"></div>
                    </div>

                    {/* Virtualized Rows */}
                    <div 
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto custom-scrollbar"
                        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                    >
                        <div style={{ height: totalHeight + ROW_HEIGHT, position: 'relative' }}> 
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${paddingTop}px)` }}>
                                {visibleRows.map((row, rIdx) => {
                                    const actualIndex = startIndex + rIdx;
                                    return (
                                        <div 
                                            id={`row-${actualIndex}`}
                                            key={row.id} 
                                            className={`flex border-b border-slate-100 hover:bg-blue-50/50 transition-colors group items-center cursor-pointer ${selectedRowIds.has(row.id) ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'bg-white'}`}
                                            style={{ height: ROW_HEIGHT }}
                                            onContextMenu={(e) => handleContextMenu(e, row.id)}
                                            onClick={(e) => handleRowClick(row.id, actualIndex, e)}
                                            onDoubleClick={() => handleEdit(row)}
                                        >
                                            {visibleCols.map(col => (
                                                <div 
                                                    key={col.key} 
                                                    style={{ width: col.width }} 
                                                    className={`flex-shrink-0 px-3 text-sm text-slate-700 truncate border-r border-transparent group-hover:border-slate-200/50 h-full flex items-center ${focusedCell?.rowIndex === actualIndex && focusedCell?.colKey === col.key ? 'ring-2 ring-inset ring-blue-500 bg-blue-50 z-10' : ''}`}
                                                    onClick={() => handleCellClick(actualIndex, col.key)}
                                                    onDoubleClick={(e) => {
                                                        e.stopPropagation();
                                                        startEditing(actualIndex, col.key, String(row[col.key] || ''));
                                                    }}
                                                >
                                                    {renderCell(row, col, actualIndex)}
                                                </div>
                                            ))}
                                            <div className="w-12 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <button 
                                                    onClick={(e) => handleContextMenu(e, row.id)}
                                                    className="p-1 hover:bg-slate-200 rounded text-slate-500"
                                                >
                                                    <MoreHorizontal size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Add New Row Footer (Sticky at end of list) */}
                                {startIndex + visibleRows.length === processedData.length && (
                                    <div 
                                        className="flex items-center border-b border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:bg-slate-100 opacity-70 hover:opacity-100 transition-opacity"
                                        style={{ height: ROW_HEIGHT }}
                                        onClick={handleFooterAdd}
                                    >
                                        <div className="w-full flex items-center justify-center text-sm text-slate-500 gap-2">
                                            <Plus size={14} /> Lisa uus rida
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Summary Footer */}
                    <div className="bg-slate-50 border-t border-slate-200 flex pr-2 z-20 font-medium text-xs text-slate-600 shadow-md">
                        {visibleCols.map(col => (
                            <div key={col.key} style={{ width: col.width }} className="p-2 border-r border-slate-200 flex justify-end">
                                {(col.type === 'number' || col.type === 'currency') && (
                                    <span>Σ {calculateTotal(col.key).toLocaleString()}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Other Views Logic (Gallery/Calendar) */}
            {viewMode !== 'grid' && (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                    {/* Placeholder to show the other views still exist in concept */}
                    {viewMode === 'gallery' ? <LayoutGrid size={48} /> : <CalendarIcon size={48} />}
                    <span className="ml-2">Vaade {viewMode} on aktiivne (Coming Soon)</span>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu.visible && (
                <div 
                    className="fixed bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 w-48 animate-in zoom-in-95 duration-100"
                    style={{ top: Math.min(contextMenu.y, window.innerHeight - 200), left: Math.min(contextMenu.x, window.innerWidth - 200) }}
                >
                    <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-50 mb-1">
                        ID: {contextMenu.rowId}
                    </div>
                    <button onClick={() => handleEdit()} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-teal-600 flex items-center gap-2">
                        <Edit size={14} /> Muuda
                    </button>
                    <button onClick={handleDuplicate} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-teal-600 flex items-center gap-2">
                        <Copy size={14} /> Dubleeri rida
                    </button>
                    <button onClick={() => alert("Eksport...")} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-teal-600 flex items-center gap-2">
                        <FileText size={14} /> Ekspordi PDF
                    </button>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <Trash2 size={14} /> Kustuta
                    </button>
                </div>
            )}

            {/* Save View Modal */}
             <Modal
                isOpen={isSaveViewModalOpen}
                onClose={() => setIsSaveViewModalOpen(false)}
                title="Salvesta Vaade"
                type="center"
                footer={
                    <button onClick={handleSaveView} className="bg-teal-600 text-white px-4 py-2 rounded text-sm hover:bg-teal-700 flex items-center gap-2">
                        <Save size={14} /> Salvesta
                    </button>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        See salvestab praegused filtrid, sortimise, peidetud veerud ja vaate tüübi (Tabel/Galerii/Kalender).
                    </p>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">VAATE NIMI</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded p-2 text-sm"
                            placeholder="Nt. Minu pooleliolevad tööd"
                            value={newViewName}
                            onChange={(e) => setNewViewName(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>
            </Modal>

            {/* Add/Edit Modal with Custom Layout */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title={editingRow ? "Muuda Kirjet" : "Lisa Uus Kirje"}
                type="slideover"
                footer={
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-slate-400">{processingFiles && "AI töötleb faile..."}</span>
                        <button onClick={handleSaveForm} className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 flex items-center gap-2">
                           {processingFiles && <Sparkles size={14} className="animate-spin" />} Salvesta
                        </button>
                    </div>
                }
            >
                <div className="space-y-6">
                    {/* Check if custom layout exists, otherwise fallback to default list */}
                    {tableData.formLayout && tableData.formLayout.sections.length > 0 ? (
                        tableData.formLayout.sections.map(section => (
                            <div key={section.id} className="bg-slate-50/50 border border-slate-100 rounded-lg p-4">
                                <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide border-b border-slate-200 pb-1">{section.title}</h4>
                                <div className={section.isTwoColumn ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
                                    {section.columnKeys.map(colKey => {
                                        const col = tableData.columns.find(c => c.key === colKey);
                                        if(!col) return null;
                                        return <div key={colKey}>{renderInputForColumn(col)}</div>
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        // Default Fallback: Render all columns that aren't hidden by permission
                        tableData.columns.filter(c => !c.hidden).map(col => (
                            <div key={col.key}>{renderInputForColumn(col)}</div>
                        ))
                    )}
                </div>
            </Modal>

            {/* Table Settings Modal */}
            <Modal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                title="Veergude Nähtavus"
                type="center"
            >
                 <div className="space-y-4">
                     <p className="text-sm text-slate-600">Peida või näita veerge praeguses vaates.</p>
                     
                     <div className="space-y-2 border rounded-lg p-2 max-h-60 overflow-y-auto">
                         {tableData.columns.map(col => (
                             <div key={col.key} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                                 <span className="text-sm font-medium">{col.label}</span>
                                 <button 
                                    onClick={() => toggleColumnVisibility(col.key)}
                                    className={`p-1.5 rounded ${hiddenColumnKeys.has(col.key) ? 'text-slate-400 bg-slate-100' : 'text-teal-600 bg-teal-50'}`} 
                                    title={hiddenColumnKeys.has(col.key) ? 'Näita' : 'Peida'}
                                 >
                                     <EyeOff size={16} />
                                 </button>
                             </div>
                         ))}
                     </div>
                 </div>
            </Modal>
        </div>
    );
};
