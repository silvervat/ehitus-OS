
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { fileSystemStore } from '../services/fileSystemStore';
import { schemaStore } from '../services/schemaStore';
import { FileNode, FileNodeType, FileAsset } from '../types';
import { 
    Search, Folder, FileText, Image as ImageIcon, Download, 
    Grid, List, ChevronRight, Home, MoreVertical, Plus, 
    UploadCloud, Archive, Share2, Trash2, Clock, Eye, 
    FileSpreadsheet, File as FileGeneric, Info, Lock, Globe, X,
    FolderPlus, Move
} from 'lucide-react';
import { Modal } from './Modal';

export const FilesManager: React.FC = () => {
    // --- STATE ---
    const [files, setFiles] = useState<FileNode[]>(fileSystemStore.getAllFiles());
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [sidebarSection, setSidebarSection] = useState<'my_files' | 'shared' | 'system' | 'trash'>('my_files');
    
    // UI State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, fileId: string } | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    
    // Modals
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false); // New Preview State
    const [editingFile, setEditingFile] = useState<FileNode | null>(null);
    const [editContent, setEditContent] = useState('');
    
    // System Assets (Old "Files" view data)
    const [systemAssets, setSystemAssets] = useState<FileAsset[]>(schemaStore.getAllAssets());

    useEffect(() => {
        const unsubFS = fileSystemStore.subscribe(() => setFiles([...fileSystemStore.getAllFiles()]));
        const unsubSchema = schemaStore.subscribe(() => setSystemAssets(schemaStore.getAllAssets()));
        return () => { unsubFS(); unsubSchema(); };
    }, []);

    // --- DERIVED DATA ---
    const currentItems = useMemo(() => {
        if (sidebarSection === 'system') return []; // Handled separately
        if (sidebarSection === 'trash') return files.filter(f => f.isDeleted);
        
        // Normal navigation
        return files.filter(f => 
            f.parentId === currentFolderId && 
            !f.isDeleted &&
            (sidebarSection === 'shared' ? f.shareConfig.sharedWithUserIds.length > 0 : true) // Simplistic filter logic
        );
    }, [files, currentFolderId, sidebarSection]);

    const breadcrumbs = useMemo(() => {
        if (sidebarSection !== 'my_files') return [];
        if (!currentFolderId) return [{ id: null, name: 'Minu Failid' }];
        
        const path = fileSystemStore.getPath(currentFolderId);
        return [{ id: null, name: 'Minu Failid' }, ...path];
    }, [currentFolderId, sidebarSection, files]);

    const activeFile = useMemo(() => {
        if (selectedIds.size === 1) {
            return files.find(f => f.id === Array.from(selectedIds)[0]);
        }
        return null;
    }, [selectedIds, files]);

    // --- HANDLERS ---
    const handleFolderClick = (id: string) => {
        setCurrentFolderId(id);
        setSelectedIds(new Set());
    };

    const handleCreateFolder = () => {
        const name = prompt("Kausta nimi:");
        if (name) fileSystemStore.createFolder(currentFolderId, name);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => {
                fileSystemStore.uploadFile(currentFolderId, file);
            });
        }
    };

    const handleItemClick = (id: string, type: FileNodeType) => {
        if (type === 'folder') {
            handleFolderClick(id);
        } else {
            // Preview/Edit Logic
            const file = files.find(f => f.id === id);
            if (file) openEditor(file);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, fileId: id });
        setSelectedIds(new Set([id]));
    };

    const openEditor = (file: FileNode) => {
        if (file.mimeType?.includes('image')) {
            // Open Preview Modal
            setEditingFile(file);
            setIsPreviewOpen(true);
        } else if (file.content !== undefined || file.name.endsWith('txt') || file.name.endsWith('csv') || file.name.endsWith('md')) {
            setEditingFile(file);
            setEditContent(file.content || '');
            setIsEditorOpen(true);
        } else {
            alert("Seda failitüüpi ei saa hetkel veebis muuta. Palun lae alla.");
        }
    };

    const saveEditor = () => {
        if (editingFile) {
            fileSystemStore.updateContent(editingFile.id, editContent);
            setIsEditorOpen(false);
            setEditingFile(null);
        }
    };

    const handleUnzip = () => {
        if (activeFile && activeFile.mimeType === 'application/zip') {
            fileSystemStore.unzipFile(activeFile.id);
            alert("Fail lahti pakitud uude kausta.");
        }
    };

    const handleDelete = () => {
        selectedIds.forEach(id => fileSystemStore.deleteItem(id));
        setSelectedIds(new Set());
    };

    // --- ICONS HELPER ---
    const getIcon = (item: FileNode, size: number = 48) => {
        if (item.type === 'folder') return <Folder className="text-yellow-400 fill-yellow-400" size={size} strokeWidth={1} />;
        if (item.mimeType?.includes('image')) return <ImageIcon className="text-purple-500" size={size} strokeWidth={1} />;
        if (item.mimeType?.includes('zip')) return <Archive className="text-orange-500" size={size} strokeWidth={1} />;
        if (item.mimeType?.includes('spreadsheet') || item.name.endsWith('csv')) return <FileSpreadsheet className="text-green-600" size={size} strokeWidth={1} />;
        if (item.mimeType?.includes('text')) return <FileText className="text-slate-500" size={size} strokeWidth={1} />;
        return <FileGeneric className="text-slate-400" size={size} strokeWidth={1} />;
    }

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden" onClick={() => setContextMenu(null)}>
            {/* 1. LEFT SIDEBAR */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
                <div className="p-4">
                    <button onClick={handleCreateFolder} className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 shadow-sm px-4 py-2 rounded-full text-slate-700 hover:bg-slate-50 hover:text-teal-600 hover:border-teal-200 transition-all font-medium">
                        <Plus size={18} /> Uus
                    </button>
                </div>
                
                <nav className="flex-1 overflow-y-auto px-2 space-y-1">
                    <SidebarBtn active={sidebarSection === 'my_files'} onClick={() => { setSidebarSection('my_files'); setCurrentFolderId(null); }} icon={<Home size={18} />} label="Minu Failid" />
                    <SidebarBtn active={sidebarSection === 'shared'} onClick={() => { setSidebarSection('shared'); setCurrentFolderId(null); }} icon={<Share2 size={18} />} label="Jagatud minuga" />
                    <SidebarBtn active={sidebarSection === 'system'} onClick={() => setSidebarSection('system')} icon={<List size={18} />} label="Süsteemi Manused" />
                    <SidebarBtn active={sidebarSection === 'trash'} onClick={() => setSidebarSection('trash')} icon={<Trash2 size={18} />} label="Prügikast" />
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className="bg-slate-100 rounded-lg p-3">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-600">Salvestusruum</span>
                            <span className="text-slate-500">2.1 GB / 15 GB</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-teal-500 h-full w-[15%]"></div>
                        </div>
                        <button className="text-xs text-teal-600 font-medium mt-2 hover:underline">Osta lisamahtu</button>
                    </div>
                </div>
            </div>

            {/* 2. MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header / Toolbar */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                        {breadcrumbs.map((crumb, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && <ChevronRight size={14} className="text-slate-400" />}
                                <button 
                                    onClick={() => setCurrentFolderId(crumb.id)}
                                    className={`text-sm hover:bg-slate-100 px-2 py-1 rounded truncate max-w-[150px] ${i === breadcrumbs.length - 1 ? 'font-bold text-slate-800' : 'text-slate-500'}`}
                                >
                                    {crumb.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Otsi Drive'ist..." 
                                className="pl-9 pr-4 py-1.5 bg-slate-100 border-transparent focus:bg-white focus:border-teal-500 border rounded-full text-sm w-64 transition-all"
                            />
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>
                        <div className="flex bg-slate-100 rounded-lg p-0.5">
                            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow text-teal-600' : 'text-slate-500'}`}><Grid size={16} /></button>
                            <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white shadow text-teal-600' : 'text-slate-500'}`}><List size={16} /></button>
                        </div>
                        <button onClick={() => setShowDetails(!showDetails)} className={`p-2 rounded-full hover:bg-slate-100 ${showDetails ? 'bg-slate-100 text-teal-600' : 'text-slate-500'}`}>
                            <Info size={20} />
                        </button>
                    </div>
                </header>

                {/* File Drop Zone / Content Area */}
                <div className="flex-1 overflow-y-auto p-6 relative">
                    {/* Folder Upload Input Trick */}
                    <input type="file" id="file-upload" className="hidden" multiple onChange={handleFileUpload} />
                    
                    {sidebarSection === 'system' ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {/* Rendering System Assets as Cards */}
                            {systemAssets.map(asset => (
                                <div key={asset.id} className="group relative bg-white border border-slate-200 rounded-xl p-4 hover:shadow-lg transition-all flex flex-col items-center text-center cursor-pointer">
                                    <div className="h-24 w-full flex items-center justify-center mb-3 bg-slate-50 rounded-lg overflow-hidden">
                                        {asset.url.match(/\.(jpeg|jpg|png)/) ? (
                                            <img src={asset.url} className="h-full w-full object-cover" alt="" />
                                        ) : <FileText size={32} className="text-slate-400" />}
                                    </div>
                                    <span className="text-xs font-medium text-slate-700 line-clamp-2 mb-1">{asset.name}</span>
                                    <span className="text-[10px] text-slate-400">{asset.sourceTableName}</span>
                                    <a href={asset.url} target="_blank" className="absolute inset-0" rel="noreferrer"> </a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {currentItems.length === 0 ? (
                                <label htmlFor="file-upload" className="flex flex-col items-center justify-center h-full border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-teal-400 transition-colors">
                                    <UploadCloud size={64} className="text-slate-300 mb-4" />
                                    <h3 className="text-lg font-medium text-slate-500">Kaust on tühi</h3>
                                    <p className="text-sm text-slate-400">Lohista failid siia või kliki üleslaadimiseks</p>
                                </label>
                            ) : (
                                <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" : "flex flex-col space-y-1"}>
                                    {currentItems.map(item => (
                                        <div 
                                            key={item.id}
                                            onContextMenu={(e) => handleContextMenu(e, item.id)}
                                            onClick={() => setSelectedIds(new Set([item.id]))}
                                            onDoubleClick={() => handleItemClick(item.id, item.type)}
                                            className={`
                                                group relative rounded-xl transition-all cursor-pointer select-none
                                                ${viewMode === 'grid' 
                                                    ? `p-4 border flex flex-col items-center text-center aspect-[4/5] hover:shadow-md ${selectedIds.has(item.id) ? 'bg-teal-50 border-teal-200 ring-1 ring-teal-300' : 'bg-white border-slate-200'}`
                                                    : `flex items-center px-4 py-3 border-b hover:bg-slate-50 ${selectedIds.has(item.id) ? 'bg-teal-50' : 'bg-white border-slate-100'}`
                                                }
                                            `}
                                        >
                                            {viewMode === 'grid' ? (
                                                <>
                                                    <div className="flex-1 flex items-center justify-center w-full mb-3">
                                                        {getIcon(item)}
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700 line-clamp-2 break-all w-full">{item.name}</span>
                                                    {item.shareConfig.isPublic && (
                                                        <Globe size={12} className="absolute top-2 right-2 text-green-500" />
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div className="mr-4">{getIcon(item, 24)}</div>
                                                    <span className="text-sm font-medium text-slate-700 flex-1 truncate">{item.name}</span>
                                                    <span className="text-xs text-slate-400 w-32">{new Date(item.updatedAt).toLocaleDateString()}</span>
                                                    <span className="text-xs text-slate-400 w-24 text-right">{(item.size / 1024).toFixed(1)} KB</span>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* 3. RIGHT DETAILS PANEL (Collapsible) */}
            {showDetails && (
                <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300">
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-slate-800 text-lg">Detailid</h3>
                            <button onClick={() => setShowDetails(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
                        </div>
                        
                        {activeFile ? (
                            <div className="flex flex-col items-center text-center">
                                <div className="mb-4 transform scale-75">{getIcon(activeFile)}</div>
                                <h4 className="font-medium text-slate-700 mb-1 break-all">{activeFile.name}</h4>
                                <span className="text-xs text-slate-400 uppercase tracking-wide">{activeFile.type}</span>
                                
                                <div className="mt-6 w-full space-y-4 text-left">
                                    <DetailRow label="Tüüp" value={activeFile.mimeType || 'Kaust'} />
                                    <DetailRow label="Suurus" value={(activeFile.size / 1024).toFixed(2) + ' KB'} />
                                    <DetailRow label="Loodud" value={new Date(activeFile.createdAt).toLocaleDateString()} />
                                    <DetailRow label="Omanik" value="Mina (Admin)" />
                                    <DetailRow label="Ligipääs" value={activeFile.shareConfig.isPublic ? "Avalik Link" : "Privaatne"} />
                                </div>

                                <div className="mt-6 flex gap-2 w-full">
                                    <button onClick={() => setIsShareModalOpen(true)} className="flex-1 bg-teal-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-teal-700 flex items-center justify-center gap-2">
                                        <Share2 size={16} /> Jaga
                                    </button>
                                    <button onClick={handleDelete} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                                        Kustuta
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 py-10 text-sm">
                                Vali fail, et näha detaile
                            </div>
                        )}
                    </div>
                    
                    {activeFile && (
                        <div className="p-6">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Tegevuste Ajalugu</h4>
                            <div className="space-y-4">
                                {activeFile.activityLog.map(act => (
                                    <div key={act.id} className="flex gap-3 text-sm">
                                        <div className="mt-1 min-w-[24px]">
                                            {act.action === 'upload' && <UploadCloud size={14} className="text-blue-500" />}
                                            {act.action === 'edit' && <FileText size={14} className="text-orange-500" />}
                                            {act.action === 'share' && <Share2 size={14} className="text-green-500" />}
                                            {act.action === 'unzip' && <Archive size={14} className="text-purple-500" />}
                                        </div>
                                        <div>
                                            <p className="text-slate-700">
                                                <span className="font-medium">{act.userName}</span> {act.details}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">{new Date(act.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div 
                    className="fixed bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 w-56 animate-in zoom-in-95 duration-75"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onMouseLeave={() => setContextMenu(null)}
                >
                    <ContextBtn icon={<Eye size={16}/>} label="Eelvaade" onClick={() => activeFile && openEditor(activeFile)} />
                    <ContextBtn icon={<Share2 size={16}/>} label="Jaga..." onClick={() => setIsShareModalOpen(true)} />
                    {activeFile?.mimeType === 'application/zip' && (
                        <ContextBtn icon={<Archive size={16}/>} label="Paki lahti siia" onClick={handleUnzip} />
                    )}
                    <div className="h-px bg-slate-100 my-1"></div>
                    <ContextBtn icon={<Move size={16}/>} label="Liiguta..." onClick={() => {}} />
                    <ContextBtn icon={<Trash2 size={16}/>} label="Kustuta" color="text-red-600" onClick={handleDelete} />
                </div>
            )}

            {/* Editor Modal */}
            <Modal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                title={`Muuda: ${editingFile?.name}`}
                type="center"
                footer={
                    <button onClick={saveEditor} className="bg-teal-600 text-white px-6 py-2 rounded hover:bg-teal-700">Salvesta Muudatused</button>
                }
            >
                {editingFile?.name.endsWith('csv') ? (
                    <div className="bg-slate-50 border rounded p-2 overflow-auto font-mono text-xs">
                        {editContent.split('\n').map((line, i) => (
                            <div key={i} className="flex border-b border-slate-200 last:border-0">
                                {line.split(',').map((cell, j) => (
                                    <div key={j} className="p-2 border-r border-slate-200 last:border-0 min-w-[80px]">{cell}</div>
                                ))}
                            </div>
                        ))}
                         <div className="p-4 text-center text-slate-400 italic">Lihtsustatud tabelivaade (Read-only demo)</div>
                    </div>
                ) : (
                    <textarea 
                        className="w-full h-[60vh] p-4 bg-slate-50 border border-slate-200 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                    />
                )}
            </Modal>
            
            {/* Preview Modal for Images */}
            <Modal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                title={`Eelvaade: ${editingFile?.name}`}
                type="center"
            >
                <div className="flex items-center justify-center p-4 bg-slate-900 rounded-lg">
                    {editingFile?.url && (
                        <img 
                            src={editingFile.url} 
                            alt={editingFile.name} 
                            className="max-h-[70vh] max-w-full object-contain"
                        />
                    )}
                </div>
            </Modal>

            {/* Sharing Modal */}
            <Modal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                title="Jaga faili"
                type="center"
            >
                <div className="space-y-6">
                    <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Globe size={24}/></div>
                        <div>
                            <h4 className="font-bold text-slate-800">Avalik Link</h4>
                            <p className="text-xs text-slate-500">Igaüks lingiga pääseb ligi</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-auto">
                            <input type="checkbox" checked={activeFile?.shareConfig.isPublic} onChange={(e) => activeFile && fileSystemStore.togglePublic(activeFile.id, e.target.checked)} className="sr-only peer"/>
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                    </div>

                    {activeFile?.shareConfig.isPublic && (
                        <div className="flex gap-2">
                            <input 
                                readOnly 
                                value={activeFile.shareConfig.publicLink || fileSystemStore.generatePublicLink(activeFile.id)} 
                                className="flex-1 bg-slate-100 border border-slate-300 rounded px-3 text-sm text-slate-600"
                            />
                            <button className="px-4 py-2 bg-slate-800 text-white rounded text-sm hover:bg-slate-900">Kopeeri</button>
                        </div>
                    )}
                    
                    <div className="pt-4 border-t border-slate-100">
                        <h4 className="text-sm font-bold text-slate-700 mb-2">Inimesed ligipääsuga</h4>
                        <div className="flex items-center gap-3 py-2">
                            <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">KN</div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">Kristofer Nilp (Mina)</p>
                                <p className="text-xs text-slate-400">Omanik</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

// UI Components Helpers
const SidebarBtn = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${active ? 'bg-teal-50 text-teal-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
        {icon} {label}
    </button>
);

const DetailRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between text-sm py-1 border-b border-slate-50 last:border-0">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-slate-700 text-right">{value}</span>
    </div>
);

const ContextBtn = ({ icon, label, onClick, color = 'text-slate-700' }: any) => (
    <button onClick={onClick} className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${color}`}>
        {icon} {label}
    </button>
);
