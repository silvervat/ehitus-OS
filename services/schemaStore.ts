
import { TableDefinition, Role, PermissionMatrix, PermissionRule, SavedView, FileAsset, FormLayout, ColumnPermissionMatrix, ColumnPermission } from '../types';
import { GENERATE_LARGE_DATASET, MOCK_USERS } from '../constants';
import { historyStore } from './historyStore';

// ... (Keep existing INITIAL constants) ...
const INITIAL_ROLES: Role[] = [
    { id: 'admin', name: 'Administraator', color: '#ef4444', description: 'Täielik ligipääs süsteemile', isSystem: true },
    { id: 'manager', name: 'Projektijuht', color: '#3b82f6', description: 'Juhib projekte ja meeskondi' },
    { id: 'foreman', name: 'Töödejuhataja', color: '#f59e0b', description: 'Platsi tööde korraldamine' },
    { id: 'worker', name: 'Töötaja', color: '#10b981', description: 'Töökäskude täitmine' },
    { id: 'client', name: 'Klient', color: '#6366f1', description: 'Ainult vaatamisõigus' }
];

const INITIAL_PERMISSIONS: PermissionMatrix = {
    'admin': {}, 
    'manager': {},
    'client': {}
};

// ... (Keep existing INITIAL_TABLES) ...
const INITIAL_TABLES: TableDefinition[] = [
    {
        id: 'companies',
        name: 'Ettevõtted',
        isSystem: true,
        columns: [
            { key: 'id', label: 'ID', type: 'text', width: 80 },
            { key: 'name', label: 'Nimi', type: 'text', width: 200, validation: { required: true } },
            { key: 'logo', label: 'Logo', type: 'image', width: 80 },
            { key: 'type', label: 'Tüüp', type: 'select', options: ['client', 'supplier', 'subcontractor'], width: 120 },
            { key: 'reg_code', label: 'Reg. Kood', type: 'text', width: 100 }
        ],
        rows: [
            { id: 'c1', name: 'Nordec OY', type: 'client', reg_code: 'FI123456' },
            { id: 'c2', name: 'Merko', type: 'client', reg_code: 'EE100200' },
            { id: 'c3', name: 'Fund Ehitus', type: 'client', reg_code: 'EE555666' },
        ],
        views: []
    },
    {
        id: 'projects',
        name: 'Projektid',
        isSystem: true,
        columns: [
            { key: 'id', label: 'Kood', type: 'text', width: 100, style: { bold: true } },
            { key: 'name', label: 'Projekti Nimi', type: 'text', width: 250, validation: { required: true, minLength: 3 } },
            { key: 'status', label: 'Staatus', type: 'status', width: 120 },
            { key: 'progress', label: 'Valmidus', type: 'progress', width: 120 },
            { key: 'start_date', label: 'Algus', type: 'date', width: 120 },
            { key: 'end_date', label: 'Lõpp', type: 'date', width: 120 },
            { key: 'budget', label: 'Eelarve (€)', type: 'currency', width: 120 },
            { key: 'client_id', label: 'Klient', type: 'reference', referenceTableId: 'companies', referenceLabelKey: 'name', width: 150 },
            { key: 'manager_id', label: 'Projektijuht', type: 'reference', referenceTableId: 'users', referenceLabelKey: 'name', width: 150 },
        ],
        rows: GENERATE_LARGE_DATASET().map(p => ({
            id: p.id,
            name: p.name,
            client_id: 'c1',
            manager_id: 'u1',
            status: p.status,
            start_date: p.startDate,
            end_date: p.deadline,
            budget: p.budget,
            progress: Math.round((p.hoursUsed / p.hoursTotal) * 100)
        })),
        views: []
    },
    {
        id: 'daily_logs',
        name: 'Ehitustööpäevikud',
        isSystem: true,
        columns: [
            { key: 'id', label: 'ID', type: 'text', width: 80 },
            { key: 'date', label: 'Kuupäev', type: 'date', width: 120 },
            { key: 'description', label: 'Kirjeldus', type: 'long_text', width: 300 },
            { key: 'weather', label: 'Ilm', type: 'tags', width: 150 },
            { key: 'image', label: 'Pildid', type: 'image', width: 100 },
            { key: 'ai_tags', label: 'AI Märksõnad', type: 'tags', width: 200, hidden: false },
            { key: 'ai_description', label: 'AI Analüüs', type: 'text', width: 250, hidden: true }
        ],
        rows: [
            ...Array.from({ length: 5 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i * 2);
                return {
                    id: `LOG-${100+i}`,
                    date: d.toISOString().split('T')[0],
                    description: `Päeviku sissekanne #${i+1}. Teostatud montaažitööd tsoonis B.`,
                    weather: ['Päikseline', 'Tuuline'],
                    image: `https://source.unsplash.com/random/200x200?construction,site&sig=${i}`,
                    ai_tags: ['ehitus', 'plats', 'töölised'],
                    ai_description: 'Pildil on näha ehitusplatsi üldvaade.'
                };
            })
        ],
        views: [
            { id: 'v_cal', name: 'Kalender', viewMode: 'calendar', filters: {}, sortConfig: null, hiddenColumnKeys: [] }
        ]
    },
    {
        id: 'documents',
        name: 'Dokumendid',
        isSystem: true,
        columns: [
            { key: 'id', label: 'ID', type: 'text', width: 80 },
            { key: 'name', label: 'Faili nimi', type: 'text', width: 200 },
            { key: 'type', label: 'Tüüp', type: 'select', options: ['PDF', 'Joonis', 'Leping', 'Pilt'], width: 100 },
            { key: 'file_url', label: 'Fail', type: 'file', width: 120 },
            { key: 'project_id', label: 'Projekt', type: 'reference', referenceTableId: 'projects', referenceLabelKey: 'name', width: 150 },
            { key: 'ai_tags', label: 'AI Tuvastatud', type: 'tags', width: 200 },
            { key: 'ai_summary', label: 'AI Kokkuvõte', type: 'long_text', width: 300 }
        ],
        rows: [
            { id: 'D1', name: 'Ehitusluba.pdf', type: 'PDF', project_id: 'RM2508', ai_tags: ['luba', 'ametlik'], ai_summary: 'Dokument sisaldab ehitusloa numbrit 12345.' },
            { id: 'D2', name: 'Korruse Plaan.dwg', type: 'Joonis', project_id: 'RM2506', ai_tags: ['joonis', 'arhitektuur'], ai_summary: '1. korruse plaan vaatega põhjast.' }
        ],
        views: []
    },
    {
        id: 'users',
        name: 'Süsteemi Kasutajad',
        isSystem: true,
        columns: [
            { key: 'name', label: 'Nimi', type: 'text', width: 180 },
            { key: 'email', label: 'Email', type: 'text', width: 200 },
            { key: 'roleId', label: 'Roll', type: 'select', options: [], width: 120 }, 
            { key: 'status', label: 'Staatus', type: 'status', width: 100 },
            { key: 'avatar', label: 'Avatar', type: 'image', width: 80 }
        ],
        rows: MOCK_USERS,
        views: []
    }
];

