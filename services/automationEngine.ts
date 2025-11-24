
import { Automation, AutomationAction, AutomationCondition, AutomationTriggerType } from "../types";
import { schemaStore } from "./schemaStore";
import { historyStore } from "./historyStore"; // Forward ref

class AutomationEngine {
    private automations: Map<string, Automation> = new Map();
    private listeners: Function[] = [];

    constructor() {
        // Initialize with a mock automation
        this.addAutomation({
            id: 'auto_1',
            name: 'Teavita Projektijuhti kui Staatus = Lõpetatud',
            active: true,
            tableId: 'projects',
            trigger: { type: 'STATUS_CHANGED', columnKey: 'status', toValue: 'Lõpetatud' },
            conditions: [],
            actions: [{ type: 'NOTIFY_USER', payload: { message: 'Projekt on valmis!' } }],
            runCount: 12
        });
    }

    getAutomations(tableId: string) {
        return Array.from(this.automations.values()).filter(a => a.tableId === tableId);
    }

    addAutomation(auto: Automation) {
        this.automations.set(auto.id, auto);
        this.notify();
    }

    deleteAutomation(id: string) {
        this.automations.delete(id);
        this.notify();
    }

    triggerEvent(eventType: AutomationTriggerType, tableId: string, row: any, changes?: any) {
        const relatedAutomations = this.getAutomations(tableId).filter(a => a.active);

        relatedAutomations.forEach(auto => {
            if (this.checkTrigger(auto, eventType, changes) && this.checkConditions(auto, row)) {
                this.executeActions(auto, row);
            }
        });
    }

    private checkTrigger(auto: Automation, eventType: AutomationTriggerType, changes?: any): boolean {
        if (auto.trigger.type !== eventType) return false;

        if (eventType === 'STATUS_CHANGED' && changes) {
            // Check if specific column changed to specific value
            if (auto.trigger.columnKey && changes[auto.trigger.columnKey] !== undefined) {
                 if (auto.trigger.toValue && changes[auto.trigger.columnKey] !== auto.trigger.toValue) {
                     return false;
                 }
                 return true;
            }
            return false;
        }
        
        if (eventType === 'ROW_UPDATED' && auto.trigger.columnKey && changes) {
             return changes[auto.trigger.columnKey] !== undefined;
        }

        return true;
    }

    private checkConditions(auto: Automation, row: any): boolean {
        if (!auto.conditions || auto.conditions.length === 0) return true;

        return auto.conditions.every(cond => {
            const val = row[cond.column];
            switch (cond.operator) {
                case 'equals': return val == cond.value;
                case 'not_equals': return val != cond.value;
                case 'contains': return String(val).includes(cond.value);
                case 'greater_than': return val > cond.value;
                case 'less_than': return val < cond.value;
                case 'is_empty': return !val;
                case 'is_not_empty': return !!val;
                default: return false;
            }
        });
    }

    private async executeActions(auto: Automation, row: any) {
        console.log(`🤖 AUTOMATION [${auto.name}] STARTING...`);
        
        for (const action of auto.actions) {
            await this.runAction(action, row);
        }

        auto.runCount++;
        auto.lastRun = new Date();
        this.notify();
    }

    private async runAction(action: AutomationAction, row: any) {
        // Simulate delay
        await new Promise(r => setTimeout(r, 500));

        switch(action.type) {
            case 'NOTIFY_USER':
                const msg = this.interpolate(action.payload.message, row);
                const event = new CustomEvent('automation-toast', { detail: { message: `🤖 ${msg}` } });
                window.dispatchEvent(event);
                break;
                
            case 'UPDATE_ROW':
                if (action.targetColumn) {
                     // CAUTION: Avoid infinite loops
                     schemaStore.updateRow(row.tableId, row.id, { [action.targetColumn]: action.payload.value });
                }
                break;
                
            case 'CREATE_ROW':
                // logic to create row
                break;
        }
    }

    private interpolate(template: string, row: any): string {
        return template.replace(/\{\{(\w+)\}\}/g, (_, key) => row[key] || '');
    }

    subscribe(listener: Function) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    private notify() {
        this.listeners.forEach(l => l());
    }
}

export const automationEngine = new AutomationEngine();
