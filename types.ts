
import React from 'react';

export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  PROJECTS = 'PROJECTS',
  INSPECTION = 'INSPECTION',
  EMPLOYEES = 'EMPLOYEES',
  FINANCE = 'FINANCE',
  SETTINGS = 'SETTINGS',
  DYNAMIC = 'DYNAMIC', // For user-created pages
  FILES = 'FILES' // New File Manager View
}

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  view?: ViewType;
  children?: SidebarItem[];
  isOpen?: boolean;
  tableId?: string; // If this page is linked to a dynamic table
}

// --- DYNAMIC SCHEMA TYPES ---

export type ColumnType = 'text' | 'number' | 'date' | 'select' | 'reference' | 'currency' | 'status' | 'image' | 'file' | 'tags' | 'progress' | 'long_text' | 'formula';

export interface ColumnValidation {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}

export interface ColumnStyle {
    textSize?: 'sm' | 'md' | 'lg';
    bold?: boolean;
    color?: string;
}

export interface ColumnDefinition {
  key: string;
  label: string;
  type: ColumnType;
  width?: number;
  referenceTableId?: string; // Foreign Key: Which table does this point to?
  referenceLabelKey?: string; // Which column from the foreign table to display? (e.g., 'name')
  options?: string[]; // For 'select' type
  hidden?: boolean; // Global default visibility (can be overridden by Views)
  
  // New features for Form Designer 2.0
  validation?: ColumnValidation;
  style?: ColumnStyle;

  // Formula Engine
  formula?: string; // e.g. "SUM([Budget])"
  resultType?: 'number' | 'text' | 'date' | 'boolean';
}

export interface FormSection {
    id: string;
    title: string;
    columnKeys: string[]; // Ordered list of columns in this section
    isTwoColumn?: boolean; // Layout style
}

export interface FormLayout {
    sections: FormSection[];
}

export interface SavedView {
  id: string;
  name: string;
  viewMode: ViewMode;
  filters: Record<string, string>;
  sortConfig: SortConfig | null;
  hiddenColumnKeys: string[]; // List of keys to hide
}

export interface TableDefinition {
  id: string;
  name: string;
  columns: ColumnDefinition[];
  rows: any[]; // Simulated DB rows
  views?: SavedView[]; // User-defined saved views
  formLayout?: FormLayout; // Custom form design
  isSystem?: boolean; // If true, cannot be deleted
}

// --- FORMULAS ---

export type FormulaType = 
  | 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX'
  | 'IF' | 'AND' | 'OR' | 'NOT'
  | 'CONCAT' | 'LEFT' | 'RIGHT' | 'MID' | 'TRIM'
  | 'TODAY' | 'NOW' | 'DATEADD' | 'DATEDIFF'
  | 'LOOKUP' | 'VLOOKUP' | 'FILTER'
  | 'ROLLUP' | 'LINK_TO_RECORD';

// --- AUTOMATION TYPES ---

export type AutomationTriggerType = 
  | 'ROW_CREATED' 
  | 'ROW_UPDATED' 
  | 'ROW_DELETED'
  | 'STATUS_CHANGED' 
  | 'DATE_ARRIVED'
  | 'SCHEDULED'
  | 'WEBHOOK_RECEIVED';

export type AutomationActionType = 
  | 'SEND_EMAIL' 
  | 'CREATE_ROW' 
  | 'UPDATE_ROW' 
  | 'DELETE_ROW'
  | 'NOTIFY_USER'
  | 'AI_GENERATE'
  | 'CALL_WEBHOOK';

export interface AutomationCondition {
  column: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

export interface AutomationAction {
  type: AutomationActionType;
  targetColumn?: string;
  payload: any; // e.g. { to: '...', subject: '...' } or { updates: { status: 'Done' } }
}

export interface AutomationTrigger {
  type: AutomationTriggerType;
  columnKey?: string;
  fromValue?: string;
  toValue?: string;
  cron?: string; // For SCHEDULED
}

export interface Automation {
    id: string;
    name: string;
    active: boolean;
    tableId: string;
    trigger: AutomationTrigger;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    runCount: number;
    lastRun?: Date;
}

// --- COLLABORATION TYPES ---

export interface Comment {
    id: string;
    tableId: string;
    rowId: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: string;
    mentions?: string[];
    replies?: Comment[];
    reactions?: Record<string, string[]>; // emoji -> userIds
}

export interface UserCursor {
    userId: string;
    userName: string;
    color: string;
    tableId: string;
    // We track Row ID, not index, because index changes with sort/filter
    focusedRowId?: string; 
    focusedColKey?: string;
    isEditing?: boolean; // Is the user currently typing/locking this cell?
    lastActive: number;
}

// --- HISTORY & UNDO/REDO ---

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  userId: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  tableId: string;
  rowId?: string;
  before: any;
  after: any;
}

