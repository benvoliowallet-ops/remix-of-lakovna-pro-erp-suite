import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, ClipboardList, Clock, Play, Loader2, ArrowRight, AlertTriangle, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ORDER_STATUS_LABELS, STRUCTURE_TYPE_LABELS, GLOSS_TYPE_LABELS } from '@/lib/types';
import type { Order, OrderItem, Color } from '@/lib/types';
import { cn } from '@/lib/utils';
import { findRALColor } from '@/lib/ral-colors';

export function WorkerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch active orders with items
  const { data: activeOrders } = useQuery({
    queryKey: ['active-orders-worker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *, 
          customer:customers(name),
          order_items(*, color:colors(*))
        `)
        .in('status', ['prijate', 'vo_vyrobe'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Transform data to match expected types
      return (data || []).map(order => ({
        ...order,
        customer: order.customer as { name: string } | null,
        order_items: (order.order_items || []) as (OrderItem & { color: Color | null })[],
      }));
    },
  });

  // Find items currently in progress (my work)
  const itemsInProgress = activeOrders?.flatMap(order => 
    order.order_items
      .filter(item => item.work_status === 'in_progress')
      .map(item => ({ ...item, orderId: order.id, orderCustomer: order.customer?.name }))
  ) || [];

  // Find next available items to work on
  const nextAvailableItems = activeOrders?.flatMap(order => {
    return order.order_items
      .filter(item => {
        if (item.work_status !== 'pending' && item.work_status) return false;
        // Zachovať pravidlo: base coat musí byť dokončený pred top coat
        if (item.base_coat_id) {
          const baseCoat = order.order_items.find(i => i.id === item.base_coat_id);
          if (baseCoat && baseCoat.work_status !== 'completed') return false;
        }
        return true;
      })
      .slice(0, 3) // Zobraz viac položiek na zákazku
      .map(item => ({ ...item, orderId: order.id, orderCustomer: order.customer?.name }));
  }) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Výroba</h1>
        <p className="text-muted-foreground">Vaše pracovné prostredie</p>
      </div>

      {/* Items In Progress - Priority Section */}
      {itemsInProgress.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Rozpracované položky
          </h2>
          <div className="grid gap-3">
            {itemsInProgress.map((item) => (
              <Card 
                key={item.id}
                className="border-2 border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 cursor-pointer hover:shadow-lg transition-all"
                onClick={() => navigate(`/zakazky/${item.orderId}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Color swatch */}
                    <div
                      className="h-14 w-14 rounded-xl border-2 border-border shadow-inner flex-shrink-0"
                      style={{ backgroundColor: item.color?.hex_code || findRALColor(item.color?.ral_code || '')?.hex || '#808080' }}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-amber-500 text-white">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          V práci
                        </Badge>
                        {item.item_type === 'zaklad' && (
                          <Badge variant="destructive">ZÁKLAD</Badge>
                        )}
                      </div>
                      <p className="font-mono font-bold text-lg">
                        {item.global_production_number && (
                          <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded mr-2 text-base">
                            #{item.global_production_number}
                          </span>
                        )}
                        Zákazka #{item.orderId}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.orderCustomer || 'Bez zákazníka'}
                        {item.color && ` • RAL ${item.color.ral_code}`}
                      </p>
                      {item.weight_before_temp && (
                        <p className="text-sm font-mono text-amber-700 dark:text-amber-400 mt-1">
                          Váha pred: {Number(item.weight_before_temp).toFixed(3)} kg
                        </p>
                      )}
                    </div>

                    <Button 
                      size="lg" 
                      className="min-h-[56px] bg-success text-success-foreground hover:bg-success/90"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/zakazky/${item.orderId}`);
                      }}
                    >
                      Dokončiť
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-2 border-dashed border-primary bg-primary/5">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Button
              size="lg"
              className="h-16 w-full bg-primary text-lg font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl active:scale-95"
              onClick={() => navigate('/zakazky/nova')}
            >
              <Plus className="mr-3 h-7 w-7" />
              Nová zákazka
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 cursor-pointer transition-all"
          onClick={() => navigate('/zakazky')}
        >
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Button
              size="lg"
              variant="outline"
              className="h-16 w-full text-lg font-bold"
            >
              <ClipboardList className="mr-3 h-7 w-7" />
              Všetky zákazky
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Next Available Work */}
      {nextAvailableItems.length > 0 && itemsInProgress.length === 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Play className="h-5 w-5 text-primary" />
            Pripravené na prácu
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {nextAvailableItems.slice(0, 4).map((item) => (
              <Card 
                key={item.id}
                className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
                onClick={() => navigate(`/zakazky/${item.orderId}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg border-2 border-border shadow-sm flex-shrink-0"
                      style={{ backgroundColor: item.color?.hex_code || findRALColor(item.color?.ral_code || '')?.hex || '#808080' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold">
                        {item.global_production_number && (
                          <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-xs mr-1">
                            #{item.global_production_number}
                          </span>
                        )}
                        #{item.orderId}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.color ? `RAL ${item.color.ral_code}` : 'Bez farby'}
                      </p>
                    </div>
                    <Button size="sm" className="bg-primary">
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active Orders List */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Package className="h-5 w-5" />
          Aktívne zákazky ({activeOrders?.length || 0})
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeOrders?.map((order) => {
            const total = order.order_items.length;
            const completed = order.order_items.filter(i => i.work_status === 'completed').length;
            const inProgress = order.order_items.filter(i => i.work_status === 'in_progress').length;
            const progressPercent = total > 0 ? (completed / total) * 100 : 0;

            return (
              <Card
                key={order.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  inProgress > 0 && "border-amber-500 bg-amber-50/30 dark:bg-amber-950/10"
                )}
                onClick={() => navigate(`/zakazky/${order.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-xl">#{order.id}</CardTitle>
                    <Badge variant="outline" className={`status-${order.status}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </div>
                  <CardDescription className="text-base">
                    {order.customer?.name || 'Bez zákazníka'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Progress bar */}
                  {total > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{completed}/{total} položiek</span>
                        <span>{Math.round(progressPercent)}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {new Date(order.created_at).toLocaleDateString('sk-SK')}
                    </div>
                    {inProgress > 0 && (
                      <Badge className="bg-amber-500 text-white text-xs">
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        V práci
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {(!activeOrders || activeOrders.length === 0) && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">Žiadne aktívne zákazky</p>
                <Button 
                  className="mt-4"
                  onClick={() => navigate('/zakazky/nova')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Vytvoriť zákazku
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
