
import React, { useState, useMemo, useRef, useEffect, useTransition } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  createColumnHelper,
  flexRender,
  SortingState,
  ColumnFiltersState
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
    getMockProject, 
    getProjectName, 
    getProjectStatus, 
    getProjectManager, 
    getProjectClient,
    getProjectHours
} from '../constants';
import { ProjectData } from '../types';
import { Download, Sparkles, Bot, ArrowUpDown, MoreHorizontal, Database, Search, Loader2, Filter } from 'lucide-react';
import { analyzeProjectData } from '../services/geminiService';

const ROW_HEIGHT = 45;
const TOTAL_ROWS = 2000000; // 2 Million rows virtualized

export const ProjectTable: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  
  // --- VIRTUAL SORT & FILTER STATE ---
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  
  // This array maps: Virtual Index -> Real Data Index
  // Instead of shuffling 2M objects, we shuffle 2M integers (only ~16MB memory)
  const [virtualMap, setVirtualMap] = useState<number[]>([]); 
  const [isProcessing, setIsProcessing] = useState(true);
  const [filteredCount, setFilteredCount] = useState(TOTAL_ROWS);
  
  const [isPending, startTransition] = useTransition();

  // Initialization
  useEffect(() => {
      // Initial map: [0, 1, 2, ... 2000000]
      const initMap = new Int32Array(TOTAL_ROWS);
      for(let i=0; i<TOTAL_ROWS; i++) initMap[i] = i;
      setVirtualMap(Array.from(initMap)); // Convert to normal array for React state compatibility or keep Int32Array if optimized further
      setIsProcessing(false);
  }, []);

  // --- HEAVY LIFTING ENGINE ---
  useEffect(() => {
      if (virtualMap.length === 0) return;

      const runEngine = async () => {
          setIsProcessing(true);
          
          // Use setTimeout to allow UI to render the spinner before freezing for ~1s
          await new Promise(resolve => setTimeout(resolve, 100));

          // 1. Create Base Array (Reset) if needed, or reuse current if we want cumulative (complex). 
          // For simple demo, we reset to full scan to allow changing filters correctly.
          const baseMap = new Int32Array(TOTAL_ROWS);
          for(let i=0; i<TOTAL_ROWS; i++) baseMap[i] = i;
          let result = Array.from(baseMap);

          // 2. Apply Filters
          if (columnFilters.length > 0) {
              const nameFilter = columnFilters.find(f => f.id === 'name')?.value as string;
              const statusFilter = columnFilters.find(f => f.id === 'status')?.value as string;

              if (nameFilter || statusFilter) {
                  result = result.filter(realIndex => {
                      let match = true;
                      if (nameFilter) {
                          match = match && getProjectName(realIndex).toLowerCase().includes(nameFilter.toLowerCase());
                      }
                      if (statusFilter) {
                          match = match && getProjectStatus(realIndex).toLowerCase().includes(statusFilter.toLowerCase());
                      }
                      return match;
                  });
              }
          }

          // 3. Apply Sorting
          if (sorting.length > 0) {
              const sort = sorting[0];
              const key = sort.id;
              const dir = sort.desc ? -1 : 1;

              // Optimized Switch for Granular Getters
              // We compare the values derived from the Real Index
              if (key === 'name') {
                  result.sort((a, b) => getProjectName(a).localeCompare(getProjectName(b)) * dir);
              } else if (key === 'status') {
                  result.sort((a, b) => getProjectStatus(a).localeCompare(getProjectStatus(b)) * dir);
              } else if (key === 'manager') {
                  result.sort((a, b) => getProjectManager(a).localeCompare(getProjectManager(b)) * dir);
              } else if (key === 'client') {
                  result.sort((a, b) => getProjectClient(a).localeCompare(getProjectClient(b)) * dir);
              } else if (key === 'hoursUsed') {
                  result.sort((a, b) => (getProjectHours(a) - getProjectHours(b)) * dir);
              }
          }

          setVirtualMap(result);
          setFilteredCount(result.length);
          setIsProcessing(false);
      };

      runEngine();
  }, [sorting, columnFilters]); // Trigger when these change

  // Column Helper
  const columnHelper = createColumnHelper<ProjectData>();
  
  const columns = useMemo(() => [
    columnHelper.accessor('id', { header: 'ID', size: 100 }),
    columnHelper.accessor('name', { header: 'Projekt', size: 300 }),
    columnHelper.accessor('client', { header: 'Klient', size: 150 }),
    columnHelper.accessor('status', { header: 'Staatus', size: 130 }),
    columnHelper.accessor('manager', { header: 'Projektijuht', size: 160 }),
    columnHelper.accessor('hoursUsed', { header: 'Töötunnid', size: 160 }),
    columnHelper.accessor('deadline', { header: 'Tähtaeg', size: 130 }),
  ], []);

  const table = useReactTable({
    data: [], 
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    rowCount: filteredCount, 
  });

  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: filteredCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  // AI Handler
  const handleAIAnalysis = async () => {
      setIsAnalyzing(true);
      const sampleData = Array.from({length: 20}).map((_, i) => getMockProject(virtualMap[i]));
      const result = await analyzeProjectData(sampleData, "Analüüsi praegust filtreeritud vaadet.");
      setAiInsight(result);
      setIsAnalyzing(false);
  };

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* Loading Overlay */}
      {isProcessing && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
              <Loader2 size={48} className="text-teal-600 animate-spin mb-4" />
              <h3 className="text-lg font-bold text-slate-800">Töötlen andmeid...</h3>
              <p className="text-slate-500 text-sm">Sorteerin ja filtreerin {TOTAL_ROWS.toLocaleString()} rida</p>
          </div>
      )}

      {/* Top Toolbar */}
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm z-20">
        <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Database size={18} className="text-teal-600" />
                Andmebaas: Ehitustööpäevikud
            </h2>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span className="font-mono font-bold text-slate-700">{filteredCount.toLocaleString()}</span> / {TOTAL_ROWS.toLocaleString()} rida
                <span className="text-slate-300">|</span>
                <span className="text-teal-600 font-bold bg-teal-50 px-1 rounded flex items-center gap-1">
                    <Sparkles size={10} /> VIRTUAL MAP ENGINE
                </span>
            </p>
        </div>

        <div className="flex gap-3">
             <button 
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md text-sm hover:shadow-lg transition-all disabled:opacity-70"
            >
                {isAnalyzing ? <Sparkles className="animate-spin" size={16} /> : <Bot size={16} />}
                <span>AI Analüüs</span>
            </button>
            <button className="p-2 border border-slate-300 rounded-md hover:bg-slate-50 text-slate-600" title="Ekspordi CSV">
                <Download size={18} />
            </button>
        </div>
      </div>

      {/* AI Insight Panel */}
      {aiInsight && (
          <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 animate-in slide-in-from-top-2">
              <div className="flex gap-3">
                  <div className="bg-indigo-100 p-2 rounded-full h-fit text-indigo-600">
                      <Sparkles size={16} />
                  </div>
                  <div className="flex-1">
                      <h4 className="text-sm font-bold text-indigo-900 mb-1">AI Analüütiku Raport</h4>
                      <p className="text-sm text-indigo-800 whitespace-pre-line leading-relaxed">{aiInsight}</p>
                  </div>
                  <button onClick={() => setAiInsight(null)} className="ml-auto text-indigo-400 hover:text-indigo-600 h-fit p-1">✕</button>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50 overflow-hidden pr-[8px]"> 
          <div className="flex">
              {table.getHeaderGroups().map(headerGroup => (
                  <React.Fragment key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                        <div 
                            key={header.id} 
                            style={{ width: header.getSize() }}
                            className="p-2 border-r border-slate-100 last:border-0 flex flex-col gap-2 flex-shrink-0 group"
                        >
                             <div 
                                className="flex items-center justify-between text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:text-teal-600"
                                onClick={header.column.getToggleSortingHandler()}
                             >
                                 {flexRender(header.column.columnDef.header, header.getContext())}
                                 {{
                                    asc: <ArrowUpDown size={12} className="text-teal-600 rotate-180 transition-transform" />,
                                    desc: <ArrowUpDown size={12} className="text-teal-600" />,
                                 }[header.column.getIsSorted() as string] ?? <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-50" />}
                             </div>
                             
                             {/* Filter Input */}
                             <div className="relative">
                                <input 
                                    className="w-full text-[10px] border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                                    placeholder="Filtreeri..."
                                    value={(header.column.getFilterValue() ?? '') as string}
                                    onChange={e => header.column.setFilterValue(e.target.value)}
                                />
                                <Filter size={8} className="absolute right-2 top-1.5 text-slate-300" />
                             </div>
                        </div>
                    ))}
                  </React.Fragment>
              ))}
              <div className="w-12 p-3"></div>
          </div>
      </div>

      {/* Virtualized Body */}
      <div 
        ref={parentRef}
        className="flex-1 overflow-y-auto custom-scrollbar bg-white"
      >
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                // KEY MAGIC: Get the Real Index from our Virtual Map
                const realIndex = virtualMap[virtualRow.index];
                if (realIndex === undefined) return null;

                const row = getMockProject(realIndex);
                
                return (
                    <div 
                        key={virtualRow.index} 
                        className="absolute top-0 left-0 w-full flex items-center border-b border-slate-100 hover:bg-blue-50 transition-colors group"
                        style={{ height: ROW_HEIGHT, transform: `translateY(${virtualRow.start}px)` }}
                    >
                        {/* Manually render cells matching Header widths */}
                        
                        {/* ID */}
                        <div style={{ width: 100 }} className="px-3 text-xs font-mono text-slate-500 flex-shrink-0 truncate">{row.id}</div>
                        
                        {/* Name */}
                        <div style={{ width: 300 }} className="px-3 text-sm text-slate-700 font-medium flex-shrink-0 flex items-center gap-2 truncate">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0"></div>
                            {row.name}
                        </div>
                        
                        {/* Client */}
                        <div style={{ width: 150 }} className="px-3 text-sm text-slate-600 flex-shrink-0 truncate">{row.client}</div>
                        
                        {/* Status */}
                        <div style={{ width: 130 }} className="px-3 flex-shrink-0">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border 
                                ${row.status === 'Töös' ? 'bg-green-100 text-green-800 border-green-200' : 
                                  row.status === 'Planeerimisel' ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                                  row.status === 'Peatatud' ? 'bg-red-100 text-red-800 border-red-200' : 
                                  'bg-slate-100 text-slate-800 border-slate-200'}`}>
                                {row.status}
                            </span>
                        </div>
                        
                        {/* Manager */}
                        <div style={{ width: 160 }} className="px-3 text-sm text-slate-600 flex-shrink-0 flex items-center gap-2 truncate">
                            <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">
                                {row.manager.charAt(0)}
                            </div>
                            {row.manager}
                        </div>
                        
                        {/* Hours */}
                        <div style={{ width: 160 }} className="px-3 flex-shrink-0">
                             {(() => {
                                const pct = Math.min(100, Math.max(0, (row.hoursUsed / row.hoursTotal) * 100));
                                let color = 'bg-teal-500';
                                if (pct > 90) color = 'bg-red-500';
                                else if (pct > 75) color = 'bg-yellow-500';
                                return (
                                    <div className="w-full pr-4">
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div className={`h-full ${color}`} style={{ width: `${pct}%` }}></div>
                                        </div>
                                    </div>
                                )
                             })()}
                        </div>
                        
                        {/* Deadline */}
                        <div style={{ width: 130 }} className="px-3 text-xs font-mono text-slate-500 flex-shrink-0">{row.deadline}</div>
                        
                        {/* Actions */}
                        <div className="w-12 px-3 flex justify-center flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                             <button className="text-slate-300 hover:text-slate-600">
                                <MoreHorizontal size={16} />
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 text-[10px] text-slate-400 flex justify-between">
          <div className="flex items-center gap-2">
             <Database size={12} />
             <span>Süsteem kasutab indeks-põhist sorteerimist (Int32Array), et vältida mälu ületäitumist.</span>
          </div>
          <span className="font-mono">RENDER: {rowVirtualizer.getVirtualItems().length} ROWS IN DOM</span>
      </div>
    </div>
  );
};
