
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

export type ColumnType = 'text' | 'number' | 'date' | 'select' | 'reference' | 'currency' | 'status' | 'image' | 'file' | 'tags' | 'progress' | 'long_text';

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
}

// --- TIMELINE / GANTT TYPES ---

export interface TimelineTask {
    id: string;
    resourceId: string; // maps to Row ID usually
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