class SchemaStore {
    private tables: TableDefinition[];
    private roles: Role[];
    private permissions: PermissionMatrix;
    private colPermissions: ColumnPermissionMatrix; 
    private listeners: Function[] = [];

    constructor() {
        this.tables = this.loadSafe('rivest_schema_v5', INITIAL_TABLES);
        this.roles = this.loadSafe('rivest_roles_v1', INITIAL_ROLES);
        this.permissions = this.loadSafe('rivest_perms_v1', INITIAL_PERMISSIONS);
        this.colPermissions = this.loadSafe('rivest_col_perms_v1', {});
        
        if (!Array.isArray(this.tables)) {
            this.tables = INITIAL_TABLES;
        }
        this.tables.forEach(t => {
            if(!t.rows) t.rows = [];
            if(!t.columns) t.columns = [];
            if(!t.views) t.views = [];
        });
    }

    private loadSafe(key: string, fallback: any) {
        try {
            const item = localStorage.getItem(key);
            if (!item || item === 'undefined' || item === 'null') return fallback;
            return JSON.parse(item);
        } catch (e) {
            return fallback;
        }
    }

    getTables() { return this.tables; }
    getTable(id: string) { return this.tables.find(t => t.id === id); }
    getRoles() { return this.roles; }

    addTable(name: string) {
        const newId = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
        const newTable: TableDefinition = {
            id: newId,
            name: name,
            columns: [
                { key: 'id', label: 'ID', type: 'text', width: 80 },
                { key: 'created_at', label: 'Loodud', type: 'date', width: 120 }
            ],
            rows: [],
            views: []
        };
        this.tables.push(newTable);
        this.save();
        return newTable;
    }

