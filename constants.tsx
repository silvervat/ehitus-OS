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

// Generate massive dataset for virtualization test
export const GENERATE_LARGE_DATASET = (): ProjectData[] => {
    const data = [...MOCK_PROJECTS];
    // Generating 50,000 rows to simulate "millions" logic (pure JS array limits apply in browser)
    for(let i=0; i<50000; i++) {
        const mgrIndex = Math.floor(Math.random() * MANAGERS.length);
        const clientIndex = Math.floor(Math.random() * CLIENTS.length);
        const statusIndex = Math.floor(Math.random() * STATUSES.length);
        
        data.push({
            id: `GEN-${1000 + i}`,
            name: `Projekt ${i} - ${CLIENTS[clientIndex]} Laiendus`,
            client: CLIENTS[clientIndex],
            status: STATUSES[statusIndex],
            manager: MANAGERS[mgrIndex],
            hoursUsed: Math.floor(Math.random() * 2000),
            hoursTotal: Math.floor(Math.random() * 5000) + 2000,
            budget: Math.floor(Math.random() * 500000),
            startDate: '2024-01-01',
            deadline: '2025-12-31'
        })
    }
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