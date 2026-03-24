import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { InvoiceCard } from './InvoiceCard';
import type { InvoiceOrder } from '@/pages/Invoicing';

interface InvoiceKanbanBoardProps {
  orders: InvoiceOrder[];
  isLoading: boolean;
  onUpdate: () => void;
  vatRate: number;
}

type ColumnType = 'waiting' | 'unpaid' | 'overdue' | 'paid';

interface Column {
  id: ColumnType;
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}

const columns: Column[] = [
  {
    id: 'waiting',
    title: 'Na fakturáciu',
    icon: <FileText className="h-4 w-4" />,
    colorClass: 'border-t-muted-foreground',
    badgeVariant: 'secondary',
  },
  {
    id: 'unpaid',
    title: 'Neuhradené (V lehote)',
    icon: <Clock className="h-4 w-4" />,
    colorClass: 'border-t-primary',
    badgeVariant: 'default',
  },
  {
    id: 'overdue',
    title: 'Po splatnosti',
    icon: <AlertTriangle className="h-4 w-4" />,
    colorClass: 'border-t-destructive',
    badgeVariant: 'destructive',
  },
  {
    id: 'paid',
    title: 'Uhradené',
    icon: <CheckCircle className="h-4 w-4" />,
    colorClass: 'border-t-green-500',
    badgeVariant: 'outline',
  },
];

export function InvoiceKanbanBoard({ orders, isLoading, onUpdate, vatRate }: InvoiceKanbanBoardProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const categorizedOrders = useMemo(() => {
    const result: Record<ColumnType, InvoiceOrder[]> = {
      waiting: [],
      unpaid: [],
      overdue: [],
      paid: [],
    };

    orders.forEach(order => {
      if (order.is_paid) {
        result.paid.push(order);
      } else if (!order.invoice_url) {
        result.waiting.push(order);
      } else if (order.due_date && new Date(order.due_date) < today) {
        result.overdue.push(order);
      } else {
        result.unpaid.push(order);
      }
    });

    return result;
  }, [orders, today]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {columns.map(col => (
          <Card key={col.id} className={`border-t-4 ${col.colorClass}`}>
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {columns.map(column => (
        <Card key={column.id} className={`border-t-4 ${column.colorClass}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                {column.icon}
                {column.title}
              </span>
              <Badge variant={column.badgeVariant}>
                {categorizedOrders[column.id].length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[calc(100vh-350px)] overflow-y-auto">
            {categorizedOrders[column.id].length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Žiadne zákazky
              </p>
            ) : (
              categorizedOrders[column.id].map(order => (
                <InvoiceCard 
                  key={order.id} 
                  order={order} 
                  columnType={column.id}
                  onUpdate={onUpdate}
                  vatRate={order.company?.vat_rate || 20}
                />
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
