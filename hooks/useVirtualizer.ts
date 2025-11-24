
import React, { useState, useEffect, useMemo } from 'react';

interface UseVirtualizerProps {
    count: number;
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
}

export const useVirtualizer = ({ count, itemHeight, containerHeight, overscan = 5 }: UseVirtualizerProps) => {
    const [scrollTop, setScrollTop] = useState(0);

    const totalHeight = count * itemHeight;

    // Calculate visible range
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(count, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);

    const virtualItems = useMemo(() => {
        const items = [];
        for (let i = startIndex; i < endIndex; i++) {
            items.push({
                index: i,
                offsetTop: i * itemHeight,
            });
        }
        return items;
    }, [startIndex, endIndex, itemHeight]);

    return {
        virtualItems,
        totalHeight,
        onScroll: (e: React.UIEvent<HTMLDivElement>) => setScrollTop(e.currentTarget.scrollTop),
        scrollTop,
        isScrolling: false // Simplified for this implementation
    };
};
