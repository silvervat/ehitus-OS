
import { FileNode, FileActivity, User, FileAsset } from '../types';
import { schemaStore, MOCK_USERS } from './schemaStore';

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
        id: 'root_2',
        parentId: null,
        name: 'Projektide Arhiiv 2024',
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
    },
    {
        id: 'f_2',
        parentId: 'root_1',
        name: 'Märkmed.txt',
        type: 'file',
        size: 1024,
        mimeType: 'text/plain',
        url: '#',
        content: 'Koosoleku märkmed:\n1. Vaata üle eelarve\n2. Kinnita puhkused\n3. Telli uus kraana',
        ownerId: 'u1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shareConfig: { isPublic: false, accessLevel: 'view', sharedWithUserIds: [] },
        activityLog: []
    },
    {
        id: 'zip_1',
        parentId: null,
        name: 'Vanad_Pildid.zip',
        type: 'file',
        size: 5000000,
        mimeType: 'application/zip',
        url: '#',
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
    private currentUser: User = MOCK_USERS[0]; // Simulate logged in admin

    constructor() {
        const saved = localStorage.getItem('rivest_drive_v1');
        this.files = saved ? JSON.parse(saved) : MOCK_FILES;
    }

    // --- READ ---
    getFiles(parentId: string | null = null, includeDeleted = false): FileNode[] {
        return this.files.filter(f => 
            f.parentId === parentId && 
            (includeDeleted ? true : !f.isDeleted)
        );
    }
    
    getAllFiles(): FileNode[] {
        return this.files;
    }

    getFile(id: string) {
        return this.files.find(f => f.id === id);
    }

    // --- ACTIONS ---
    createFolder(parentId: string | null, name: string) {
        const newFolder: FileNode = {
            id: `folder_${Date.now()}`,
            parentId,
            name,
            type: 'folder',
            size: 0,
            ownerId: this.currentUser.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            shareConfig: { isPublic: false, accessLevel: 'view', sharedWithUserIds: [] },
            activityLog: [{
                id: `act_${Date.now()}`,
                userId: this.currentUser.id,
                userName: this.currentUser.name,
                action: 'upload', // 'create'
                timestamp: new Date().toISOString(),
                details: 'Kaust loodud'
            }]
        };
        this.files.push(newFolder);
        this.save();
        return newFolder;
    }

    uploadFile(parentId: string | null, file: File) {
        // Simulate upload
        const newFile: FileNode = {
            id: `file_${Date.now()}`,
            parentId,
            name: file.name,
            type: 'file',
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            url: URL.createObjectURL(file), // Local blob for demo
            ownerId: this.currentUser.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            shareConfig: { isPublic: false, accessLevel: 'view', sharedWithUserIds: [] },
            activityLog: [{
                id: `act_${Date.now()}`,
                userId: this.currentUser.id,
                userName: this.currentUser.name,
                action: 'upload',
                timestamp: new Date().toISOString(),
                details: 'Fail üles laetud'
            }]
        };
        this.files.push(newFile);
        this.save();
    }
    
    // Simulate Unzipping
    unzipFile(fileId: string) {
        const zipFile = this.files.find(f => f.id === fileId);
        if (!zipFile) return;

        // 1. Create a folder with the zip name
        const folderName = zipFile.name.replace('.zip', '');
        const folder = this.createFolder(zipFile.parentId, folderName);

        // 2. Create dummy content inside
        const dummyFiles = ['Pilt_001.jpg', 'Raport.pdf', 'Andmed.csv'];
        dummyFiles.forEach((name, i) => {
             const extracted: FileNode = {
                id: `extr_${Date.now()}_${i}`,
                parentId: folder.id,
                name: name,
                type: 'file',
                size: Math.floor(Math.random() * 100000),
                mimeType: name.endsWith('jpg') ? 'image/jpeg' : (name.endsWith('pdf') ? 'application/pdf' : 'text/csv'),
                url: `https://source.unsplash.com/random/100x100?sig=${i}`, // Dummy url
                content: name.endsWith('csv') ? 'ID,Name,Value\n1,Test,100\n2,Demo,200' : undefined,
                ownerId: this.currentUser.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                shareConfig: { isPublic: false, accessLevel: 'view', sharedWithUserIds: [] },
                activityLog: [{
                    id: `act_${Date.now()}_${i}`,
                    userId: this.currentUser.id,
                    userName: this.currentUser.name,
                    action: 'unzip',
                    timestamp: new Date().toISOString(),
                    details: `Lahti pakitud failist ${zipFile.name}`
                }]
            };
            this.files.push(extracted);
        });
        
        this.logActivity(zipFile.id, 'unzip', 'Arhiiv lahti pakitud');
        this.save();
    }

    moveItem(id: string, newParentId: string | null) {
        const item = this.files.find(f => f.id === id);
        if (item) {
            item.parentId = newParentId;
            item.updatedAt = new Date().toISOString();
            this.logActivity(id, 'move', newParentId ? `Liigutatud kausta` : 'Liigutatud juurkausta');
            this.save();
        }
    }

    deleteItem(id: string) {
        const item = this.files.find(f => f.id === id);
        if (item) {
            // Soft delete
            item.isDeleted = true;
            this.logActivity(id, 'delete', 'Liigutatud prügikasti');
            this.save();
        }
    }
    
    updateContent(id: string, newContent: string) {
        const item = this.files.find(f => f.id === id);
        if (item) {
            item.content = newContent;
            item.updatedAt = new Date().toISOString();
            this.logActivity(id, 'edit', 'Sisu muudetud online redaktoris');
            this.save();
        }
    }

    // --- SHARING ---
    generatePublicLink(id: string): string {
        const item = this.files.find(f => f.id === id);
        if (!item) return '';
        
        const link = `https://rivest.ee/s/${Math.random().toString(36).substring(7)}`;
        item.shareConfig.isPublic = true;
        item.shareConfig.publicLink = link;
        
        this.logActivity(id, 'share', 'Loodud avalik link');
        this.save();
        return link;
    }

    togglePublic(id: string, status: boolean) {
        const item = this.files.find(f => f.id === id);
        if(item) {
            item.shareConfig.isPublic = status;
            this.save();
        }
    }

    // --- ACTIVITY ---
    logActivity(fileId: string, action: FileActivity['action'], details: string) {
        const item = this.files.find(f => f.id === fileId);
        if (item) {
            item.activityLog.unshift({
                id: `act_${Date.now()}`,
                userId: this.currentUser.id,
                userName: this.currentUser.name,
                timestamp: new Date().toISOString(),
                action,
                details
            });
        }
    }

    // --- HELPERS ---
    getPath(fileId: string): FileNode[] {
        const path: FileNode[] = [];
        let current = this.files.find(f => f.id === fileId);
        while (current) {
            path.unshift(current);
            if (!current.parentId) break;
            current = this.files.find(f => f.id === current?.parentId);
        }
        return path;
    }

    subscribe(listener: Function) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    private save() {
        localStorage.setItem('rivest_drive_v1', JSON.stringify(this.files));
        this.listeners.forEach(l => l());
    }
}

export const fileSystemStore = new FileSystemStore();
