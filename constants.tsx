
import React from 'react';
import { SidebarItem, ViewType, ProjectData, ChartData } from './types';
import { 
  LayoutDashboard, 
  HardHat, 
  Calendar, 
  FileText, 
  Users, 
  TrendingUp, 
  Settings, 
  Truck, 
  ClipboardCheck,
  Building,
  Database,
  AlertCircle,
  FolderOpen
} from 'lucide-react';

// --- UTILS ---

export const formatDate = (isoString: string | undefined | null): string => {
    if (!isoString) return '-';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString; // Return original if parse fails
        
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2); // Get last 2 digits
        
        return `${day}.${month}.${year}`;
    } catch (e) {
        return isoString || '-';
    }
};

export const MOCK_USERS = [
     { id: 'u1', name: 'Kristofer Nilp', email: 'kristofer@rivest.ee', roleId: 'admin', status: 'active', avatarUrl: 'KN' },
     { id: 'u2', name: 'Elvis Juus', email: 'elvis@rivest.ee', roleId: 'manager', status: 'active', avatarUrl: 'EJ' },
     { id: 'u3', name: 'Kuldar Kosina', email: 'kuldar@rivest.ee', roleId: 'foreman', status: 'active', avatarUrl: 'KK' },
];

export const SIDEBAR_DATA: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Üld Ülesanded',
    icon: <LayoutDashboard size={18} />,
    view: ViewType.DASHBOARD
  },
  {
    id: 'files',
    label: 'Failid & Meedia',
    icon: <FolderOpen size={18} />,
    view: ViewType.FILES
  },
  {
    id: 'montaaz',
    label: 'Igapäevane Montaaž',
    icon: <HardHat size={18} />,
    children: [
      { id: 'paevikud', label: 'Ehitustööpäevikud', icon: <Calendar size={16} />, view: ViewType.PROJECTS },
      { id: 'detail', label: 'Platsi detail planeerimine', icon: <FileText size={16} /> },
      { id: 'jaotus', label: 'Tööülesannete jaotus', icon: <Users size={16} /> },
    ]
  },
  {
    id: 'soidukid',
    label: 'Tehnika & Sõidukid',
    icon: <Truck size={18} />,
    children: [
      { id: 'inspection', label: '1/6 Sõiduki Esiosa', icon: <ClipboardCheck size={16} />, view: ViewType.INSPECTION },
      { id: 'vehicle_list', label: 'Autopark', icon: <Database size={16} /> }
    ]
  },
  {
    id: 'finants',
    label: 'Finants Ülevaated',
    icon: <TrendingUp size={18} />,
    view: ViewType.FINANCE,
    children: [
      { id: 'lepingud', label: 'Lepingulised tööd', icon: <FileText size={16} /> },
      { id: 'lisatood', label: 'Lisatööd', icon: <AlertCircle size={16} /> },
      { id: 'wemply', label: 'Wemply Arhiiv', icon: <Building size={16} /> }
    ]
  },
  {
    id: 'settings',
    label: 'Seaded',
    icon: <Settings size={18} />
  }
];

export const MOCK_PROJECTS: ProjectData[] = [
  { id: 'RM2508', name: 'MG Eskilstuna', client: 'Nordec OY', status: 'Töös', manager: 'Kristofer Nilp', hoursUsed: 746.57, hoursTotal: 1239.95, budget: 45000, startDate: '2024-10-01', deadline: '2025-03-15' },
  { id: 'RM2506', name: 'Arlanda SWE', client: 'Swedavia', status: 'Töös', manager: 'Elvis Juus', hoursUsed: 808.92, hoursTotal: 5916.93, budget: 120000, startDate: '2024-09-15', deadline: '2025-06-30' },
  { id: 'Mai71', name: 'Mai 71 Korterelamu', client: 'Merko', status: 'Peatatud', manager: 'Kuldar Kosina', hoursUsed: 92.23, hoursTotal: 811.27, budget: 25000, startDate: '2024-11-01', deadline: '2025-02-28' },
  { id: 'Vista', name: 'Vista Residentsid', client: 'Fund Ehitus', status: 'Planeerimisel', manager: 'Vahur Juninen', hoursUsed: 50.62, hoursTotal: 880.87, budget: 32000, startDate: '2025-01-10', deadline: '2025-08-20' },
  { id: 'Parnu', name: 'Harmet Pärnu', client: 'Harmet', status: 'Töös', manager: 'Indrek Kurm', hoursUsed: 258.78, hoursTotal: 5668.88, budget: 150000, startDate: '2024-08-01', deadline: '2025-12-01' },
  { id: 'Paide', name: 'Ladu - Paide', client: 'E-Piim', status: 'Lõpetatud', manager: 'Taavi Tamm', hoursUsed: 114.90, hoursTotal: 120.00, budget: 5000, startDate: '2024-10-10', deadline: '2024-10-30' },
  { id: 'Sauga', name: 'Vana-Sauga 2', client: 'Mapri', status: 'Töös', manager: 'Siim Kallas', hoursUsed: 10.25, hoursTotal: 12509.73, budget: 300000, startDate: '2024-11-20', deadline: '2026-01-01' },
];