    addColumn(tableId: string, column: any) {
        const table = this.tables.find(t => t.id === tableId);
        if (table) {
            table.columns.push(column);
            this.save();
        }
    }

    updateColumn(tableId: string, columnKey: string, updates: any) {
        const table = this.tables.find(t => t.id === tableId);
        if (table) {
            const colIndex = table.columns.findIndex(c => c.key === columnKey);
            if (colIndex > -1) {
                // Ensure deep merge for nested objects like validation/style
                const col = table.columns[colIndex];
                table.columns[colIndex] = { 
                    ...col, 
                    ...updates,
                    validation: { ...col.validation, ...updates.validation },
                    style: { ...col.style, ...updates.style }
                };
                this.save();
            }
        }
    }

    moveColumn(tableId: string, columnKey: string, direction: 'up' | 'down') {
        const table = this.tables.find(t => t.id === tableId);
        if(table) {
            const idx = table.columns.findIndex(c => c.key === columnKey);
            if(idx === -1) return;
            
            const newIdx = direction === 'up' ? idx - 1 : idx + 1;
            if(newIdx >= 0 && newIdx < table.columns.length) {
                const temp = table.columns[newIdx];
                table.columns[newIdx] = table.columns[idx];
                table.columns[idx] = temp;
                this.save();
            }
        }
    }

    saveFormLayout(tableId: string, layout: FormLayout) {
        const table = this.tables.find(t => t.id === tableId);
        if(table) {
            table.formLayout = layout;
            this.save();
        }
    }

    addRow(tableId: string, row: any, skipHistory: boolean = false) {
        const table = this.tables.find(t => t.id === tableId);
        if (table) {
            const newId = row.id || `gen-${Date.now()}`;
            const newRow = { ...row, id: newId };
            
            table.rows.push(newRow);
            this.save();

            if (!skipHistory) {
                historyStore.record({
                    type: 'CREATE',
                    tableId,
                    rowId: newId,
                    before: null,
                    after: newRow
                });
            }
            return newId;
        }
        return null;
    }
    
    updateRow(tableId: string, rowId: string, data: any, skipHistory: boolean = false) {
        const table = this.tables.find(t => t.id === tableId);
        if (table) {
            const idx = table.rows.findIndex(r => r.id === rowId);
            if(idx > -1) {
                const oldRow = { ...table.rows[idx] };
                const newRow = { ...oldRow, ...data };
                
                table.rows[idx] = newRow;
                this.save();

                if (!skipHistory) {
                    historyStore.record({
                        type: 'UPDATE',
                        tableId,
                        rowId,
                        before: oldRow,
                        after: newRow
                    });
                }
            }
        }
    }

    deleteRow(tableId: string, rowId: string, skipHistory: boolean = false) {
        const table = this.tables.find(t => t.id === tableId);
        if (table) {
            const oldRow = table.rows.find(r => r.id === rowId);
            if (!oldRow) return;

            table.rows = table.rows.filter(r => r.id !== rowId);
            this.save();

            if (!skipHistory) {
                historyStore.record({
                    type: 'DELETE',
                    tableId,
                    rowId,
                    before: oldRow,
                    after: null
                });
            }
        }
    }

    duplicateRow(tableId: string, rowId: string) {
        const table = this.tables.find(t => t.id === tableId);
        if (table) {
            const row = table.rows.find(r => r.id === rowId);
            if (row) {
                const newRow = JSON.parse(JSON.stringify(row));
                newRow.id = `copy-${Date.now()}`;
                if (newRow.name) newRow.name = `${newRow.name} (Koopia)`;
                
                this.addRow(tableId, newRow); // This will handle history internally
            }
        }
    }

    addView(tableId: string, view: SavedView) {
        const table = this.tables.find(t => t.id === tableId);
        if(table) {
            if(!table.views) table.views = [];
            table.views.push(view);
            this.save();
        }
    }
    
    deleteView(tableId: string, viewId: string) {
        const table = this.tables.find(t => t.id === tableId);
        if(table && table.views) {
            table.views = table.views.filter(v => v.id !== viewId);
            this.save();
        }
    }

