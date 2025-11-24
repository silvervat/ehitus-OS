
import { HistoryEntry, User } from "../types";
import { schemaStore } from "./schemaStore";
import { MOCK_USERS } from "../constants";

class HistoryStore {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private maxHistory = 100;
  
  // Mock current user for history records
  private currentUser: User = MOCK_USERS[0] as User; // Default to Kristofer

  constructor() {
      // Load initial state if needed
  }

  // Record a new action
  record(entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'userId'>) {
    const fullEntry: HistoryEntry = {
      ...entry,
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date(),
      userId: this.currentUser.id
    };
    
    this.undoStack.push(fullEntry);
    this.redoStack = []; // Clear redo stack on new action
    
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    
    console.log(`📝 History Recorded: [${fullEntry.type}]`, this.getHumanReadableDiff(fullEntry));
  }

  // Execute Undo
  undo() {
    const entry = this.undoStack.pop();
    if (!entry) {
        console.log("Nothing to undo");
        return;
    }

    this.redoStack.push(entry);
    this.revert(entry);
    
    // Notify UI via toast
    const event = new CustomEvent('automation-toast', { detail: { message: `↩️ Võeti tagasi: ${this.getHumanReadableDiff(entry)}` } });
    window.dispatchEvent(event);
  }

  // Execute Redo
  redo() {
    const entry = this.redoStack.pop();
    if (!entry) {
        console.log("Nothing to redo");
        return;
    }

    this.undoStack.push(entry);
    this.apply(entry);

    const event = new CustomEvent('automation-toast', { detail: { message: `↪️ Tehti uuesti: ${this.getHumanReadableDiff(entry)}` } });
    window.dispatchEvent(event);
  }

  // Get history specifically for a row
  getByRow(tableId: string, rowId: string): HistoryEntry[] {
      // Merge undo and redo stacks to show full timeline, sorted by time desc
      const allEvents = [...this.undoStack, ...this.redoStack];
      return allEvents
        .filter(e => e.tableId === tableId && e.rowId === rowId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Helper to generate text description
  getHumanReadableDiff(entry: HistoryEntry): string {
      if (entry.type === 'CREATE') return 'Loodi uus rida';
      if (entry.type === 'DELETE') return 'Kustutati rida';
      
      if (entry.type === 'UPDATE' && entry.before && entry.after) {
          const changes: string[] = [];
          Object.keys(entry.after).forEach(key => {
              if (key === 'updated_at' || key === 'id') return;
              if (JSON.stringify(entry.before[key]) !== JSON.stringify(entry.after[key])) {
                  let valBefore = entry.before[key];
                  let valAfter = entry.after[key];
                  
                  // Truncate long text
                  if (typeof valBefore === 'string' && valBefore.length > 20) valBefore = valBefore.substring(0, 20) + '...';
                  if (typeof valAfter === 'string' && valAfter.length > 20) valAfter = valAfter.substring(0, 20) + '...';

                  changes.push(`${key}: "${valBefore}" → "${valAfter}"`);
              }
          });
          return changes.length > 0 ? changes.join(', ') : 'Muudeti andmeid';
      }
      return 'Tundmatu muudatus';
  }

  private revert(entry: HistoryEntry) {
    console.log("Reverting...", entry);
    switch (entry.type) {
      case 'UPDATE':
        if (entry.rowId && entry.before) {
          // Force update with skipHistory = true
          schemaStore.updateRow(entry.tableId, entry.rowId, entry.before, true); 
        }
        break;
      case 'CREATE':
        if (entry.rowId) {
          schemaStore.deleteRow(entry.tableId, entry.rowId, true);
        }
        break;
      case 'DELETE':
        if (entry.before) {
          schemaStore.addRow(entry.tableId, entry.before, true);
        }
        break;
    }
  }

  private apply(entry: HistoryEntry) {
    console.log("Applying...", entry);
    switch (entry.type) {
      case 'UPDATE':
        if (entry.rowId && entry.after) {
          schemaStore.updateRow(entry.tableId, entry.rowId, entry.after, true);
        }
        break;
      case 'CREATE':
        if (entry.after) {
          schemaStore.addRow(entry.tableId, entry.after, true);
        }
        break;
      case 'DELETE':
        if (entry.rowId) {
          schemaStore.deleteRow(entry.tableId, entry.rowId, true);
        }
        break;
    }
  }
}

export const historyStore = new HistoryStore();
