
import { FileNode, FileActivity, User, FileAsset } from '../types';
import { MOCK_USERS } from '../constants';

// Initial Mock Data for Drive
const MOCK_FILES: FileNode[] = [
    {
        id: 'root_1',
        parentId: null,
        name: 'Minu Dokumendid',
        type: 'folder',
        size: 0,
        ownerId: 'u1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shareConfig: { isPublic: false, accessLevel: 'view', sharedWithUserIds: [] },
        activityLog: []
    },
    {
        id: 'f_1',
        parentId: 'root_1',
        name: 'Eelarve_Draft_v1.xlsx',
        type: 'file',
        size: 15400,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        url: '#',
        content: 'Item,Cost,Category\nLabor,5000,Work\nMaterials,12000,Supply\nTransport,2000,Logistics',
        ownerId: 'u1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shareConfig: { isPublic: false, accessLevel: 'view', sharedWithUserIds: [] },
        activityLog: []
    }
];

class FileSystemStore {
    private files: FileNode[];
    private listeners: Function[] = [];
    private currentUser: User = MOCK_USERS[0] as User;

    constructor() {
        try {
            const saved = localStorage.getItem('rivest_drive_v2');
            this.files = saved && saved !== 'undefined' ? JSON.parse(saved) : MOCK_FILES;
        } catch (e) {
            console.warn("Failed to load FileSystem, resetting.", e);
            this.files = MOCK_FILES;
        }
    }

    getAllFiles(): FileNode[] {
        return this.files;
    }

    createFolder(parentId: string | null, name: string): FileNode {
        // Check for duplicate
        const existing = this.files.find(f => f.parentId === parentId && f.name === name && f.type === 'folder' && !f.isDeleted);
        if (existing) return existing;

        const newFolder: FileNode = {
            id: `folder_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            parentId,
            name,
            type: 'folder',
            size: 0,
            ownerId: this.currentUser.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            shareConfig: { isPublic: false, accessLevel: 'view', sharedWithUserIds: [] },
            activityLog: []
        };
        this.files.push(newFolder);
        this.save();
        return newFolder;
    }

    uploadFile(parentId: string | null, file: File) {
        // Handle folder upload path simulation
        // If file.webkitRelativePath exists (e.g., "Folder/Sub/file.txt")
        // We need to ensure the folders exist.
        
        let targetParentId = parentId;

        // Note: webkitRelativePath is available on File object in Chrome/Firefox when directory upload is used
        const relPath = (file as any).webkitRelativePath as string;
        
        if (relPath) {
            const parts = relPath.split('/');
            // The last part is the filename, previous parts are folders
            // parts[0] is the root folder name being uploaded
            
            // Iterate through folders in path
            for (let i = 0; i < parts.length - 1; i++) {
                const folderName = parts[i];
                const folder = this.createFolder(targetParentId, folderName);
                targetParentId = folder.id;
            }
        }

        const newFile: FileNode = {
            id: `file_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            parentId: targetParentId,
            name: file.name,
            type: 'file',
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            url: URL.createObjectURL(file),
            ownerId: this.currentUser.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            shareConfig: { isPublic: false, accessLevel: 'view', sharedWithUserIds: [] },
            activityLog: []
        };
        this.files.push(newFile);
        this.save();
    }
    
    unzipFile(fileId: string) {
        const zipFile = this.files.find(f => f.id === fileId);
        if (!zipFile) return;

        const folderName = zipFile.name.replace('.zip', '') + '_Unzipped';
        const folder = this.createFolder(zipFile.parentId, folderName);

        // Simulation of extracted files
        const dummyFiles = ['Pilt_001.jpg', 'Raport_Final.pdf', 'Andmed_Export.csv', 'Readme.txt'];
        dummyFiles.forEach((name, i) => {
             const extracted: FileNode = {
                id: `extr_${Date.now()}_${i}`,
                parentId: folder.id,
                name: name,
                type: 'file',
                size: Math.floor(Math.random() * 500000), // Random size
                mimeType: name.endsWith('jpg') ? 'image/jpeg' : (name.endsWith('pdf') ? 'application/pdf' : 'text/plain'),
                url: '#',
                ownerId: this.currentUser.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                shareConfig: { isPublic: false, accessLevel: 'view', sharedWithUserIds: [] },
                activityLog: []
            };
            this.files.push(extracted);
        });
        this.save();
    }

    deleteItem(id: string) {
        const item = this.files.find(f => f.id === id);
        if (item) {
            item.isDeleted = true;
            this.save();
        }
    }
    
    generatePublicLink(id: string): string {
        const item = this.files.find(f => f.id === id);
        if (!item) return '';
        const link = `https://rivest.ee/s/${Math.random().toString(36).substring(7)}`;
        item.shareConfig.isPublic = true;
        item.shareConfig.publicLink = link;
        this.save();
        return link;
    }
    
    getPath(fileId: string): FileNode[] {
        const path: FileNode[] = [];
        let current = this.files.find(f => f.id === fileId);
        
        // Safety break to prevent infinite loops in bad data
        let iterations = 0;
        while (current && iterations < 50) {
            path.unshift(current);
            if (!current.parentId) break;
            current = this.files.find(f => f.id === current?.parentId);
            iterations++;
        }
        return path;
    }

    subscribe(listener: Function) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    private save() {
        localStorage.setItem('rivest_drive_v2', JSON.stringify(this.files));
        this.listeners.forEach(l => l());
    }
}

export const fileSystemStore = new FileSystemStore();
