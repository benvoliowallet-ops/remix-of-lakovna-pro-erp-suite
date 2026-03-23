import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Plus, Search, Filter, LayoutGrid, List, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/types';
import { OrderKanbanBoard } from '@/components/orders/OrderKanbanBoard';
import { PaymentKanbanBoard } from '@/components/orders/PaymentKanbanBoard';
import { SortableTableHead, useSortState } from '@/components/ui/sortable-table-head';
import { getDeadlineStatus } from '@/lib/working-days';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/types';

type ViewMode = 'kanban' | 'table' | 'payment';

export default function Orders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  
  // Initialize state from URL params
  const initialView = (searchParams.get('view') as ViewMode) || 'kanban';
  const initialStatus = searchParams.get('status') || 'all';
  
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus === 'active' ? 'all' : initialStatus);
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [showOnlyActive, setShowOnlyActive] = useState(initialStatus === 'active');

  const { sortKey, sortDirection, handleSort } = useSortState<Record<string, unknown>>();

  // Update URL when view changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (viewMode !== 'kanban') params.set('view', viewMode);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (showOnlyActive) params.set('status', 'active');
    setSearchParams(params, { replace: true });
  }, [viewMode, statusFilter, showOnlyActive, setSearchParams]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', statusFilter, showOnlyActive],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*, customer:customers(name), company:companies(name)')
        .order('created_at', { ascending: false });

      if (showOnlyActive) {
        query = query.in('status', ['prijate', 'vo_vyrobe']);
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'prijate' | 'vo_vyrobe' | 'ukoncene' | 'odovzdane');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as (Order & { customer: { name: string } | null; company: { name: string } | null })[];
    },
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    let result = orders.filter(order =>
      order.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      order.company?.name?.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toString().includes(search)
    );

    // Apply sorting
    if (sortKey && sortDirection) {
      result = [...result].sort((a, b) => {
        let aValue: string | number | null = null;
        let bValue: string | number | null = null;

        switch (sortKey) {
          case 'id':
            aValue = a.id;
            bValue = b.id;
            break;
          case 'customerName':
            aValue = a.customer?.name || '';
            bValue = b.customer?.name || '';
            break;
          case 'companyName':
            aValue = a.company?.name || '';
            bValue = b.company?.name || '';
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          case 'payment_method':
            aValue = a.payment_method || '';
            bValue = b.payment_method || '';
            break;
          case 'created_at':
            aValue = a.created_at || '';
            bValue = b.created_at || '';
            break;
          case 'deadline_at':
            aValue = a.deadline_at || '';
            bValue = b.deadline_at || '';
            break;
        }

        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
        if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

        const comparison = String(aValue).localeCompare(String(bValue), 'sk');
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [orders, search, sortKey, sortDirection]);

  const handleViewChange = (value: string | undefined) => {
    if (value) {
      setViewMode(value as ViewMode);
      // Reset filters when switching views
      if (value === 'payment') {
        setStatusFilter('all');
        setShowOnlyActive(false);
      }
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Zákazky</h1>
            <p className="text-muted-foreground">Správa všetkých zákaziek</p>
          </div>
          <Button onClick={() => navigate('/zakazky/nova')} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="mr-2 h-4 w-4" />
            Nová zákazka
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hľadať podľa ID, zákazníka alebo firmy..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {viewMode === 'table' && (
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setShowOnlyActive(false);
              }}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Stav" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všetky stavy</SelectItem>
                  {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={handleViewChange}
              className="border rounded-md"
            >
              <ToggleGroupItem value="kanban" aria-label="Kanban zobrazenie" className="px-3">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Tabuľkové zobrazenie" className="px-3">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              {isAdmin && (
                <ToggleGroupItem value="payment" aria-label="Účtovné zobrazenie" className="px-3">
                  <CreditCard className="h-4 w-4" />
                </ToggleGroupItem>
              )}
            </ToggleGroup>
          </CardContent>
        </Card>

        {/* Active filter indicator */}
        {showOnlyActive && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              Aktívne zákazky (Prijaté + Vo výrobe)
              <button 
                onClick={() => setShowOnlyActive(false)}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          </div>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <OrderKanbanBoard 
            orders={filteredOrders || []} 
            isLoading={isLoading} 
            canDragDrop={isAdmin}
          />
        )}

        {/* Payment Kanban View */}
        {viewMode === 'payment' && isAdmin && (
          <PaymentKanbanBoard 
            orders={filteredOrders || []} 
            isLoading={isLoading}
          />
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <Card>
            <CardHeader>
              <CardTitle>Zoznam zákaziek</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      sortKey="id"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      ID
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="customerName"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      Zákazník
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="companyName"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      Firma
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="status"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      Stav
                    </SortableTableHead>
                    {isAdmin && (
                      <SortableTableHead
                        sortKey="payment_method"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={handleSort}
                      >
                        Platba
                      </SortableTableHead>
                    )}
                    <SortableTableHead
                      sortKey="created_at"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      Vytvorené
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="deadline_at"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      Termín
                    </SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.map((order) => {
                    const isActive = order.status === 'prijate' || order.status === 'vo_vyrobe';
                    const deadlineStatus = isActive ? getDeadlineStatus(order.deadline_at) : 'ok';
                    
                    return (
                      <TableRow
                        key={order.id}
                        className={cn(
                          'cursor-pointer hover:bg-muted/50',
                          deadlineStatus === 'overdue' && 'bg-destructive/5',
                          deadlineStatus === 'critical' && 'bg-destructive/5',
                          deadlineStatus === 'soon' && 'bg-warning/5'
                        )}
                        onClick={() => navigate(`/zakazky/${order.id}`)}
                      >
                        <TableCell className="font-mono font-bold">#{order.id}</TableCell>
                        <TableCell>{order.customer?.name || '—'}</TableCell>
                        <TableCell>{order.company?.name || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`status-${order.status}`}>
                            {ORDER_STATUS_LABELS[order.status]}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {PAYMENT_METHOD_LABELS[order.payment_method]}
                              {order.is_paid && (
                                <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">
                                  Zaplatené
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>{new Date(order.created_at).toLocaleDateString('sk-SK')}</TableCell>
                        <TableCell>
                          {order.status === 'odovzdane' ? '—' : order.deadline_at ? (
                            <span className={cn(
                              'text-muted-foreground',
                              deadlineStatus === 'overdue' && 'text-destructive font-medium',
                              deadlineStatus === 'critical' && 'text-destructive font-medium',
                              deadlineStatus === 'soon' && 'text-warning font-medium'
                            )}>
                              {new Date(order.deadline_at).toLocaleDateString('sk-SK')}
                            </span>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="text-center">
                        Načítavam...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && (!filteredOrders || filteredOrders.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground">
                        Žiadne zákazky
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
