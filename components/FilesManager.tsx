
import React, { useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '../hooks/useVirtualizer';
import { dataAPI } from '../services/dataAPI';
import { fileSystemStore } from '../services/fileSystemStore';
import { FileNode } from '../types';
import { 
    Folder, FileText, Image as ImageIcon, Grid, List, ChevronRight, Home, 
    Share2, MoreHorizontal, Download, Link as LinkIcon, Copy, Check, 
    Plus, FolderPlus, UploadCloud, FileArchive, Trash2, Edit2, Loader2, X
} from 'lucide-react';
import { Modal } from './Modal';

export const FilesManager: React.FC = () => {
    const [files, setFiles] = useState<FileNode[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [path, setPath] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(false);
    
    // View State
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [uploadProgress, setUploadProgress] = useState<{current: number, total: number} | null>(null);
    
    // UI State
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, fileId: string} | null>(null);
    const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
    
    // Sharing State
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [fileToShare, setFileToShare] = useState<FileNode | null>(null);
    const [generatedLink, setGeneratedLink] = useState<string>('');
    const [copied, setCopied] = useState(false);

    // Refs for inputs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const parentRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(600);

    // --- DATA LOADING ---

    const loadFiles = async () => {
        setLoading(true);
        const res = await dataAPI.getFileChildren(currentFolderId);
        setFiles(res);
        
        // Update breadcrumb path
        if (currentFolderId) {
            setPath(fileSystemStore.getPath(currentFolderId));
        } else {
            setPath([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadFiles();
        
        // Subscribe to store updates
        const unsub = fileSystemStore.subscribe(loadFiles);
        return unsub;
    }, [currentFolderId]);

    useEffect(() => {
        if(parentRef.current) {
            setContainerHeight(parentRef.current.clientHeight);
            const obs = new ResizeObserver(e => e[0] && setContainerHeight(e[0].contentRect.height));
            obs.observe(parentRef.current);
            return () => obs.disconnect();
        }
    }, []);

    // --- ACTIONS ---

    const handleFolderClick = (id: string) => setCurrentFolderId(id);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsNewMenuOpen(false);
            const total = e.target.files.length;
            setUploadProgress({ current: 0, total });
            
            for (let i = 0; i < total; i++) {
                const file = e.target.files[i];
                // Check if it's a folder upload via webkitRelativePath
                const relPath = file.webkitRelativePath; 
                let targetParentId = currentFolderId;

                if (relPath) {
                    // It's a folder upload, we need to recreate structure
                    // path/to/file.txt -> create folder "path", then "to", then file
                    // This is complex, simplified for demo to just upload to current
                }

                fileSystemStore.uploadFile(targetParentId, file);
                
                // Simulate network delay
                await new Promise(r => setTimeout(r, 100));
                setUploadProgress(prev => prev ? { ...prev, current: i + 1 } : null);
            }
            setUploadProgress(null);
        }
    };

    const handleCreateFolder = () => {
        setIsNewMenuOpen(false);
        const name = prompt("Kausta nimi:");
        if (name) {
            fileSystemStore.createFolder(currentFolderId, name);
        }
    };

    const handleUnzip = (file: FileNode) => {
        setContextMenu(null);
        fileSystemStore.unzipFile(file.id);
        const event = new CustomEvent('automation-toast', { detail: { message: `📦 ${file.name} pakiti lahti!` } });
        window.dispatchEvent(event);
    };

    const handleDelete = (file: FileNode) => {
        setContextMenu(null);
        if (confirm(`Kustuta ${file.name}?`)) {
            fileSystemStore.deleteItem(file.id);
        }
    };

    // Sharing Logic
    const openShareModal = (file: FileNode) => {
        setContextMenu(null);
        setFileToShare(file);
        setGeneratedLink(file.shareConfig?.publicLink || '');
        setShareModalOpen(true);
        setCopied(false);
    };

    const handleGenerateLink = () => {
        if (fileToShare) {
            const link = fileSystemStore.generatePublicLink(fileToShare.id);
            setGeneratedLink(link);
            setFiles(prev => prev.map(f => f.id === fileToShare.id ? { ...f, shareConfig: { ...f.shareConfig, isPublic: true, publicLink: link } } : f));
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Drag and Drop
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
             const total = e.dataTransfer.files.length;
             setUploadProgress({ current: 0, total });
             
             for (let i = 0; i < total; i++) {
                 fileSystemStore.uploadFile(currentFolderId, e.dataTransfer.files[i]);
                 await new Promise(r => setTimeout(r, 50));
                 setUploadProgress(prev => prev ? { ...prev, current: i + 1 } : null);
             }
             setUploadProgress(null);
        }
    };

    // --- VIRTUALIZATION ---
    const COLUMN_COUNT = viewMode === 'grid' ? 6 : 1; 
    const ROW_HEIGHT = viewMode === 'grid' ? 160 : 48;
    const rowCount = Math.ceil(files.length / COLUMN_COUNT);
    
    const virtualizer = useVirtualizer({
        count: rowCount,
        itemHeight: ROW_HEIGHT,
        containerHeight: containerHeight
    });

    // Helpers
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '-';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getFileIcon = (file: FileNode) => {
        if (file.type === 'folder') return <Folder size={viewMode === 'grid' ? 40 : 20} className="text-yellow-400 fill-yellow-400" />;
        if (file.name.endsWith('.zip')) return <FileArchive size={viewMode === 'grid' ? 40 : 20} className="text-orange-400" />;
        if (file.mimeType?.startsWith('image')) return <ImageIcon size={viewMode === 'grid' ? 40 : 20} className="text-purple-400" />;
        return <FileText size={viewMode === 'grid' ? 40 : 20} className="text-slate-400" />;
    };

    return (
        <div 
            className="h-full flex flex-col bg-slate-50"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => { setContextMenu(null); setIsNewMenuOpen(false); }}
        >
            {/* Hidden Inputs */}
            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
            <input 
                type="file" 
                ref={folderInputRef} 
                className="hidden" 
                // @ts-ignore - webkitdirectory is standard in modern browsers but missing in React types
                webkitdirectory="" 
                directory="" 
                onChange={handleFileUpload} 
            />

            {/* Header */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
                <div className="flex items-center gap-4">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-1 text-sm">
                        <button 
                            onClick={() => setCurrentFolderId(null)} 
                            className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 ${!currentFolderId ? 'font-bold text-slate-800' : 'text-slate-500'}`}
                        >
                            <Home size={16} /> Drive
                        </button>
                        {path.map(node => (
                            <React.Fragment key={node.id}>
                                <ChevronRight size={14} className="text-slate-300" />
                                <button 
                                    onClick={() => setCurrentFolderId(node.id)} 
                                    className={`px-2 py-1 rounded hover:bg-slate-100 ${node.id === currentFolderId ? 'font-bold text-slate-800' : 'text-slate-500'}`}
                                >
                                    {node.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {uploadProgress && (
                        <div className="flex items-center gap-2 text-xs font-medium text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full animate-pulse">
                            <Loader2 size={12} className="animate-spin" />
                            Laen faile... {uploadProgress.current}/{uploadProgress.total}
                        </div>
                    )}

                    {/* NEW Button & Dropdown */}
                    <div className="relative">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsNewMenuOpen(!isNewMenuOpen); }}
                            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 shadow-sm transition-colors"
                        >
                            <Plus size={18} /> Uus
                        </button>
                        
                        {isNewMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <button onClick={handleCreateFolder} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                    <FolderPlus size={16} className="text-slate-400" /> Uus Kaust
                                </button>
                                <div className="border-t border-slate-100 my-1"></div>
                                <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                    <FileText size={16} className="text-slate-400" /> Lae failid üles
                                </button>
                                <button onClick={() => folderInputRef.current?.click()} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                    <UploadCloud size={16} className="text-slate-400" /> Lae kaust üles
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="h-8 w-px bg-slate-200"></div>

                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Grid size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white shadow text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Table Header (Only visible in Table Mode) */}
            {viewMode === 'table' && (
                <div className="flex px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="flex-1 pl-10">Nimi</div>
                    <div className="w-32">Tüüp</div>
                    <div className="w-24 text-right">Suurus</div>
                    <div className="w-32 text-center">Muudetud</div>
                    <div className="w-16"></div>
                </div>
            )}

            {/* Content Area */}
            <div 
                ref={parentRef} 
                className="flex-1 overflow-y-auto p-4 custom-scrollbar relative" 
                onScroll={virtualizer.onScroll}
                onContextMenu={(e) => {
                    e.preventDefault();
                    // Global context menu logic could go here
                }}
            >
                {files.length === 0 && !loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-4 border-2 border-dashed border-slate-300">
                            <UploadCloud size={40} />
                        </div>
                        <p className="font-medium">Kaust on tühi</p>
                        <p className="text-sm mt-1">Lohista failid siia või kasuta "Uus" nuppu</p>
                    </div>
                )}

                <div style={{ height: virtualizer.totalHeight, position: 'relative' }}>
                    {virtualizer.virtualItems.map(vRow => {
                        const startIndex = vRow.index * COLUMN_COUNT;
                        const rowItems = files.slice(startIndex, startIndex + COLUMN_COUNT);
                        
                        return (
                            <div 
                                key={vRow.index} 
                                className={`absolute top-0 left-0 w-full ${viewMode === 'grid' ? 'grid grid-cols-6 gap-4' : 'flex flex-col'}`}
                                style={{ transform: `translateY(${vRow.offsetTop}px)`, height: ROW_HEIGHT }}
                            >
                                {rowItems.map(file => (
                                    viewMode === 'grid' ? (
                                        // GRID CARD
                                        <div 
                                            key={file.id} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                file.type === 'folder' ? handleFolderClick(file.id) : null;
                                            }}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setContextMenu({ x: e.clientX, y: e.clientY, fileId: file.id });
                                            }}
                                            className="bg-white border border-slate-200 rounded-xl p-3 hover:shadow-lg hover:border-teal-200 transition-all flex flex-col items-center text-center cursor-pointer h-[140px] group relative"
                                        >
                                            <div className="flex-1 flex items-center justify-center mb-2 w-full">
                                                {getFileIcon(file)}
                                            </div>
                                            <span className="text-xs font-medium text-slate-700 line-clamp-2 w-full leading-tight mb-1 break-words px-2">{file.name}</span>
                                            <span className="text-[10px] text-slate-400">{formatSize(file.size)}</span>
                                            
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setContextMenu({ x: e.clientX, y: e.clientY, fileId: file.id });
                                                }}
                                                className="absolute top-2 right-2 p-1 rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <MoreHorizontal size={14} className="text-slate-400" />
                                            </button>
                                        </div>
                                    ) : (
                                        // TABLE ROW
                                        <div 
                                            key={file.id}
                                            onClick={() => file.type === 'folder' && handleFolderClick(file.id)}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setContextMenu({ x: e.clientX, y: e.clientY, fileId: file.id });
                                            }}
                                            className="flex items-center px-4 h-full border-b border-slate-100 bg-white hover:bg-blue-50 cursor-pointer group"
                                        >
                                            <div className="flex-1 flex items-center gap-3 min-w-0">
                                                {getFileIcon(file)}
                                                <span className="text-sm text-slate-700 truncate font-medium">{file.name}</span>
                                            </div>
                                            <div className="w-32 text-xs text-slate-500">{file.type === 'folder' ? 'Kaust' : file.mimeType || 'Fail'}</div>
                                            <div className="w-24 text-right text-xs text-slate-500 font-mono">{formatSize(file.size)}</div>
                                            <div className="w-32 text-center text-xs text-slate-400">{new Date(file.updatedAt).toLocaleDateString()}</div>
                                            <div className="w-16 flex justify-center">
                                                 <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setContextMenu({ x: e.clientX, y: e.clientY, fileId: file.id });
                                                    }}
                                                    className="p-1 rounded hover:bg-slate-200 opacity-0 group-hover:opacity-100"
                                                >
                                                    <MoreHorizontal size={16} className="text-slate-500" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (() => {
                const file = files.find(f => f.id === contextMenu.fileId);
                if (!file) return null;
                
                return (
                    <div 
                        className="fixed bg-white border border-slate-200 shadow-xl rounded-lg py-1 z-[100] w-48 text-sm animate-in fade-in zoom-in-95 duration-100"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-500 truncate">
                            {file.name}
                        </div>
                        <button onClick={() => file.type === 'folder' ? handleFolderClick(file.id) : null} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                            <Folder size={14} /> Ava
                        </button>
                        <button onClick={() => openShareModal(file)} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                            <Share2 size={14} /> Jaga
                        </button>
                        {file.name.endsWith('.zip') && (
                             <button onClick={() => handleUnzip(file)} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                                <FileArchive size={14} /> Paki lahti
                            </button>
                        )}
                        <button className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                            <Edit2 size={14} /> Muuda nime
                        </button>
                        <button className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                            <Download size={14} /> Lae alla
                        </button>
                        <div className="border-t border-slate-100 my-1"></div>
                        <button onClick={() => handleDelete(file)} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2">
                            <Trash2 size={14} /> Kustuta
                        </button>
                    </div>
                )
            })()}

            {/* Share Modal */}
            <Modal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                title={`Jaga: ${fileToShare?.name}`}
                type="center"
            >
                <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-start gap-3">
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                            {fileToShare?.type === 'folder' ? <Folder className="text-yellow-500" /> : <FileText className="text-slate-500" />}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-700 text-sm">{fileToShare?.name}</h4>
                            <p className="text-xs text-slate-500">{formatSize(fileToShare?.size || 0)} • {fileToShare?.type === 'folder' ? 'Kaust' : 'Fail'}</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Avalik Link</label>
                        {generatedLink ? (
                            <div className="flex gap-2">
                                <input 
                                    readOnly 
                                    value={generatedLink}
                                    className="flex-1 bg-white border border-slate-300 text-slate-600 text-sm rounded px-3 py-2 focus:outline-none"
                                />
                                <button 
                                    onClick={copyToClipboard}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded border border-slate-300 flex items-center gap-2 transition-colors"
                                >
                                    {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                                    {copied ? 'Kopeeritud' : 'Kopeeri'}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                <p className="text-sm text-slate-500 mb-3">Sellel failil pole veel avalikku linki.</p>
                                <button 
                                    onClick={handleGenerateLink}
                                    className="bg-teal-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-teal-700 flex items-center gap-2 mx-auto shadow-sm"
                                >
                                    <LinkIcon size={16} /> Genereeri Link
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};
