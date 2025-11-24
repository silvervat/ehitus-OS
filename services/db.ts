import Dexie, { Table } from 'dexie';
import { FileNode, TableDefinition } from '../types';

// Define the Database Schema
export class RivestDB extends Dexie {
    files!: Table<FileNode, string>;
    rows!: Table<any, string>; // Dynamic rows: { id, tableId, ...data }
    tableDefinitions!: Table<TableDefinition, string>; // Meta definitions (Renamed from tables to avoid conflict with Dexie.tables)
    
    constructor() {
        super('RivestEnterpriseDB');
        // Cast to any to avoid potential type definition issues with Dexie subclassing in some environments
        (this as any).version(1).stores({
            files: 'id, parentId, name, type, ownerId, isDeleted, [parentId+isDeleted]',
            rows: 'id, tableId, [tableId+status], [tableId+created_at]', // Compound indexes for filtering
            tableDefinitions: 'id'
        });
    }
}

export const db = new RivestDB();

// --- SEEDING FUNCTION FOR MASSIVE DATA ---
export const seedDatabase = async () => {
    // Ensure tables exist before querying
    if (!db.tableDefinitions) return;

    const tableCount = await db.tableDefinitions.count();
    if (tableCount > 0) return; // Already seeded

    console.log("🚀 Starting Massive Data Seeding...");
    
    // 1. Seed Metadata Tables
    const INITIAL_TABLES: TableDefinition[] = [
        {
            id: 'projects',
            name: 'Projektid (Massive)',
            columns: [
                { key: 'id', label: 'Kood', type: 'text', width: 100 },
                { key: 'name', label: 'Projekti Nimi', type: 'text', width: 250 },
                { key: 'status', label: 'Staatus', type: 'status', width: 120 },
                { key: 'budget', label: 'Eelarve', type: 'currency', width: 120 },
                { key: 'manager', label: 'Projektijuht', type: 'text', width: 150 },
                { key: 'priority', label: 'Prioriteet', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], width: 120 }
            ],
            rows: [], // Rows stored separately in 'rows' table
            views: []
        }
    ];
    await db.tableDefinitions.bulkPut(INITIAL_TABLES);

    // 2. Seed 50,000 Rows for Projects
    const rows = [];
    const statuses = ['Töös', 'Planeerimisel', 'Peatatud', 'Lõpetatud'];
    const managers = ['Kristofer', 'Elvis', 'Kuldar', 'Siim', 'Tiit'];
    
    for (let i = 0; i < 50000; i++) {
        rows.push({
            id: `PROJ-${10000 + i}`,
            tableId: 'projects',
            name: `Ehitusobjekt #${i} - Sektor ${String.fromCharCode(65 + (i % 26))}`,
            status: statuses[i % 4],
            budget: Math.floor(Math.random() * 1000000),
            manager: managers[i % 5],
            priority: i % 10 === 0 ? 'Critical' : 'Medium',
            created_at: new Date().toISOString()
        });
    }
    
    // Chunked insert to not freeze UI
    const chunkSize = 5000;
    for (let i = 0; i < rows.length; i += chunkSize) {
        await db.rows.bulkAdd(rows.slice(i, i + chunkSize));
    }

    // 3. Seed Files (10,000 files)
    const files = [];
    for (let i = 0; i < 10000; i++) {
        files.push({
            id: `file_${i}`,
            parentId: i < 100 ? null : `folder_${i % 20}`, // Some root, some in folders
            name: `Dokument_v${i}.pdf`,
            type: 'file',
            size: Math.floor(Math.random() * 5000000),
            mimeType: 'application/pdf',
            ownerId: 'u1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            shareConfig: { isPublic: false, accessLevel: 'view', sharedWithUserIds: [] },
            activityLog: [],
            isDeleted: false
        });
    }
    // Create folders
    for(let i=0; i<20; i++) {
        files.push({
            id: `folder_${i}`,
            parentId: null,
            name: `Arhiiv 202${i%5}`,
            type: 'folder',
            size: 0,
            ownerId: 'u1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            shareConfig: { isPublic: false, accessLevel: 'view', sharedWithUserIds: [] },
            activityLog: [],
            isDeleted: false
        });
    }
    
    await db.files.bulkAdd(files as any);

    console.log("✅ Database Seeding Complete!");
};