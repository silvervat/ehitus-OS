
import { TimelineZoomLevel } from "../types";

export const ZOOM_LEVELS: TimelineZoomLevel[] = [
    { id: 'compact', name: 'Kompaktne (Kuu)', pixelsPerDay: 20, headerUnit: 'week' },
    { id: 'normal', name: 'Tavaline (Nädal)', pixelsPerDay: 40, headerUnit: 'day' },
    { id: 'wide', name: 'Lai (Päev)', pixelsPerDay: 80, headerUnit: 'day' },
    { id: 'ultra', name: 'Ultra (Detail)', pixelsPerDay: 120, headerUnit: 'day' }
];

class TimelineStore {
    private zoomIndex = 1;
    private listeners: Function[] = [];

    // State
    public startDate: Date = new Date(); // Viewport start
    
    constructor() {
        // Default start date to 1 week ago
        const d = new Date();
        d.setDate(d.getDate() - 7);
        this.startDate = d;
    }

    getZoom(): TimelineZoomLevel {
        return ZOOM_LEVELS[this.zoomIndex];
    }

    zoomIn() {
        if (this.zoomIndex < ZOOM_LEVELS.length - 1) {
            this.zoomIndex++;
            this.notify();
        }
    }

    zoomOut() {
        if (this.zoomIndex > 0) {
            this.zoomIndex--;
            this.notify();
        }
    }

    subscribe(listener: Function) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    private notify() {
        this.listeners.forEach(l => l());
    }
}

export const timelineStore = new TimelineStore();