const MANAGERS = ['Kristofer Nilp', 'Elvis Juus', 'Kuldar Kosina', 'Vahur Juninen', 'Indrek Kurm', 'Siim Kallas', 'Taaniel Lehist'];
const CLIENTS = ['Nordec OY', 'Merko', 'Fund Ehitus', 'Harmet', 'E-Piim', 'Mapri', 'Bonava', 'YIT'];
const STATUSES: ProjectData['status'][] = ['Töös', 'Planeerimisel', 'Peatatud', 'Lõpetatud'];

// --- GRANULAR GETTERS FOR HIGH PERF SORTING (Avoiding Object Creation) ---

export const getProjectStatus = (i: number): string => {
    if (i < MOCK_PROJECTS.length) return MOCK_PROJECTS[i].status;
    return STATUSES[i % STATUSES.length];
};

export const getProjectName = (i: number): string => {
    if (i < MOCK_PROJECTS.length) return MOCK_PROJECTS[i].name;
    const clientIndex = i % CLIENTS.length;
    return `Projekt #${i} - ${CLIENTS[clientIndex]} Laiendus`;
};

export const getProjectManager = (i: number): string => {
    if (i < MOCK_PROJECTS.length) return MOCK_PROJECTS[i].manager;
    return MANAGERS[i % MANAGERS.length];
};

export const getProjectClient = (i: number): string => {
    if (i < MOCK_PROJECTS.length) return MOCK_PROJECTS[i].client;
    return CLIENTS[i % CLIENTS.length];
};

export const getProjectHours = (i: number): number => {
    if (i < MOCK_PROJECTS.length) return MOCK_PROJECTS[i].hoursUsed;
    return (i * 13) % 2000;
};

// DETERMINISTIC ON-DEMAND GENERATOR (No memory overhead)
export const getMockProject = (index: number): ProjectData => {
    // Return existing mock if within range
    if (index < MOCK_PROJECTS.length) {
        return MOCK_PROJECTS[index];
    }
    
    // Generate Deterministically using the same logic as granular getters
    const i = index;
    
    return {
        id: `GEN-${i}`,
        name: getProjectName(i),
        client: getProjectClient(i),
        status: getProjectStatus(i) as any,
        manager: getProjectManager(i),
        hoursUsed: getProjectHours(i),
        hoursTotal: ((i * 17) % 5000) + 2000,
        budget: ((i * 23) % 500000) + 10000,
        startDate: '2024-01-01',
        deadline: '2025-12-31'
    };
};

// Replaces GENERATE_LARGE_DATASET which caused memory crashes
export const GENERATE_LARGE_DATASET = (count: number = 50): ProjectData[] => {
    // Only used for small initial states now
    const data = [];
    for(let i=0; i<count; i++) data.push(getMockProject(i));
    return data;
}

export const CHART_DATA: ChartData[] = [
  { name: 'Nov 2024', hours: 1200, budget: 1500 },
  { name: 'Dets 2024', hours: 1900, budget: 2000 },
  { name: 'Jan 2025', hours: 1600, budget: 1800 },
  { name: 'Veb 2025', hours: 2100, budget: 2200 },
  { name: 'Märts 2025', hours: 2400, budget: 2400 },
  { name: 'Apr 2025', hours: 1800, budget: 2000 },
];
