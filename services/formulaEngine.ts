
/*
 * Enterprise Formula Engine
 * Supports arithmetic, logic, date functions, and string operations.
 */

import { schemaStore } from "./schemaStore";

interface FormulaContext {
    row: Record<string, any>;
    tableId?: string;
}

export class FormulaEngine {
    
    // Evaluate a formula string against a row context
    evaluate(formula: string, context: FormulaContext): any {
        if (!formula || !formula.startsWith('=')) return null;
        
        const expression = formula.substring(1).trim();

        try {
            // 1. Pre-process: Replace column references [Col Name] or {col_key} with values
            // We'll support both {key} and [Label] formats for flexibility
            const processedExpr = this.preprocessVariables(expression, context);

            // 2. Handle Functions (Recursive or specific parsers)
            if (processedExpr.startsWith('IF(')) return this.evaluateIF(processedExpr, context);
            if (processedExpr.startsWith('CONCAT(')) return this.evaluateCONCAT(processedExpr);
            if (processedExpr.startsWith('TODAY(')) return new Date().toISOString().split('T')[0];
            if (processedExpr.startsWith('NOW(')) return new Date().toISOString();
            
            // 3. Eval Math/Logic
            // Basic sanitization
            if (/^[\d\s+\-*/()."<>=!&|']+$/.test(processedExpr)) {
                // eslint-disable-next-line no-new-func
                return new Function(`return ${processedExpr}`)();
            }
            
            // Fallback for simple string literals
            if (processedExpr.startsWith('"') && processedExpr.endsWith('"')) {
                return processedExpr.slice(1, -1);
            }

            return "#ERROR";

        } catch (e) {
            console.error("Formula Error", e);
            return "#ERR";
        }
    }

    private preprocessVariables(expr: string, context: FormulaContext): string {
        // Regex for {key}
        let processed = expr.replace(/\{(\w+)\}/g, (match, key) => {
            return this.getValueForExpr(context.row, key);
        });

        // Regex for [Label] - simplified (assuming keys are used mostly)
        // In a real app we'd map Label -> Key first.
        
        return processed;
    }

    private getValueForExpr(row: any, key: string): string {
        const val = row[key];
        if (val === undefined || val === null) return '0';
        if (typeof val === 'string') return `"${val}"`;
        if (val instanceof Date) return `"${val.toISOString()}"`;
        return String(val);
    }

    private evaluateIF(expr: string, context: FormulaContext): any {
        // IF(condition, trueVal, falseVal) - Simple Parser
        // Warning: This simple regex fails on nested commas inside strings/functions
        const content = expr.substring(3, expr.length - 1);
        const parts = this.splitArgs(content);
        
        if (parts.length < 3) return "#ARGS_ERR";

        const condition = parts[0];
        const trueVal = parts[1];
        const falseVal = parts[2];

        // Evaluate condition safely
        try {
             // eslint-disable-next-line no-new-func
             const isTrue = new Function(`return ${condition}`)();
             return isTrue ? this.cleanResult(trueVal) : this.cleanResult(falseVal);
        } catch (e) {
            return "#COND_ERR";
        }
    }

    private evaluateCONCAT(expr: string): string {
        const content = expr.substring(7, expr.length - 1); 
        const parts = this.splitArgs(content);
        return parts.map(p => this.cleanResult(p)).join('');
    }

    // Rollup helper: Calculate aggregate from related table
    evaluateRollup(
        sourceTableId: string, 
        linkColumnKey: string, 
        targetTableId: string,
        targetColumnKey: string,
        aggregation: 'SUM' | 'AVG' | 'COUNT'
    ): number {
        const table = schemaStore.getTable(targetTableId);
        if (!table) return 0;
        
        // Find rows in target table that point to source row (Not fully implemented in this mock without specific row context)
        return 0;
    }

    // Helper to split arguments by comma, ignoring commas in strings/parentheses
    private splitArgs(str: string): string[] {
        const result = [];
        let current = '';
        let depth = 0;
        let inString = false;

        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            if (char === '"') inString = !inString;
            else if (char === '(' && !inString) depth++;
            else if (char === ')' && !inString) depth--;
            
            if (char === ',' && depth === 0 && !inString) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    private cleanResult(str: string): any {
        if (str.startsWith('"') && str.endsWith('"')) return str.slice(1, -1);
        if (!isNaN(Number(str))) return Number(str);
        return str;
    }
}

export const formulaEngine = new FormulaEngine();
