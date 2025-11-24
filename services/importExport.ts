
import { TableDefinition } from "../types";
import { schemaStore } from "./schemaStore";

export const importExportService = {
  // Simple CSV Export
  toCSV(tableId: string): string {
    const table = schemaStore.getTable(tableId);
    if (!table) return '';

    const headers = table.columns.map(c => c.label).join(',');
    const rows = table.rows.map(row => {
      return table.columns.map(c => {
        const val = row[c.key];
        return val ? `"${String(val).replace(/"/g, '""')}"` : '';
      }).join(',');
    }).join('\n');

    return `${headers}\n${rows}`;
  },

  downloadCSV(tableId: string) {
    const csv = this.toCSV(tableId);
    if (!csv) return;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${tableId}_export_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
