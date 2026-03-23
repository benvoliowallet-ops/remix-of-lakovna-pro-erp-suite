import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

interface SortableTableHeadProps {
  children: React.ReactNode;
  sortKey: string;
  currentSortKey: string | null;
  currentSortDirection: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableTableHead({
  children,
  sortKey,
  currentSortKey,
  currentSortDirection,
  onSort,
  className,
}: SortableTableHeadProps) {
  const isActive = currentSortKey === sortKey;
  
  return (
    <TableHead
      className={cn(
        'cursor-pointer select-none hover:bg-muted/50 transition-colors',
        isActive && 'bg-muted/30',
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          currentSortDirection === 'asc' ? (
            <ArrowUp className="h-4 w-4 text-primary" />
          ) : (
            <ArrowDown className="h-4 w-4 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 text-muted-foreground opacity-50" />
        )}
      </div>
    </TableHead>
  );
}

/**
 * Hook for managing sort state
 */
export function useSortState<T extends Record<string, unknown>>(
  defaultKey: string | null = null,
  defaultDirection: SortDirection = null
) {
  const [sortKey, setSortKey] = useState<string | null>(defaultKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);
  
  const handleSort = (key: string) => {
    if (sortKey === key) {
      // Toggle direction: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortKey(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };
  
  const sortData = (data: T[]): T[] => {
    if (!sortKey || !sortDirection) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;
      
      // Compare values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue, 'sk')
          : bValue.localeCompare(aValue, 'sk');
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Date comparison
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }
      
      // String date comparison
      const aDate = new Date(String(aValue));
      const bDate = new Date(String(bValue));
      if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
        return sortDirection === 'asc'
          ? aDate.getTime() - bDate.getTime()
          : bDate.getTime() - aDate.getTime();
      }
      
      // Fallback string comparison
      return sortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue), 'sk')
        : String(bValue).localeCompare(String(aValue), 'sk');
    });
  };
  
  return {
    sortKey,
    sortDirection,
    handleSort,
    sortData,
  };
}