    getLookupMap(tableId: string, labelKey: string): Record<string, string> {
        const table = this.getTable(tableId);
        if (!table) return {};
        return table.rows.reduce((acc, row) => {
            acc[row.id] = row[labelKey];
            return acc;
        }, {} as Record<string, string>);
    }
    
    getAllAssets(): FileAsset[] {
        const assets: FileAsset[] = [];
        if (!Array.isArray(this.tables)) return [];

        this.tables.forEach(table => {
            if (!table.columns || !table.rows) return;
            const fileCols = table.columns.filter(c => c.type === 'image' || c.type === 'file');
            if(fileCols.length === 0) return;
            table.rows.forEach(row => {
                fileCols.forEach(col => {
                    const url = row[col.key];
                    if(url && typeof url === 'string' && url.length > 5) {
                        assets.push({
                            id: row.id + '_' + col.key,
                            url: url,
                            name: row.name || row.title || row.description || 'Nimetu fail',
                            sourceTableId: table.id,
                            sourceTableName: table.name,
                            rowId: row.id,
                            columnKey: col.key,
                            aiTags: row.ai_tags
                        });
                    }
                });
            });
        });
        return assets;
    }

    getTotalStats() {
        let totalRows = 0;
        if (!Array.isArray(this.tables)) return { totalRows: 0, totalTables: 0, totalFiles: 0 };
        let totalTables = this.tables.length;
        let totalFiles = this.getAllAssets().length; 
        this.tables.forEach(t => totalRows += (t.rows ? t.rows.length : 0));
        return { totalRows, totalTables, totalFiles };
    }

    addRole(name: string, color: string) {
        const newRole: Role = {
            id: name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 1000),
            name,
            color,
            description: 'Uus roll'
        };
        this.roles.push(newRole);
        this.save();
    }

    deleteRole(id: string) {
        const role = this.roles.find(r => r.id === id);
        if (role && !role.isSystem) {
            this.roles = this.roles.filter(r => r.id !== id);
            delete this.permissions[id];
            this.save();
        }
    }

    getPermission(roleId: string, tableId: string): PermissionRule {
        if (roleId === 'admin') return { view: true, create: true, edit: true, delete: true };
        const rolePerms = this.permissions[roleId];
        if (rolePerms && rolePerms[tableId]) return rolePerms[tableId];
        return { view: false, create: false, edit: false, delete: false };
    }

    updatePermission(roleId: string, tableId: string, rule: Partial<PermissionRule>) {
        if (roleId === 'admin') return;
        if (!this.permissions[roleId]) this.permissions[roleId] = {};
        const current = this.getPermission(roleId, tableId);
        this.permissions[roleId][tableId] = { ...current, ...rule };
        this.save();
    }

    getColumnPermission(roleId: string, tableId: string, columnKey: string): ColumnPermission {
        if (roleId === 'admin') return { view: true, edit: true };
        const tablePerms = this.colPermissions[tableId];
        if (tablePerms && tablePerms[columnKey] && tablePerms[columnKey][roleId]) {
            return tablePerms[columnKey][roleId];
        }
        return { view: true, edit: true };
    }

    updateColumnPermission(roleId: string, tableId: string, columnKey: string, perm: Partial<ColumnPermission>) {
        if (roleId === 'admin') return;
        if (!this.colPermissions[tableId]) this.colPermissions[tableId] = {};
        if (!this.colPermissions[tableId][columnKey]) this.colPermissions[tableId][columnKey] = {};
        const current = this.getColumnPermission(roleId, tableId, columnKey);
        this.colPermissions[tableId][columnKey][roleId] = { ...current, ...perm };
        this.save();
    }

    subscribe(listener: Function) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }
    
    forceRefresh() {
        this.listeners.forEach(l => l());
    }

    private save() {
        localStorage.setItem('rivest_schema_v5', JSON.stringify(this.tables));
        localStorage.setItem('rivest_roles_v1', JSON.stringify(this.roles));
        localStorage.setItem('rivest_perms_v1', JSON.stringify(this.permissions));
        localStorage.setItem('rivest_col_perms_v1', JSON.stringify(this.colPermissions));
        this.listeners.forEach(l => l());
    }
}

export const schemaStore = new SchemaStore();
