
import { db } from './db';

interface QueryParams {
    tableId: string;
    filters?: Record<string, string>;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
}

export const dataAPI = {
    // Optimized query: gets ALL matching IDs but limits actual data fetching if needed
    // For virtualization, we often need the full count and all keys to map index -> data
    async queryRows(params: QueryParams) {
        const { tableId, filters, sortKey, sortDirection } = params;
        
        let collection = db.rows.where('tableId').equals(tableId);

        // Client-side filtering of the collection (Dexie is fast enough for this on <100k filtered set)
        // For >1M, we would use compound indexes in db.ts
        let results = await collection.toArray();

        if (filters && Object.keys(filters).length > 0) {
            results = results.filter(row => {
                return Object.entries(filters).every(([key, value]) => {
                    if (!value) return true;
                    const rowVal = String(row[key] || '').toLowerCase();
                    return rowVal.includes(String(value).toLowerCase());
                });
            });
        }

        if (sortKey) {
            results.sort((a, b) => {
                const valA = a[sortKey];
                const valB = b[sortKey];
                if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return results;
    },

    async getFileChildren(parentId: string | null) {
        // Better implementation that handles null correctly as root
        if (parentId === null) {
            return await db.files.filter(f => f.parentId === null && !f.isDeleted).toArray();
        } else {
             return await db.files.where('parentId').equals(parentId).filter(f => !f.isDeleted).toArray();
        }
    },
    
    async getTableMetadata(tableId: string) {
        return await db.tableDefinitions.get(tableId);
    }
};
