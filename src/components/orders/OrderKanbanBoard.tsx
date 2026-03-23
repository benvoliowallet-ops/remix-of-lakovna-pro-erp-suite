import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ORDER_STATUS_LABELS } from '@/lib/types';
import { getDeadlineStatus, getWorkingDaysUntil } from '@/lib/working-days';
import type { Database } from '@/integrations/supabase/types';
import { Package, Clock, Wrench, CheckCircle, Calendar, User, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type OrderStatus = Database['public']['Enums']['order_status'];

interface OrderWithRelations {
  id: number;
  status: OrderStatus | null;
  created_at: string | null;
  deadline_at?: string | null;
  notes?: string | null;
  customer: { name: string } | null;
  company: { name: string } | null;
}

interface OrderKanbanBoardProps {
  orders: OrderWithRelations[];
  isLoading: boolean;
  canDragDrop?: boolean; // Only admins can drag & drop
}

const STATUS_COLUMNS: { status: OrderStatus; icon: typeof Package; color: string }[] = [
  { status: 'prijate', icon: Package, color: 'bg-blue-500/10 border-blue-500/30' },
  { status: 'vo_vyrobe', icon: Wrench, color: 'bg-yellow-500/10 border-yellow-500/30' },
  { status: 'ukoncene', icon: CheckCircle, color: 'bg-green-500/10 border-green-500/30' },
  { status: 'odovzdane', icon: Clock, color: 'bg-gray-500/10 border-gray-500/30' },
];

export function OrderKanbanBoard({ orders, isLoading, canDragDrop = false }: OrderKanbanBoardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [draggedOrder, setDraggedOrder] = useState<OrderWithRelations | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<OrderStatus | null>(null);

  // Only allow drag & drop if explicitly enabled (admin only)
  const isDragEnabled = canDragDrop && isAdmin;

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: number; newStatus: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: 'Status aktualizovaný',
        description: 'Status zákazky bol úspešne zmenený.',
      });
    },
    onError: () => {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa zmeniť status zákazky.',
        variant: 'destructive',
      });
    },
  });

  const handleDragStart = (e: React.DragEvent, order: OrderWithRelations) => {
    if (!isDragEnabled) return;
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: OrderStatus) => {
    if (!isDragEnabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    if (!isDragEnabled) return;
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: OrderStatus) => {
    if (!isDragEnabled) return;
    e.preventDefault();
    setDragOverColumn(null);
    
    if (draggedOrder && draggedOrder.status !== newStatus) {
      updateStatusMutation.mutate({ orderId: draggedOrder.id, newStatus });
    }
    setDraggedOrder(null);
  };

  const handleDragEnd = () => {
    if (!isDragEnabled) return;
    setDraggedOrder(null);
    setDragOverColumn(null);
  };

  const getOrdersByStatus = (status: OrderStatus) => {
    return orders.filter(order => order.status === status);
  };

  const isDeadlineSoon = (deadline: string | null) => {
    const status = getDeadlineStatus(deadline);
    return status === 'soon';
  };

  const isDeadlineCritical = (deadline: string | null) => {
    const status = getDeadlineStatus(deadline);
    return status === 'critical';
  };

  const isOverdue = (deadline: string | null) => {
    const status = getDeadlineStatus(deadline);
    return status === 'overdue';
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STATUS_COLUMNS.map(({ status }) => (
          <Card key={status} className="min-h-[500px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{ORDER_STATUS_LABELS[status]}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {STATUS_COLUMNS.map(({ status, icon: Icon, color }) => {
        const columnOrders = getOrdersByStatus(status);
        const isDragOver = dragOverColumn === status;
        
        return (
          <Card
            key={status}
            className={cn(
              'min-h-[500px] transition-all duration-200',
              isDragOver && 'ring-2 ring-primary ring-offset-2'
            )}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <CardHeader className={cn('pb-3 rounded-t-lg border-b', color)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <CardTitle className="text-sm font-medium">
                    {ORDER_STATUS_LABELS[status]}
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {columnOrders.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <ScrollArea className="h-[450px] pr-3">
                <div className="space-y-3">
                  {columnOrders.map((order) => {
                    const isActive = order.status === 'prijate' || order.status === 'vo_vyrobe';
                    const showDeadline = order.status !== 'odovzdane' && order.deadline_at;
                    const deadlineWarning = isActive;

                    return (
                    <div
                      key={order.id}
                      draggable={isDragEnabled}
                      onDragStart={(e) => handleDragStart(e, order)}
                      onDragEnd={handleDragEnd}
                      onClick={() => navigate(`/zakazky/${order.id}`)}
                      className={cn(
                        'rounded-lg border bg-card p-3 shadow-sm transition-all',
                        isDragEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                        'hover:shadow-md hover:border-primary/50',
                        isDragEnabled && draggedOrder?.id === order.id && 'opacity-50 scale-95',
                        deadlineWarning && isOverdue(order.deadline_at) && 'border-destructive/50 bg-destructive/5',
                        deadlineWarning && isDeadlineCritical(order.deadline_at) && !isOverdue(order.deadline_at) && 'border-destructive/50 bg-destructive/5',
                        deadlineWarning && isDeadlineSoon(order.deadline_at) && 'border-warning/50 bg-warning/5'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-sm font-bold text-primary">
                          #{order.id}
                        </span>
                        {showDeadline && (
                          <div className={cn(
                            'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded',
                            deadlineWarning && isOverdue(order.deadline_at) && 'text-destructive bg-destructive/10 font-medium',
                            deadlineWarning && isDeadlineCritical(order.deadline_at) && !isOverdue(order.deadline_at) && 'text-destructive bg-destructive/10 font-medium',
                            deadlineWarning && isDeadlineSoon(order.deadline_at) && 'text-warning bg-warning/10 font-medium',
                            !deadlineWarning && 'text-muted-foreground'
                          )}>
                            {deadlineWarning && (isOverdue(order.deadline_at) || isDeadlineCritical(order.deadline_at)) && (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            <Calendar className="h-3 w-3" />
                            {format(new Date(order.deadline_at), 'dd.MM', { locale: sk })}
                          </div>
                        )}
                      </div>
                      
                      {order.customer && (
                        <div className="mt-2 flex items-center gap-1.5 text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{order.customer.name}</span>
                        </div>
                      )}
                      
                      {order.notes && (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                          {order.notes}
                        </p>
                      )}
                      
                      <div className="mt-2 text-xs text-muted-foreground">
                        {order.created_at && format(new Date(order.created_at), 'dd.MM.yyyy', { locale: sk })}
                      </div>
                    </div>
                  );
                  })}
                  
                  {columnOrders.length === 0 && (
                    <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
                      Žiadne zákazky
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
