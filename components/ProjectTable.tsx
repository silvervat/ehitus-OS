import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GENERATE_LARGE_DATASET } from '../constants';
import { ProjectData, SortConfig, SortDirection } from '../types';
import { Search, Filter, Download, MoreHorizontal, Sparkles, Bot, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { analyzeProjectData } from '../services/geminiService';

// Virtualization constants
const ROW_HEIGHT = 45; 
const OVERSCAN = 10; // Number of rows to render outside viewport to prevent flickering

export const ProjectTable: React.FC = () => {
  // 1. Load massive dataset once
  const fullData = useMemo(() => GENERATE_LARGE_DATASET(), []);
  
  // 2. State for Filters & Sort
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  
  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  // Refs for virtualization
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Measure container height on mount/resize
  useEffect(() => {
    if (scrollContainerRef.current) {
        setContainerHeight(scrollContainerRef.current.clientHeight);
    }
    const observer = new ResizeObserver(entries => {
        if(entries[0]) setContainerHeight(entries[0].contentRect.height);
    });
    if(scrollContainerRef.current) observer.observe(scrollContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // 3. Optimized Data Processing (Filter -> Sort)
  const processedData = useMemo(() => {
    let result = fullData;

    // Apply Filters
    if (Object.keys(filters).length > 0) {
        result = result.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                const itemValue = String(item[key as keyof ProjectData]).toLowerCase();
                return itemValue.includes((value as string).toLowerCase());
            });
        });
    }

    // Apply Sorting
    if (sortConfig) {
        result = [...result].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return result;
  }, [fullData, filters, sortConfig]);

  // 4. Virtualization Math
  const totalHeight = processedData.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(processedData.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN);
  
  const visibleData = processedData.slice(startIndex, endIndex);
  const paddingTop = startIndex * ROW_HEIGHT;
  const paddingBottom = (processedData.length - endIndex) * ROW_HEIGHT;

  // Handlers
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
  };

  const handleSort = (key: keyof ProjectData) => {
      let direction: SortDirection = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const handleFilterChange = (key: keyof ProjectData, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleAIAnalysis = async () => {
      setIsAnalyzing(true);
      // Only send top 50 filtered results to AI to verify context
      const result = await analyzeProjectData(processedData.slice(0, 50), "Analüüsi filtreeritud projekte. Mis on peamised murekohad?");
      setAiInsight(result);
      setIsAnalyzing(false);
  };

  // Helper Components
  const SortIcon = ({ columnKey }: { columnKey: keyof ProjectData }) => {
      if (sortConfig?.key !== columnKey) return <ArrowUpDown size={12} className="opacity-20" />;
      return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-teal-600" /> : <ChevronDown size={14} className="text-teal-600" />;
  };

  const StatusBadge = ({ status }: { status: string }) => {
      const colors: Record<string, string> = {
          'Töös': 'bg-green-100 text-green-800 border-green-200',
          'Planeerimisel': 'bg-blue-100 text-blue-800 border-blue-200',
          'Peatatud': 'bg-red-100 text-red-800 border-red-200',
          'Lõpetatud': 'bg-slate-100 text-slate-800 border-slate-200',
      };
      return (
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${colors[status] || 'bg-gray-100'}`}>
              {status}
          </span>
      );
  };

  const ProgressCell = ({ used, total }: { used: number, total: number }) => {
      const pct = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;
      let color = 'bg-teal-500';
      if (pct > 90) color = 'bg-red-500';
      else if (pct > 75) color = 'bg-yellow-500';

      return (
          <div className="w-32">
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span className="font-mono">{used.toFixed(0)}h</span>
                  <span className="font-mono">{pct.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full ${color}`} style={{ width: `${pct}%` }}></div>
              </div>
          </div>
      )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Top Toolbar */}
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm z-20">
        <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Filter size={18} className="text-teal-600" />
                Andmebaas: Ehitustööpäevikud
            </h2>
            <p className="text-xs text-slate-500 mt-1">
                Kuvatakse {processedData.length.toLocaleString()} kirjet ({fullData.length.toLocaleString()} kokku)
                <span className="mx-2 text-slate-300">|</span>
                Virtualiseeritud vaade
            </p>
        </div>

        <div className="flex gap-3">
             <button 
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md text-sm hover:shadow-lg transition-all disabled:opacity-70"
            >
                {isAnalyzing ? <Sparkles className="animate-spin" size={16} /> : <Bot size={16} />}
                <span>{isAnalyzing ? 'Analüüsin...' : 'AI Analüüs'}</span>
            </button>
            <button className="p-2 border border-slate-300 rounded-md hover:bg-slate-50 text-slate-600" title="Ekspordi CSV">
                <Download size={18} />
            </button>
        </div>
      </div>

      {/* AI Insight Panel */}
      {aiInsight && (
          <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100">
              <div className="flex gap-3">
                  <div className="bg-indigo-100 p-2 rounded-full h-fit text-indigo-600">
                      <Sparkles size={16} />
                  </div>
                  <div className="flex-1">
                      <h4 className="text-sm font-bold text-indigo-900 mb-1">AI Analüütiku Raport (Filtreeritud vaade)</h4>
                      <p className="text-sm text-indigo-800 whitespace-pre-line leading-relaxed">{aiInsight}</p>
                  </div>
                  <button onClick={() => setAiInsight(null)} className="ml-auto text-indigo-400 hover:text-indigo-600 h-fit p-1">✕</button>
              </div>
          </div>
      )}

      {/* Data Grid Header (Fixed) */}
      <div className="border-b border-slate-200 bg-slate-50 overflow-hidden pr-[8px]"> {/* pr-8 accounts for scrollbar */}
          <div className="flex text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {[
                { label: 'ID', key: 'id', width: 'w-24' },
                { label: 'Projekt', key: 'name', width: 'flex-1 min-w-[200px]' },
                { label: 'Klient', key: 'client', width: 'w-40' },
                { label: 'Staatus', key: 'status', width: 'w-32' },
                { label: 'Projektijuht', key: 'manager', width: 'w-40' },
                { label: 'Töötunnid', key: 'hoursUsed', width: 'w-40' },
                { label: 'Tähtaeg', key: 'deadline', width: 'w-32' },
              ].map((col) => (
                  <div key={col.key} className={`${col.width} p-3 border-r border-slate-100 last:border-0 flex flex-col gap-2`}>
                      {/* Sort Header */}
                      <div 
                        className="flex items-center justify-between cursor-pointer hover:text-teal-600 transition-colors select-none"
                        onClick={() => handleSort(col.key as keyof ProjectData)}
                      >
                          <span>{col.label}</span>
                          <SortIcon columnKey={col.key as keyof ProjectData} />
                      </div>
                      {/* Filter Input */}
                      {col.key !== 'hoursUsed' && (
                          <input 
                            type="text" 
                            placeholder="Filtreeri..." 
                            value={filters[col.key] || ''}
                            onChange={(e) => handleFilterChange(col.key as keyof ProjectData, e.target.value)}
                            className="w-full text-[11px] px-2 py-1 bg-white border border-slate-200 rounded focus:border-teal-500 focus:outline-none placeholder-slate-300 font-normal normal-case"
                          />
                      )}
                  </div>
              ))}
              <div className="w-12 p-3"></div> {/* Actions Column */}
          </div>
      </div>

      {/* Virtualized Body */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                transform: `translateY(${paddingTop}px)` 
            }}>
                {visibleData.map((project) => (
                    <div 
                        key={project.id} 
                        className="flex items-center border-b border-slate-100 hover:bg-blue-50 transition-colors group bg-white"
                        style={{ height: ROW_HEIGHT }}
                    >
                        <div className="w-24 px-3 text-xs text-slate-500 font-mono truncate">{project.id}</div>
                        
                        <div className="flex-1 min-w-[200px] px-3 text-sm font-medium text-slate-700 truncate flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                             {project.name}
                        </div>
                        
                        <div className="w-40 px-3 text-xs text-slate-600 truncate">{project.client}</div>
                        
                        <div className="w-32 px-3">
                            <StatusBadge status={project.status} />
                        </div>
                        
                        <div className="w-40 px-3 text-xs text-slate-600 truncate flex items-center gap-2">
                            <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                                {project.manager.charAt(0)}
                            </div>
                            {project.manager}
                        </div>
                        
                        <div className="w-40 px-3">
                            <ProgressCell used={project.hoursUsed} total={project.hoursTotal} />
                        </div>
                        
                        <div className="w-32 px-3 text-xs text-slate-500 font-mono">{project.deadline}</div>
                        
                        <div className="w-12 px-3 flex justify-center">
                             <button className="text-slate-300 hover:text-slate-600">
                                <MoreHorizontal size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        
        {processedData.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <Search size={32} className="mb-2 opacity-50" />
                <p>Andmed puuduvad valitud filtritega</p>
                <button 
                    onClick={() => setFilters({})}
                    className="mt-2 text-sm text-teal-600 hover:underline"
                >
                    Puhasta filtrid
                </button>
            </div>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 text-[10px] text-slate-400 flex justify-between">
          <span>RIVEST ENTERPRISE OS v2.0</span>
          <span>MEMORY USAGE: OPTIMIZED</span>
      </div>
    </div>
  );
};