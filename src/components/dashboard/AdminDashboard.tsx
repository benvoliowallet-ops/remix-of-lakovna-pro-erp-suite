import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Euro, TrendingUp, AlertTriangle, ClipboardList, Calendar, ExternalLink, Search } from 'lucide-react';
import { ORDER_STATUS_LABELS, STRUCTURE_TYPE_LABELS, GLOSS_TYPE_LABELS } from '@/lib/types';
import { formatRALWithName } from '@/lib/ral-colors';
import { getDeadlineStatus, getWorkingDaysUntil } from '@/lib/working-days';
import { cn } from '@/lib/utils';
import type { Color, Order } from '@/lib/types';

export function AdminDashboard() {
  const navigate = useNavigate();

  const { data: orders } = useQuery({
    queryKey: ['orders-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:customers(name)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as unknown as (Order & { customer: { name: string } | null })[];
    },
  });

  const { data: lowStockColors } = useQuery({
    queryKey: ['low-stock-colors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colors')
        .select('*')
        .lt('stock_kg', 5); // filtered server-side; refined in JS for dynamic limits
      if (error) throw error;
      return (data as Color[]).filter(c => Number(c.stock_kg) < Number(c.min_stock_limit));
    },
  });

  const { data: criticalDeadlineOrders } = useQuery({
    queryKey: ['critical-deadline-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:customers(name)')
        .in('status', ['prijate', 'vo_vyrobe'])
        .not('deadline_at', 'is', null)
        .order('deadline_at', { ascending: true });
      if (error) throw error;
      
      // Filter for critical and overdue deadlines (1 working day or less)
      return (data as unknown as (Order & { customer: { name: string } | null })[]).filter(order => {
        const status = getDeadlineStatus(order.deadline_at);
        return status === 'critical' || status === 'overdue';
      });
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('id')
        .gte('created_at', today.toISOString());

      const { data: activeOrders } = await supabase
        .from('orders')
        .select('id')
        .in('status', ['prijate', 'vo_vyrobe']);

      const { data: colors } = await supabase
        .from('colors')
        .select('stock_kg, price_per_kg_purchase');

      const stockValue = (colors || []).reduce(
        (sum, c) => sum + (Number(c.stock_kg) * Number(c.price_per_kg_purchase || 0)),
        0
      );

      return {
        ordersToday: todayOrders?.length || 0,
        activeOrders: activeOrders?.length || 0,
        stockValue: stockValue.toFixed(2),
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Prehľad vašej lakovne</p>
      </div>

      {/* Stats Cards - Interactive */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
          onClick={() => navigate('/zakazky?view=table&created=today')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Zákazky dnes</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.ordersToday || 0}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              nových zákaziek
              <ExternalLink className="h-3 w-3" />
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
          onClick={() => navigate('/zakazky?view=kanban&status=active')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aktívne zákazky</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeOrders || 0}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              vo výrobe alebo prijaté
              <ExternalLink className="h-3 w-3" />
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
          onClick={() => navigate('/sklad')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Hodnota skladu</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stockValue || '0.00'} €</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              celková hodnota farieb
              <ExternalLink className="h-3 w-3" />
            </p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            lowStockColors && lowStockColors.length > 0 
              ? 'border-warning hover:border-warning/80' 
              : 'hover:border-primary/50'
          )}
          onClick={() => navigate('/sklad?filter=low-stock')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Nízky stav</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${lowStockColors && lowStockColors.length > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockColors?.length || 0}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              farieb pod limitom
              <ExternalLink className="h-3 w-3" />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Deadlines Alert */}
      {criticalDeadlineOrders && criticalDeadlineOrders.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Calendar className="h-5 w-5" />
              Kritické termíny ({criticalDeadlineOrders.length})
            </CardTitle>
            <CardDescription>
              Zákazky s termínom o 1 pracovný deň alebo po lehote
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {criticalDeadlineOrders.slice(0, 6).map((order) => {
                const workingDays = getWorkingDaysUntil(order.deadline_at);
                const isOverdue = workingDays !== null && workingDays < 0;
                
                return (
                  <Badge
                    key={order.id}
                    variant="outline"
                    className={cn(
                      'cursor-pointer px-3 py-1.5 transition-colors',
                      isOverdue 
                        ? 'border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20' 
                        : 'border-warning bg-warning/10 text-warning-foreground hover:bg-warning/20'
                    )}
                    onClick={() => navigate(`/zakazky/${order.id}`)}
                  >
                    <span className="font-mono font-bold">#{order.id}</span>
                    <span className="mx-1">•</span>
                    <span className="truncate max-w-[100px]">{order.customer?.name || 'Bez zákazníka'}</span>
                    <span className="mx-1">•</span>
                    <span className="font-medium">
                      {isOverdue 
                        ? `${Math.abs(workingDays || 0)} prac. dní po` 
                        : workingDays === 0 
                          ? 'Dnes!' 
                          : `${workingDays} prac. deň`
                      }
                    </span>
                  </Badge>
                );
              })}
              {criticalDeadlineOrders.length > 6 && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer"
                  onClick={() => navigate('/zakazky?view=table&deadline=critical')}
                >
                  +{criticalDeadlineOrders.length - 6} ďalších
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Posledné zákazky</CardTitle>
            <CardDescription>Najnovšie prijaté zákazky</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Zákazník</TableHead>
                  <TableHead>Stav</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.map((order) => (
                  <TableRow 
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/zakazky/${order.id}`)}
                  >
                    <TableCell className="font-mono">#{order.id}</TableCell>
                    <TableCell>{order.customer?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`status-${order.status}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!orders || orders.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Žiadne zákazky
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card 
          className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            lowStockColors && lowStockColors.length > 0 ? 'border-warning' : ''
          )}
          onClick={() => navigate('/sklad?filter=low-stock')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Farby pod limitom
            </CardTitle>
            <CardDescription>Tieto farby je potrebné doplniť</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RAL</TableHead>
                  <TableHead>Štruktúra</TableHead>
                  <TableHead>Stav (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockColors?.slice(0, 5).map((color) => (
                  <TableRow key={color.id} className="bg-warning/5">
                    <TableCell className="font-mono font-bold">{formatRALWithName(color.ral_code, color.color_name)}</TableCell>
                    <TableCell>
                      {color.ral_code !== 'ZAKLAD' && `${STRUCTURE_TYPE_LABELS[color.structure]} / ${GLOSS_TYPE_LABELS[color.gloss]}`}
                      {color.ral_code === 'ZAKLAD' && '—'}
                    </TableCell>
                    <TableCell className="font-mono text-warning">
                      {Number(color.stock_kg).toFixed(3)}
                    </TableCell>
                  </TableRow>
                ))}
                {lowStockColors && lowStockColors.length > 5 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      +{lowStockColors.length - 5} ďalších farieb
                    </TableCell>
                  </TableRow>
                )}
                {(!lowStockColors || lowStockColors.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Všetky farby sú na sklade
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
