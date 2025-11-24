
import { UserCursor } from "../types";
import { schemaStore } from "./schemaStore";

type SyncEventType = 
    | 'CURSOR_UPDATE' 
    | 'SCHEMA_CHANGE' 
    | 'ROW_UPDATE'
    | 'CELL_LOCK'
    | 'CELL_UNLOCK';

// Simulate Multiplayer using BroadcastChannel API (works across tabs)
class RealtimeSync {
    private channel: BroadcastChannel;
    private cursors: Map<string, UserCursor> = new Map();
    private listeners: Function[] = [];
    private myUserId: string;
    private myColor: string;
    private myName: string;

    constructor() {
        this.channel = new BroadcastChannel('rivest_enterprise_sync');
        
        // Random Identity for Demo
        this.myUserId = 'u_' + Math.floor(Math.random() * 10000);
        const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
        this.myColor = colors[Math.floor(Math.random() * colors.length)];
        this.myName = 'User ' + this.myUserId.split('_')[1];

        this.channel.onmessage = (event) => {
            const { type, payload } = event.data;
            
            switch (type as SyncEventType) {
                case 'CURSOR_UPDATE':
                case 'CELL_LOCK':
                    this.cursors.set(payload.userId, payload);
                    this.cleanupStaleCursors();
                    this.notify();
                    break;
                case 'CELL_UNLOCK':
                    // Unlock means we just update the cursor to not be editing
                    const userCursor = this.cursors.get(payload.userId);
                    if (userCursor) {
                        this.cursors.set(payload.userId, { ...userCursor, isEditing: false, lastActive: Date.now() });
                        this.notify();
                    }
                    break;
                case 'ROW_UPDATE':
                    // Granular update to avoid full refresh if possible, 
                    // or just force refresh for simplicity in this demo
                    schemaStore.updateRow(payload.tableId, payload.rowId, payload.data, true); // true = skip history to avoid duplicating
                    this.notify(); 
                    break;
                case 'SCHEMA_CHANGE':
                    schemaStore.forceRefresh && schemaStore.forceRefresh();
                    break;
            }
        };

        // Periodically clean up offline users
        setInterval(() => this.cleanupStaleCursors(), 5000);
    }

    // Send my position to others
    broadcastCursor(tableId: string, rowId: string, colKey: string) {
        const cursor: UserCursor = {
            userId: this.myUserId,
            userName: this.myName,
            color: this.myColor,
            tableId,
            focusedRowId: rowId,
            focusedColKey: colKey,
            isEditing: false,
            lastActive: Date.now()
        };
        
        this.channel.postMessage({
            type: 'CURSOR_UPDATE',
            payload: cursor
        });
    }

    // Lock a cell when editing starts (Conflict Prevention)
    broadcastLock(tableId: string, rowId: string, colKey: string) {
        const cursor: UserCursor = {
            userId: this.myUserId,
            userName: this.myName,
            color: this.myColor,
            tableId,
            focusedRowId: rowId,
            focusedColKey: colKey,
            isEditing: true, // Mark as locked/editing
            lastActive: Date.now()
        };
        
        this.channel.postMessage({
            type: 'CELL_LOCK',
            payload: cursor
        });
    }

    broadcastUnlock(tableId: string) {
        this.channel.postMessage({
            type: 'CELL_UNLOCK',
            payload: { userId: this.myUserId, tableId }
        });
    }

    // Send specific field updates
    broadcastRowUpdate(tableId: string, rowId: string, data: any) {
        this.channel.postMessage({
            type: 'ROW_UPDATE',
            payload: { tableId, rowId, data }
        });
    }

    getCursors(tableId: string): UserCursor[] {
        return Array.from(this.cursors.values()).filter(c => c.tableId === tableId && c.userId !== this.myUserId);
    }

    // Helper to check if a specific cell is locked by someone else
    isCellLocked(tableId: string, rowId: string, colKey: string): UserCursor | undefined {
        return this.getCursors(tableId).find(c => 
            c.isEditing && 
            c.focusedRowId === rowId && 
            c.focusedColKey === colKey
        );
    }

    private cleanupStaleCursors() {
        const now = Date.now();
        let changed = false;
        this.cursors.forEach((c, key) => {
            if (now - c.lastActive > 15000) { // 15s timeout
                this.cursors.delete(key);
                changed = true;
            }
        });
        if (changed) this.notify();
    }

    subscribe(listener: Function) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    private notify() {
        this.listeners.forEach(l => l());
    }
}

export const realtimeSync = new RealtimeSync();