// --- EXTERNAL SYNC & VIEWS ---

export interface SyncConfig {
    enabled: boolean;
    sourceUrl?: string;
    syncInterval?: number; // in minutes
    lastSync?: string;
}

export type ViewMode = 'grid' | 'board' | 'gallery' | 'calendar' | 'gantt' | 'table';

// --- AI & FILES ---

export interface AIAnalysisResult {
    tags: string[];
    description: string;
    detectedObjects?: string[];
    safetyStatus?: 'safe' | 'unsafe';
}

export interface FileMetadata {
    url: string;
    name: string;
    type: string;
    aiTags?: string[]; // Computer vision tags
    aiDescription?: string;
    analysisStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

// --- ASSET MANAGEMENT (Old Flat Structure) ---
export interface FileAsset {
    id: string; // Row ID + Col Key
    url: string;
    name: string; // Column Name or inferred
    sourceTableId: string;
    sourceTableName: string;
    rowId: string;
    columnKey: string; // The column where this file lives
    createdAt?: string;
    aiTags?: string[];
}

// --- FILE SYSTEM (Drive 2.0) ---

export type FileNodeType = 'folder' | 'file';

export interface FileShareConfig {
    isPublic: boolean;
    publicLink?: string;
    expiresAt?: string;
    password?: string;
    accessLevel: 'view' | 'edit';
    sharedWithUserIds: string[]; // Internal users
}

export interface FileActivity {
    id: string;
    userId: string; // Who did it
    userName: string;
    action: 'upload' | 'view' | 'edit' | 'share' | 'delete' | 'unzip' | 'move';
    timestamp: string;
    details?: string;
}

export interface FileNode {
    id: string;
    parentId: string | null; // null means Root
    name: string;
    type: FileNodeType;
    size: number; // in bytes
    mimeType?: string; // e.g. 'image/png', 'application/pdf', 'application/zip'
    url?: string; // For files
    content?: string; // For simulatable text/csv files
    
    // Metadata
    ownerId: string;
    createdAt: string;
    updatedAt: string;
    
    // Security & Sharing
    shareConfig: FileShareConfig;
    activityLog: FileActivity[];
    
    isSystemAsset?: boolean; // If true, it comes from the DB tables, not user upload
    systemAssetRef?: FileAsset;
    
    isDeleted?: boolean; // Soft delete for trash
}


export interface GridFocus {
    rowIndex: number;
    colKey: string;
    rowId: string; // Added rowId for robust tracking
}

// --- TIMELINE / GANTT TYPES ---

export interface TimelineTask {
    id: string;
    resourceId: string;
    label: string;
    startDate: Date;
    endDate: Date;
    progress: number;
    color?: string;
    dependencies?: string[]; // ID of other tasks
}

export interface TimelineZoomLevel {
    id: string;
    name: string;
    pixelsPerDay: number;
    headerUnit: 'day' | 'week' | 'month';
}

// --- USER & PERMISSIONS ---

export interface Role {
    id: string;
    name: string;
    color: string; // Hex or Tailwind class ref
    description?: string;
    isSystem?: boolean; // Admin role cannot be deleted
}

export interface PermissionRule {
    view: boolean;   // Read
    create: boolean; // Create
    edit: boolean;   // Update
    delete: boolean; // Delete
}

// Column Level Permissions: RoleID -> { view: bool, edit: bool }
export interface ColumnPermission {
    view: boolean;
    edit: boolean;
}

// Map: RoleID -> TableID -> Rules
export type PermissionMatrix = Record<string, Record<string, PermissionRule>>;

// Map: TableID -> ColumnKey -> RoleID -> ColumnPermission
export type ColumnPermissionMatrix = Record<string, Record<string, Record<string, ColumnPermission>>>;


export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string; // Link to Role.id
  avatarUrl?: string;
  status: 'active' | 'inactive';
}

export interface ProjectData {
  id: string;
  name: string;
  client: string;
  status: 'Planeerimisel' | 'Töös' | 'Lõpetatud' | 'Peatatud';
  manager: string;
  hoursUsed: number;
  hoursTotal: number;
  budget: number;
  startDate: string;
  deadline: string;
}

export interface ChartData {
  name: string;
  hours: number;
  budget: number;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface ContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    rowId: string | null;
}