import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PAYMENT_METHOD_LABELS, ORDER_STATUS_LABELS } from '@/lib/types';
import { getDeadlineStatus } from '@/lib/working-days';
import type { Database } from '@/integrations/supabase/types';
import { CheckCircle2, XCircle, Calendar, User, Euro, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type PaymentMethod = Database['public']['Enums']['payment_method'];

interface OrderWithRelations {
  id: number;
  status: Database['public']['Enums']['order_status'] | null;
  is_paid?: boolean | null;
  payment_method: PaymentMethod | null;
  created_at: string | null;
  deadline_at?: string | null;
  notes?: string | null;
  customer: { name: string } | null;
  company: { name: string } | null;
}

interface PaymentKanbanBoardProps {
  orders: OrderWithRelations[];
  isLoading: boolean;
}

const PAYMENT_COLUMNS = [
  { 
    key: 'unpaid', 
    label: 'Nezaplatené', 
    icon: XCircle, 
    color: 'bg-destructive/10 border-destructive/30 text-destructive',
    filter: (order: OrderWithRelations) => !order.is_paid
  },
  { 
    key: 'paid', 
    label: 'Zaplatené', 
    icon: CheckCircle2, 
    color: 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400',
    filter: (order: OrderWithRelations) => order.is_paid === true
  },
];

export function PaymentKanbanBoard({ orders, isLoading }: PaymentKanbanBoardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const togglePaidMutation = useMutation({
    mutationFn: async ({ orderId, isPaid }: { orderId: number; isPaid: boolean }) => {
      const { error } = await supabase
        .from('orders')
        .update({ is_paid: isPaid })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: (_, { isPaid }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: isPaid ? 'Zákazka zaplatená' : 'Zákazka označená ako nezaplatená',
        description: 'Status platby bol aktualizovaný.',
      });
    },
    onError: () => {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa zmeniť status platby.',
        variant: 'destructive',
      });
    },
  });

  const getPaymentIcon = (method: PaymentMethod | null) => {
    switch (method) {
      case 'hotovost':
        return <Euro className="h-3 w-3" />;
      case 'karta':
        return <CreditCard className="h-3 w-3" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {PAYMENT_COLUMNS.map(({ key, label }) => (
          <Card key={key} className="min-h-[500px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {PAYMENT_COLUMNS.map(({ key, label, icon: Icon, color, filter }) => {
        const columnOrders = orders.filter(filter);
        const totalValue = columnOrders.length; // Could calculate actual value if we had order totals
        
        return (
          <Card key={key} className="min-h-[500px]">
            <CardHeader className={cn('pb-3 rounded-t-lg border-b', color.split(' ').slice(0, 2).join(' '))}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-5 w-5', color.split(' ').slice(2).join(' '))} />
                  <CardTitle className="text-sm font-medium">
                    {label}
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {columnOrders.length} zákaziek
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <ScrollArea className="h-[450px] pr-3">
                <div className="space-y-3">
                  {columnOrders.map((order) => {
                    const deadlineStatus = getDeadlineStatus(order.deadline_at);
                    
                    return (
                      <div
                        key={order.id}
                        className={cn(
                          'rounded-lg border bg-card p-3 shadow-sm transition-all',
                          'hover:shadow-md hover:border-primary/50',
                          deadlineStatus === 'overdue' && 'border-destructive/50 bg-destructive/5',
                          deadlineStatus === 'critical' && 'border-destructive/50 bg-destructive/5',
                          deadlineStatus === 'soon' && 'border-warning/50 bg-warning/5'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => navigate(`/zakazky/${order.id}`)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-primary">
                                #{order.id}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {ORDER_STATUS_LABELS[order.status || 'prijate']}
                              </Badge>
                            </div>
                            
                            {order.customer && (
                              <div className="mt-2 flex items-center gap-1.5 text-sm">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="truncate">{order.customer.name}</span>
                              </div>
                            )}
                            
                            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                              {order.payment_method && (
                                <div className="flex items-center gap-1">
                                  {getPaymentIcon(order.payment_method)}
                                  <span>{PAYMENT_METHOD_LABELS[order.payment_method]}</span>
                                </div>
                              )}
                              {order.deadline_at && (
                                <div className={cn(
                                  'flex items-center gap-1',
                                  deadlineStatus === 'overdue' && 'text-destructive font-medium',
                                  deadlineStatus === 'critical' && 'text-destructive font-medium',
                                  deadlineStatus === 'soon' && 'text-warning font-medium'
                                )}>
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(order.deadline_at), 'dd.MM.yyyy', { locale: sk })}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant={order.is_paid ? 'outline' : 'default'}
                              className={cn(
                                'h-8 min-w-[100px]',
                                order.is_paid 
                                  ? 'text-muted-foreground' 
                                  : 'bg-green-600 hover:bg-green-700'
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePaidMutation.mutate({ 
                                  orderId: order.id, 
                                  isPaid: !order.is_paid 
                                });
                              }}
                            >
                              {order.is_paid ? 'Zrušiť' : 'Zaplatiť'}
                            </Button>
                          )}
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
