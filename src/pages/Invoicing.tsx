import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Euro, AlertTriangle, CheckCircle } from 'lucide-react';
import { InvoiceKanbanBoard } from '@/components/invoicing/InvoiceKanbanBoard';
import type { Order, Customer, Company } from '@/lib/types';

export type InvoiceOrder = Order & {
  customer: Customer | null;
  company: Company | null;
  total_price: number;
};

export default function Invoicing() {
  // Fetch all orders that are "odovzdane" (handed over)
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['invoicing-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          company:companies(*),
          order_items(total_price)
        `)
        .eq('status', 'odovzdane')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Calculate total price for each order
      return (data as unknown as (Order & {
        customer: Customer | null;
        company: Company | null;
        order_items: { total_price: number }[];
      })[]).map(order => ({
        ...order,
        total_price: order.order_items?.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0) || 0,
      }));
    },
  });

  // Calculate statistics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = orders ? {
    waitingForInvoice: orders.filter(o => !o.invoice_url && !o.is_paid).length,
    totalReceivables: orders
      .filter(o => o.invoice_url && !o.is_paid)
      .reduce((sum, o) => sum + o.total_price, 0),
    overdueDebts: orders
      .filter(o => o.invoice_url && !o.is_paid && o.due_date && new Date(o.due_date) < today)
      .reduce((sum, o) => sum + o.total_price, 0),
    paidCount: orders.filter(o => o.is_paid).length,
  } : {
    waitingForInvoice: 0,
    totalReceivables: 0,
    overdueDebts: 0,
    paidCount: 0,
  };

  // Get company VAT rate for calculations
  const vatRate = orders?.[0]?.company?.vat_rate || 20;
  
  const formatCurrency = (amount: number, withVat = true) => {
    const finalAmount = withVat ? amount * (1 + vatRate / 100) : amount;
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
    }).format(finalAmount);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fakturácia</h1>
          <p className="text-muted-foreground">Správa faktúr a sledovanie úhrad</p>
        </div>

        {/* Financial Summary Header */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Čaká na faktúru</p>
                <p className="text-2xl font-bold">{stats.waitingForInvoice}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Euro className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pohľadávky celkom</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalReceivables)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className={stats.overdueDebts > 0 ? 'border-destructive' : ''}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stats.overdueDebts > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                <AlertTriangle className={`h-6 w-6 ${stats.overdueDebts > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dlhy po splatnosti</p>
                <p className={`text-2xl font-bold ${stats.overdueDebts > 0 ? 'text-destructive' : ''}`}>
                  {formatCurrency(stats.overdueDebts)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uhradené</p>
                <p className="text-2xl font-bold">{stats.paidCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 4-Column Kanban Board */}
        <InvoiceKanbanBoard 
          orders={orders as InvoiceOrder[] || []} 
          isLoading={isLoading}
          onUpdate={refetch}
          vatRate={vatRate}
          getOrderVatRate={(order) => (order as InvoiceOrder).company?.vat_rate || 20}
        />
      </div>
    </MainLayout>
  );
}
