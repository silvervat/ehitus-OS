
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel, 
  getFilteredRowModel, 
  flexRender, 
  createColumnHelper,
  SortingState,
  ColumnFiltersState
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { db, seedDatabase } from '../services/db';
import { dataAPI } from '../services/dataAPI';
import { TableDefinition, GridFocus, UserCursor } from '../types';
import { Settings as SettingsIcon, Plus, FileText, Copy, Trash2, Image as ImageIcon, ArrowUpDown, ChevronUp, ChevronDown, MessageSquare, History, Lock } from 'lucide-react';
import { Modal } from './Modal';
import { schemaStore } from '../services/schemaStore'; 
import { Timeline } from './Timeline';
import { formatDate } from '../constants';
import { CommentThread } from './CommentThread';
import { RowHistoryModal } from './RowHistoryModal';
import { realtimeSync } from '../services/realtimeSync';

const ROW_HEIGHT = 40;

interface DynamicDataGridProps {
    tableId: string;
}

export const DynamicDataGrid: React.FC<DynamicDataGridProps> = ({ tableId }) => {
    // Data State
    const [tableDef, setTableDef] = useState<TableDefinition | null>(null);
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // View State
    const [viewMode, setViewMode] = useState<string>('table'); // table, gantt

    // TanStack Table State
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    // Excel-like Interaction State
    const [focusedCell, setFocusedCell] = useState<GridFocus | null>(null);
    const [isInlineEditing, setIsInlineEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, rowId: string | null }>({ x: 0, y: 0, rowId: null });
    
    // Multiplayer State
    const [remoteCursors, setRemoteCursors] = useState<UserCursor[]>([]);

    // Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<any>(null);
    
    // Comments & History State
    const [activeCommentRowId, setActiveCommentRowId] = useState<string | null>(null);
    const [activeHistoryRowId, setActiveHistoryRowId] = useState<string | null>(null);

    // Load Data
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await seedDatabase();
            
            let def = await dataAPI.getTableMetadata(tableId);
            if (!def) def = schemaStore.getTable(tableId);
            setTableDef(def || null);

            // Fetch data
            if (tableId === 'projects') {
                const dbRows = await dataAPI.queryRows({ tableId });
                setRows(dbRows);
            } else if (def && def.rows) {
                setRows(def.rows);
            }
            setLoading(false);
        };
        init();
        
        // Schema listener for auto-refresh
        const unsubSchema = schemaStore.subscribe(() => {
             const updated = schemaStore.getTable(tableId);
             if (updated) {
                 setTableDef(updated);
                 setRows([...updated.rows]);
             }
        });

        // Realtime sync listener
        const unsubSync = realtimeSync.subscribe(() => {
            setRemoteCursors([...realtimeSync.getCursors(tableId)]);
            
            // Also refresh data if payload came in
            const updated = schemaStore.getTable(tableId);
            if (updated) {
                setRows([...updated.rows]);
            }
        });

        // Reset state on table switch
        setSorting([]);
        setColumnFilters([]);
        setFocusedCell(null);
        setActiveCommentRowId(null);
        setActiveHistoryRowId(null);

        return () => {
            unsubSchema();
            unsubSync();
        };
    }, [tableId]);

    // Define Columns for TanStack Table
    const columns = useMemo(() => {
        if (!tableDef) return [];
        const helper = createColumnHelper<any>();

        const baseColumns = tableDef.columns.map(col => 
            helper.accessor(col.key, {
                header: col.label,
                size: col.width || 150,
                cell: info => {
                    const val = info.getValue();
                    const displayValue = col.type === 'date' ? formatDate(val) : val;
                    
                    if (col.type === 'status') {
                        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-700">{displayValue}</span>;
                    }
                    if (col.type === 'image' && displayValue) {
                         return <div className="flex items-center gap-1 text-teal-600"><ImageIcon size={14}/> <span className="text-[10px] underline">Vaata</span></div>;
                    }
                    return displayValue;
                }
            })
        );
        
        // Add Comments Column
        baseColumns.push(helper.display({
            id: 'comments',
            header: () => <MessageSquare size={14} className="mx-auto text-slate-400" />,
            size: 50,
            cell: (info) => (
                <div className="flex justify-center w-full">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setActiveCommentRowId(info.row.original.id); }}
                        className="text-slate-300 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50"
                        title="Ava arutelu"
                    >
                        <MessageSquare size={14} />
                    </button>
                </div>
            )
        }));

        // Add Activity/History Column
        baseColumns.push(helper.display({
            id: 'activity_log',
            header: () => <History size={14} className="mx-auto text-slate-400" />,
            size: 50,
            cell: (info) => (
                <div className="flex justify-center w-full">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setActiveHistoryRowId(info.row.original.id); }}
                        className="text-slate-300 hover:text-teal-600 transition-colors p-1 rounded hover:bg-slate-100"
                        title="Vaata tegevuste ajalugu"
                    >
                        <History size={14} />
                    </button>
                </div>
            )
        }));

        return baseColumns;
    }, [tableDef]);

    // Initialize TanStack Table
    const table = useReactTable({
        data: rows,
        columns,
        state: {
            sorting,
            columnFilters,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    const { rows: tableRows } = table.getRowModel();

    // Initialize TanStack Virtualizer
    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: tableRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 20,
    });

    // Handlers
    const handleCellClick = (rowIndex: number, rowId: string, colKey: string) => {
        setFocusedCell({ rowIndex, rowId, colKey });
        setIsInlineEditing(false);
        // Broadcast presence
        realtimeSync.broadcastCursor(tableId, rowId, colKey);
    };

    const handleCellDoubleClick = (rowIndex: number, rowId: string, colKey: string, value: any) => {
        // Check if locked
        const lockedBy = realtimeSync.isCellLocked(tableId, rowId, colKey);
        if (lockedBy) {
            alert(`Seda lahtrit muudab hetkel ${lockedBy.userName}.`);
            return;
        }

        setFocusedCell({ rowIndex, rowId, colKey });
        setIsInlineEditing(true);
        setEditValue(value || '');
        // Lock cell
        realtimeSync.broadcastLock(tableId, rowId, colKey);
    };

    const handleInlineUpdate = (rowIndex: number, rowId: string, colKey: string, value: any) => {
        const rowData = tableRows[rowIndex].original;
        const updatedRow = { ...rowData, [colKey]: value };
        
        // Optimistic UI Update
        const newRows = rows.map(r => r.id === rowData.id ? updatedRow : r);
        setRows(newRows);

        if (tableId !== 'projects') {
             schemaStore.updateRow(tableId, rowData.id, { [colKey]: value });
             // Broadcast granular change to others
             realtimeSync.broadcastRowUpdate(tableId, rowId, { [colKey]: value });
        }
        
        setIsInlineEditing(false);
        realtimeSync.broadcastUnlock(tableId);
    };

    const handleCancelEdit = () => {
        setIsInlineEditing(false);
        realtimeSync.broadcastUnlock(tableId);
    }

    const handleDeleteRow = (rowId: string) => {
        if(confirm("Kustuta rida?")) {
            schemaStore.deleteRow(tableId, rowId);
            setRows(prev => prev.filter(r => r.id !== rowId));
        }
    };

    const handleDuplicateRow = (rowId: string) => {
        schemaStore.duplicateRow(tableId, rowId);
        const updatedDef = schemaStore.getTable(tableId);
        if(updatedDef) setRows(updatedDef.rows);
    };
    
    const handleSaveRow = () => {
        if (!editingRow) return;
        if (editingRow.id && !editingRow.id.startsWith('new_')) {
            if (tableId !== 'projects') schemaStore.updateRow(tableId, editingRow.id, editingRow);
        } else {
             if (tableId !== 'projects') schemaStore.addRow(tableId, editingRow);
        }
        const updatedDef = schemaStore.getTable(tableId);
        if(updatedDef) setRows(updatedDef.rows);
        setIsEditModalOpen(false);
        setEditingRow(null);
    }

    if (loading) return <div className="p-10 text-center text-slate-400 animate-pulse">Andmete laadimine...</div>;
    if (!tableDef) return <div className="p-10">Tabelit ei leitud</div>;

    if (viewMode === 'gantt') {
        return (
            <div className="h-full flex flex-col">
                <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-white z-10">
                    <h2 className="font-bold text-slate-800">{tableDef.name} <span className="text-xs font-normal text-slate-400 ml-2">Gantt</span></h2>
                    <button onClick={() => setViewMode('table')} className="text-xs font-medium text-teal-600 hover:text-teal-700">Tagasi Tabelisse</button>
                </div>
                <Timeline data={tableDef} />
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-white outline-none relative">
            {/* Toolbar */}
            <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-white z-10 flex-shrink-0 shadow-sm">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <SettingsIcon size={16} className="text-teal-600" />
                    {tableDef.name} 
                    <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-100">
                        {rows.length.toLocaleString()} rida
                    </span>
                    {/* Active Users Indicator */}
                    {remoteCursors.length > 0 && (
                        <div className="flex -space-x-2 ml-4">
                            {remoteCursors.map(c => (
                                <div key={c.userId} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm" style={{ backgroundColor: c.color }} title={c.userName}>
                                    {c.userName.charAt(0)}
                                </div>
                            ))}
                        </div>
                    )}
                </h2>
                <div className="flex gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button onClick={() => setViewMode('table')} className={`p-1 px-3 text-xs font-medium rounded transition-all ${viewMode === 'table' ? 'bg-white shadow text-teal-700 font-bold' : 'text-slate-600 hover:text-slate-900'}`}>Tabel</button>
                        <button onClick={() => setViewMode('gantt')} className={`p-1 px-3 text-xs font-medium rounded transition-all ${viewMode === 'gantt' ? 'bg-white shadow text-teal-700 font-bold' : 'text-slate-600 hover:text-slate-900'}`}>Gantt</button>
                    </div>
                    <button 
                        onClick={() => { setEditingRow({}); setIsEditModalOpen(true); }}
                        className="bg-teal-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-teal-700 flex items-center gap-2 shadow-sm font-medium"
                    >
                        <Plus size={16} /> Uus
                    </button>
                </div>
            </div>

            {/* TanStack Table Header */}
            <div className="flex border-b border-slate-200 bg-slate-50 overflow-hidden pr-[8px] flex-shrink-0">
                {table.getHeaderGroups().map(headerGroup => (
                    <React.Fragment key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                            <div 
                                key={header.id} 
                                style={{ width: header.getSize() }} 
                                className="flex-shrink-0 p-2 border-r border-slate-200 group relative"
                            >
                                <div 
                                    className="flex justify-between items-center text-xs font-bold text-slate-600 uppercase mb-1 cursor-pointer select-none hover:text-teal-600"
                                    onClick={header.column.getToggleSortingHandler()}
                                >
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                    {{
                                        asc: <ChevronUp size={14} className="text-teal-600" />,
                                        desc: <ChevronDown size={14} className="text-teal-600" />,
                                    }[header.column.getIsSorted() as string] ?? <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-30" />}
                                </div>
                                <input 
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-teal-500 transition-colors"
                                    placeholder="Filtreeri..."
                                    value={(header.column.getFilterValue() ?? '') as string}
                                    onChange={e => header.column.setFilterValue(e.target.value)}
                                />
                                <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-teal-400 opacity-0 hover:opacity-100" />
                            </div>
                        ))}
                    </React.Fragment>
                ))}
            </div>

            {/* TanStack Virtual Body */}
            <div ref={parentRef} className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = tableRows[virtualRow.index];
                        if (!row) return null;
                        
                        return (
                            <div
                                key={row.id}
                                className="absolute top-0 left-0 w-full flex border-b border-slate-100 hover:bg-blue-50/50 transition-colors"
                                style={{ height: ROW_HEIGHT, transform: `translateY(${virtualRow.start}px)` }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenu({ x: e.clientX, y: e.clientY, rowId: row.original.id });
                                }}
                            >
                                {row.getVisibleCells().map(cell => {
                                    const rowId = row.original.id;
                                    const colKey = cell.column.id;
                                    
                                    // Local Focus
                                    const isFocused = focusedCell?.rowId === rowId && focusedCell?.colKey === colKey;
                                    const isEditing = isFocused && isInlineEditing;
                                    
                                    // Remote Cursors
                                    const remoteUser = remoteCursors.find(c => c.focusedRowId === rowId && c.focusedColKey === colKey);
                                    const isRemoteLocked = remoteUser?.isEditing;

                                    const rawValue = cell.getValue();

                                    return (
                                        <div 
                                            key={cell.id} 
                                            style={{ 
                                                width: cell.column.getSize(),
                                                ...(remoteUser ? { borderColor: remoteUser.color, boxShadow: `inset 0 0 0 1px ${remoteUser.color}` } : {})
                                            }} 
                                            className={`
                                                flex-shrink-0 text-sm text-slate-700 h-full flex items-center border-r border-slate-100 truncate revest-grid-cell relative
                                                ${isFocused ? 'cell-selected' : ''}
                                                ${isEditing ? 'cell-editing' : ''}
                                            `}
                                            onClick={() => handleCellClick(virtualRow.index, rowId, colKey)}
                                            onDoubleClick={() => handleCellDoubleClick(virtualRow.index, rowId, colKey, rawValue)}
                                        >
                                            {/* Remote User Label */}
                                            {remoteUser && (
                                                <div 
                                                    className="absolute -top-3 left-0 px-1.5 py-0.5 rounded-t text-[9px] text-white font-bold z-20 shadow-sm"
                                                    style={{ backgroundColor: remoteUser.color }}
                                                >
                                                    {remoteUser.userName} {isRemoteLocked && '(Muudab)'}
                                                </div>
                                            )}
                                            
                                            {/* Locked Indicator Overlay */}
                                            {isRemoteLocked && (
                                                 <div className="absolute right-1 top-1 text-slate-400 z-10">
                                                     <Lock size={10} />
                                                 </div>
                                            )}

                                            {isEditing ? (
                                                <input 
                                                    autoFocus
                                                    className="rivest-grid-input"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={() => handleInlineUpdate(virtualRow.index, rowId, colKey, editValue)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleInlineUpdate(virtualRow.index, rowId, colKey, editValue);
                                                        if (e.key === 'Escape') handleCancelEdit();
                                                    }}
                                                />
                                            ) : (
                                                <div className="px-3 w-full truncate select-none">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Edit/Add Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={editingRow?.id ? `Muuda` : `Lisa Uus`}
                type="slideover"
                footer={
                    <>
                        <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium text-sm">Katkesta</button>
                        <button onClick={handleSaveRow} className="px-6 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-teal-500/30 hover:bg-teal-700">Salvesta</button>
                    </>
                }
            >
                <div className="p-4 space-y-4">
                    {tableDef.columns.map(col => (
                        <div key={col.key}>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{col.label}</label>
                            <input 
                                className="w-full border border-slate-300 rounded p-2 text-sm"
                                value={editingRow?.[col.key] || ''}
                                onChange={e => setEditingRow({...editingRow, [col.key]: e.target.value})}
                            />
                        </div>
                    ))}
                </div>
            </Modal>
            
            {/* Comments Slideover */}
            <Modal
                isOpen={!!activeCommentRowId}
                onClose={() => setActiveCommentRowId(null)}
                title="Arutelu"
                type="slideover"
            >
                {activeCommentRowId && (
                    <CommentThread tableId={tableId} rowId={activeCommentRowId} onClose={() => setActiveCommentRowId(null)} />
                )}
            </Modal>
            
            {/* Row History Slideover */}
            <Modal
                isOpen={!!activeHistoryRowId}
                onClose={() => setActiveHistoryRowId(null)}
                title="Tegevuste Ajalugu"
                type="slideover"
            >
                {activeHistoryRowId && (
                    <RowHistoryModal tableId={tableId} rowId={activeHistoryRowId} />
                )}
            </Modal>

            {/* Context Menu */}
            {contextMenu.rowId && (
                <div 
                    className="fixed bg-white border border-slate-200 shadow-xl rounded-lg py-1 z-50 w-52 text-sm"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onMouseLeave={() => setContextMenu({ x: 0, y: 0, rowId: null })}
                >
                    <button onClick={() => { setActiveCommentRowId(contextMenu.rowId); setContextMenu({ x:0, y:0, rowId: null}); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-blue-600"><MessageSquare size={14}/> Ava Arutelu</button>
                    <button onClick={() => { setActiveHistoryRowId(contextMenu.rowId); setContextMenu({ x:0, y:0, rowId: null}); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-600"><History size={14}/> Vaata ajalugu</button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button onClick={() => { setEditingRow(rows.find(r => r.id === contextMenu.rowId)); setIsEditModalOpen(true); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2"><FileText size={14}/> Muuda Vormil</button>
                    <button onClick={() => handleDuplicateRow(contextMenu.rowId!)} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2"><Copy size={14}/> Dubleeri</button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button onClick={() => handleDeleteRow(contextMenu.rowId!)} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"><Trash2 size={14}/> Kustuta</button>
                </div>
            )}
        </div>
    );
};