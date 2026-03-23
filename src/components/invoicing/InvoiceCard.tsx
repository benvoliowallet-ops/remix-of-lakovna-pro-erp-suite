import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Upload, 
  Check, 
  MoreVertical, 
  ExternalLink,
  Building2,
  User,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InvoiceUploadDialog } from './InvoiceUploadDialog';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/lib/types';
import type { InvoiceOrder } from '@/pages/Invoicing';

const getPaymentBadgeVariant = (method: PaymentMethod | null): "default" | "secondary" | "outline" => {
  if (method === 'prevod') return 'default';
  if (method === 'hotovost' || method === 'karta') return 'secondary';
  return 'outline';
};

interface InvoiceCardProps {
  order: InvoiceOrder;
  columnType: 'waiting' | 'unpaid' | 'overdue' | 'paid';
  onUpdate: () => void;
  vatRate: number;
}

export function InvoiceCard({ order, columnType, onUpdate, vatRate }: InvoiceCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const totalWithVat = order.total_price * (1 + vatRate / 100);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('sk-SK');
  };

  const markAsPaidMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('orders')
        .update({ is_paid: true })
        .eq('id', order.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Zákazka označená ako uhradená');
      queryClient.invalidateQueries({ queryKey: ['invoicing-orders'] });
      onUpdate();
    },
    onError: (error) => {
      toast.error('Chyba pri označovaní platby: ' + error.message);
    },
  });

  const openInvoice = async () => {
    if (order.invoice_url) {
      // Generate a signed URL for secure access to the private bucket
      const { data, error } = await supabase.storage
        .from('invoices')
        .createSignedUrl(order.invoice_url, 3600); // 1 hour expiry
      
      if (error) {
        toast.error('Chyba pri otváraní faktúry: ' + error.message);
        return;
      }
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    }
  };

  const isOverdue = columnType === 'overdue';

  return (
    <>
      <Card 
        className={cn(
          'cursor-pointer transition-all hover:shadow-md',
          isOverdue && 'border-2 border-destructive bg-destructive/5'
        )}
      >
        <CardContent className="p-3">
          {/* Header with ID and actions */}
          <div className="flex items-start justify-between mb-2">
            <div 
              className="flex items-center gap-2 cursor-pointer hover:text-primary"
              onClick={() => navigate(`/zakazky/${order.id}`)}
            >
              <span className="font-mono font-bold text-lg">#{order.id}</span>
              <ExternalLink className="h-3 w-3" />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/zakazky/${order.id}`)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Zobraziť zákazku
                </DropdownMenuItem>
                {!order.is_paid && (
                  <>
                    <DropdownMenuItem onClick={() => setUploadDialogOpen(true)}>
                      <Upload className="mr-2 h-4 w-4" />
                      {order.invoice_url ? 'Nahradiť faktúru' : 'Nahrať faktúru'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => markAsPaidMutation.mutate()}>
                      <Check className="mr-2 h-4 w-4" />
                      Označiť ako zaplatené
                    </DropdownMenuItem>
                  </>
                )}
                {order.invoice_url && (
                  <DropdownMenuItem onClick={openInvoice}>
                    <FileText className="mr-2 h-4 w-4" />
                    Otvoriť faktúru
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Customer info */}
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{order.customer?.name || '—'}</span>
            </div>
            {order.customer?.company_name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{order.customer.company_name}</span>
              </div>
            )}
          </div>

          {/* Payment method and VAT status */}
          <div className="mb-3 flex flex-wrap gap-1">
            {order.payment_method && (
              <Badge 
                variant={getPaymentBadgeVariant(order.payment_method)} 
                className={cn(
                  "text-xs",
                  order.payment_method === 'prevod' && "bg-primary/10 text-primary border-primary/30",
                  (order.payment_method === 'hotovost' || order.payment_method === 'karta') && "bg-success/10 text-success border-success/30"
                )}
              >
                {PAYMENT_METHOD_LABELS[order.payment_method]}
              </Badge>
            )}
            <Badge variant={order.company?.is_vat_payer ? 'default' : 'secondary'} className="text-xs">
              {order.company?.is_vat_payer ? 'Platca DPH' : 'Neplatca DPH'}
            </Badge>
          </div>

          {/* Due date */}
          {order.due_date && (
            <div className={cn(
              'flex items-center gap-2 text-sm mb-3',
              isOverdue && 'text-destructive font-medium'
            )}>
              <Calendar className="h-3 w-3" />
              <span>Splatnosť: {formatDate(order.due_date)}</span>
            </div>
          )}

          {/* Total price */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">Celkom s DPH:</span>
            <span className="font-bold text-lg">{formatCurrency(totalWithVat)}</span>
          </div>

          {/* Invoice status / Quick actions */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t">
            {order.invoice_url ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80"
                onClick={openInvoice}
              >
                <FileText className="mr-1 h-4 w-4" />
                PDF
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="mr-1 h-4 w-4" />
                Nahrať
              </Button>
            )}

            {!order.is_paid && (
              <Button
                variant="default"
                size="sm"
                onClick={() => markAsPaidMutation.mutate()}
                disabled={markAsPaidMutation.isPending}
              >
                <Check className="mr-1 h-4 w-4" />
                Zaplatené
              </Button>
            )}

            {order.is_paid && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                <Check className="mr-1 h-3 w-3" />
                Uhradené
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <InvoiceUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        order={order}
        onSuccess={onUpdate}
      />
    </>
  );
}
