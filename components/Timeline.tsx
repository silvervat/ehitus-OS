
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TableDefinition, TimelineTask } from '../types';
import { timelineStore } from '../services/timelineStore';
import { schemaStore } from '../services/schemaStore';
import { ChevronRight, ChevronLeft, ZoomIn, ZoomOut, Calendar, GripVertical } from 'lucide-react';

interface TimelineProps {
    data: TableDefinition;
    startDateKey?: string;
    endDateKey?: string;
    labelKey?: string;
}

const SIDEBAR_WIDTH = 260;
const HEADER_HEIGHT = 50;
const ROW_HEIGHT = 42;

interface DragState {
    taskId: string;
    mode: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    originalStart: Date;
    originalEnd: Date;
    currentStart: Date; // For live preview
    currentEnd: Date;   // For live preview
}

export const Timeline: React.FC<TimelineProps> = ({ data, startDateKey = 'start_date', endDateKey = 'end_date', labelKey = 'name' }) => {
    // State
    const [zoom, setZoom] = useState(timelineStore.getZoom());
    const [viewStartDate, setViewStartDate] = useState(new Date()); // Local view cursor
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [dragState, setDragState] = useState<DragState | null>(null);

    // Refs
    const gridRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Sync Store
    useEffect(() => {
        const unsub = timelineStore.subscribe(() => setZoom(timelineStore.getZoom()));
        // Set initial view date to slightly before today
        const d = new Date();
        d.setDate(d.getDate() - 7);
        setViewStartDate(d);
        return unsub;
    }, []);

    // Transform Data to Tasks
    const tasks: TimelineTask[] = useMemo(() => {
        return data.rows.map(row => {
            // Try to find dates
            let start = row[startDateKey] ? new Date(row[startDateKey]) : new Date();
            let end = row[endDateKey] ? new Date(row[endDateKey]) : new Date();
            
            // Fallback if invalid date
            if (isNaN(start.getTime())) start = new Date();
            if (isNaN(end.getTime())) {
                end = new Date(start);
                end.setDate(end.getDate() + 5); // Default 5 days
            }

            // Determine status color
            let color = 'bg-blue-500';
            if (row.status === 'Lõpetatud') color = 'bg-green-500';
            if (row.status === 'Planeerimisel') color = 'bg-yellow-500';
            if (row.status === 'Peatatud') color = 'bg-red-500';

            return {
                id: row.id,
                resourceId: row.id,
                label: row[labelKey] || 'Nimetu',
                startDate: start,
                endDate: end,
                progress: row.progress || 0,
                color
            };
        }).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    }, [data, startDateKey, endDateKey, labelKey]);

    // Grid Generation Logic
    const daysToRender = 90; // Render window increased
    const totalGridWidth = daysToRender * zoom.pixelsPerDay;

    // Generate Calendar Dates
    const calendarDates = useMemo(() => {
        const dates = [];
        const cursor = new Date(viewStartDate);
        
        for(let i = 0; i < daysToRender; i++) {
            dates.push(new Date(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }
        return dates;
    }, [viewStartDate, zoom, daysToRender]);

    // Handlers
    const handleGridScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const left = e.currentTarget.scrollLeft;
        const top = e.currentTarget.scrollTop;
        setScrollLeft(left);
        setScrollTop(top);
        
        // Sync Sidebar
        if (sidebarRef.current) {
            sidebarRef.current.scrollTop = top;
        }
    };

    const shiftTime = (days: number) => {
        const newDate = new Date(viewStartDate);
        newDate.setDate(newDate.getDate() + days);
        setViewStartDate(newDate);
    };

    // --- DRAG & DROP LOGIC ---
    const handleMouseDown = (e: React.MouseEvent, task: TimelineTask, mode: 'move' | 'resize-left' | 'resize-right') => {
        e.stopPropagation();
        setDragState({
            taskId: task.id,
            mode,
            startX: e.clientX,
            originalStart: task.startDate,
            originalEnd: task.endDate,
            currentStart: task.startDate,
            currentEnd: task.endDate
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragState) return;

            const deltaPixels = e.clientX - dragState.startX;
            const deltaDays = deltaPixels / zoom.pixelsPerDay;
            const deltaMs = deltaDays * 24 * 60 * 60 * 1000;

            let newStart = new Date(dragState.originalStart.getTime());
            let newEnd = new Date(dragState.originalEnd.getTime());

            if (dragState.mode === 'move') {
                newStart = new Date(dragState.originalStart.getTime() + deltaMs);
                newEnd = new Date(dragState.originalEnd.getTime() + deltaMs);
            } else if (dragState.mode === 'resize-left') {
                newStart = new Date(dragState.originalStart.getTime() + deltaMs);
                // Prevent negative duration
                if (newStart.getTime() >= newEnd.getTime()) newStart = new Date(newEnd.getTime() - 86400000);
            } else if (dragState.mode === 'resize-right') {
                newEnd = new Date(dragState.originalEnd.getTime() + deltaMs);
                if (newEnd.getTime() <= newStart.getTime()) newEnd = new Date(newStart.getTime() + 86400000);
            }

            setDragState({ ...dragState, currentStart: newStart, currentEnd: newEnd });
        };

        const handleMouseUp = () => {
            if (!dragState) return;

            // Commit to Schema Store
            const updates: any = {};
            // Format to YYYY-MM-DD for store
            updates[startDateKey] = dragState.currentStart.toISOString().split('T')[0];
            updates[endDateKey] = dragState.currentEnd.toISOString().split('T')[0];
            
            schemaStore.updateRow(data.id, dragState.taskId, updates);
            
            setDragState(null);
        };

        if (dragState) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, data.id, startDateKey, endDateKey, zoom]);


    const getTaskStyle = (task: TimelineTask) => {
        // If dragging this task, use the live state
        const isDragging = dragState?.taskId === task.id;
        const start = isDragging ? dragState!.currentStart : task.startDate;
        const end = isDragging ? dragState!.currentEnd : task.endDate;

        const startOffset = Math.max(0, (start.getTime() - viewStartDate.getTime()) / (1000 * 60 * 60 * 24));
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        
        const effectiveLeft = Math.max(0, startOffset * zoom.pixelsPerDay);
        const effectiveWidth = Math.max(20, duration * zoom.pixelsPerDay); // Min width to be visible

        return {
            left: effectiveLeft + 'px',
            width: effectiveWidth + 'px',
            opacity: isDragging ? 0.8 : 1,
            zIndex: isDragging ? 50 : 1,
            cursor: isDragging ? 'grabbing' : 'default'
        };
    };

    // Formatters
    const formatDate = (d: Date) => d.getDate().toString();
    const formatMonth = (d: Date) => d.toLocaleString('et-EE', { month: 'short' });

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative select-none">
            {/* Toolbar */}
            <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 rounded p-0.5">
                        <button onClick={() => shiftTime(-7)} className="p-1 hover:bg-white rounded shadow-sm text-slate-600"><ChevronLeft size={16} /></button>
                        <button onClick={() => setViewStartDate(new Date())} className="px-3 py-1 text-xs font-bold text-slate-700 hover:bg-white rounded mx-0.5">Täna</button>
                        <button onClick={() => shiftTime(7)} className="p-1 hover:bg-white rounded shadow-sm text-slate-600"><ChevronRight size={16} /></button>
                    </div>
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Calendar size={14} className="text-teal-600" />
                        {viewStartDate.toLocaleDateString('et-EE', { month: 'long', year: 'numeric' })}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 uppercase font-bold mr-2">Suum: {zoom.name}</span>
                    <button onClick={() => timelineStore.zoomOut()} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomOut size={16} /></button>
                    <button onClick={() => timelineStore.zoomIn()} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomIn size={16} /></button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Sidebar (Task List) */}
                <div 
                    style={{ width: SIDEBAR_WIDTH }} 
                    className="flex-shrink-0 bg-white border-r border-slate-200 flex flex-col z-20 shadow-lg"
                >
                    <div style={{ height: HEADER_HEIGHT }} className="border-b border-slate-200 bg-slate-50 px-4 flex items-center font-bold text-xs text-slate-500 uppercase tracking-wider">
                        Ülesanne / Projekt
                    </div>
                    <div ref={sidebarRef} className="flex-1 overflow-hidden bg-white">
                         <div style={{ paddingTop: 0 }}>
                             {tasks.map((task, i) => (
                                 <div 
                                    key={task.id} 
                                    style={{ height: ROW_HEIGHT }} 
                                    className="border-b border-slate-100 flex items-center px-4 hover:bg-slate-50 group transition-colors"
                                 >
                                     <GripVertical size={12} className="text-slate-300 mr-2 opacity-0 group-hover:opacity-100 cursor-grab" />
                                     <div className="truncate text-sm text-slate-700 font-medium">{task.label}</div>
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>

                {/* Main Timeline Grid */}
                <div 
                    ref={gridRef}
                    className="flex-1 overflow-auto bg-slate-50 custom-scrollbar relative"
                    onScroll={handleGridScroll}
                >
                     {/* Calendar Header (Sticky) */}
                     <div 
                        style={{ height: HEADER_HEIGHT, minWidth: totalGridWidth }} 
                        className="sticky top-0 bg-white z-10 shadow-sm flex flex-col border-b border-slate-200"
                    >
                         {/* Month Row */}
                         <div className="h-1/2 flex border-b border-slate-100">
                             {calendarDates.map((date, i) => {
                                 // Render month label only on 1st or first visible
                                 const isFirst = date.getDate() === 1 || i === 0;
                                 if (isFirst) {
                                     return (
                                         <div key={i} className="px-2 py-1 text-xs font-bold text-slate-600 border-r border-slate-100 bg-slate-50" style={{ width: zoom.pixelsPerDay * (30 - date.getDate()) /* approx */ }}>
                                             {formatMonth(date)} {date.getFullYear()}
                                         </div>
                                     )
                                 }
                                 return <div key={i} style={{ width: zoom.pixelsPerDay }}></div>
                             })}
                         </div>
                         {/* Day Row */}
                         <div className="h-1/2 flex">
                            {calendarDates.map((date, i) => {
                                 const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                 return (
                                     <div 
                                        key={i} 
                                        style={{ width: zoom.pixelsPerDay }} 
                                        className={`flex flex-col items-center justify-center border-r border-slate-100 text-[10px] ${isWeekend ? 'bg-slate-50 text-red-300' : 'text-slate-500'}`}
                                     >
                                         <span className="font-bold">{formatDate(date)}</span>
                                     </div>
                                 )
                             })}
                         </div>
                     </div>

                     {/* Grid Body */}
                     <div style={{ minWidth: totalGridWidth, height: tasks.length * ROW_HEIGHT, position: 'relative' }}>
                         {/* Background Columns */}
                         <div className="absolute inset-0 flex pointer-events-none">
                            {calendarDates.map((date, i) => {
                                 const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                 return (
                                     <div 
                                        key={i} 
                                        style={{ width: zoom.pixelsPerDay }} 
                                        className={`border-r border-slate-100 h-full ${isWeekend ? 'bg-slate-50/50' : ''}`}
                                     />
                                 )
                             })}
                         </div>

                         {/* Task Bars */}
                         {tasks.map((task, i) => {
                             const style = getTaskStyle(task);
                             return (
                                 <div 
                                    key={task.id} 
                                    className="absolute w-full border-b border-slate-100/50 flex items-center group"
                                    style={{ height: ROW_HEIGHT, top: i * ROW_HEIGHT }}
                                 >
                                     {/* The Bar */}
                                     <div 
                                        className={`absolute h-6 rounded-md shadow-sm border border-white/20 text-white text-[10px] flex items-center px-2 cursor-pointer hover:brightness-110 transition-all ${task.color}`}
                                        style={{ ...style }}
                                        title={`${task.label}: ${task.startDate.toLocaleDateString()} - ${task.endDate.toLocaleDateString()}`}
                                        onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                                     >
                                         <span className="truncate font-medium drop-shadow-md select-none">{task.label}</span>
                                         
                                         {/* Drag Handles */}
                                         <div 
                                            className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-black/20"
                                            onMouseDown={(e) => handleMouseDown(e, task, 'resize-left')}
                                         ></div>
                                         <div 
                                            className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-black/20"
                                            onMouseDown={(e) => handleMouseDown(e, task, 'resize-right')}
                                         ></div>
                                     </div>
                                 </div>
                             )
                         })}
                         
                         {/* Today Line */}
                         {(() => {
                             const today = new Date();
                             const diff = (today.getTime() - viewStartDate.getTime()) / (1000 * 60 * 60 * 24);
                             if (diff >= 0 && diff < daysToRender) {
                                 return (
                                     <div 
                                        className="absolute top-0 bottom-0 border-l-2 border-red-500 z-10 pointer-events-none"
                                        style={{ left: diff * zoom.pixelsPerDay }}
                                     >
                                         <div className="bg-red-500 text-white text-[9px] px-1 py-0.5 rounded-b absolute -top-0 -left-6 font-bold">TÄNA</div>
                                     </div>
                                 )
                             }
                             return null;
                         })()}
                     </div>
                </div>
            </div>
        </div>
    );
};
