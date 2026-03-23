import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { Order, PaymentMethod, TransportType } from '@/lib/types';
import { PAYMENT_METHOD_LABELS, TRANSPORT_TYPE_LABELS } from '@/lib/types';

interface EditOrderDetailsDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditOrderDetailsDialog({ order, open, onOpenChange }: EditOrderDetailsDialogProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [companyId, setCompanyId] = useState(order.company_id || '');
  const [customerId, setCustomerId] = useState(order.customer_id || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order.payment_method);
  const [transportIn, setTransportIn] = useState<TransportType>(order.transport_in);
  const [transportOut, setTransportOut] = useState<TransportType>(order.transport_out);
  const [deadlineAt, setDeadlineAt] = useState(order.deadline_at ? order.deadline_at.slice(0, 10) : '');
  const [notes, setNotes] = useState(order.notes || '');
  const [isPaid, setIsPaid] = useState(order.is_paid ?? false);

  useEffect(() => {
    if (open) {
      setCompanyId(order.company_id || '');
      setCustomerId(order.customer_id || '');
      setPaymentMethod(order.payment_method);
      setTransportIn(order.transport_in);
      setTransportOut(order.transport_out);
      setDeadlineAt(order.deadline_at ? order.deadline_at.slice(0, 10) : '');
      setNotes(order.notes || '');
      setIsPaid(order.is_paid ?? false);
    }
  }, [open, order]);

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          company_id: companyId === '__none__' ? null : (companyId || null),
          customer_id: customerId === '__none__' ? null : (customerId || null),
          payment_method: paymentMethod,
          transport_in: transportIn,
          transport_out: transportOut,
          deadline_at: deadlineAt || null,
          notes: notes || null,
          is_paid: isPaid,
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Zákazka aktualizovaná');
      queryClient.invalidateQueries({ queryKey: ['order', String(order.id)] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-dashboard'] });
      onOpenChange(false);
    } catch (err) {
      console.error('Update order error:', err);
      toast.error('Chyba pri aktualizácii zákazky');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upraviť zákazku #{order.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Company */}
          <div className="space-y-2">
            <Label>Firma</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Vybrať firmu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Bez firmy —</SelectItem>
                {companies?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Customer */}
          <div className="space-y-2">
            <Label>Zákazník</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Vybrať zákazníka" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Bez zákazníka —</SelectItem>
                {customers?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label>Spôsob platby</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transport in/out */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Doprava dovoz</Label>
              <Select value={transportIn} onValueChange={(v) => setTransportIn(v as TransportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRANSPORT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Doprava odvoz</Label>
              <Select value={transportOut} onValueChange={(v) => setTransportOut(v as TransportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRANSPORT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label>Termín</Label>
            <Input
              type="date"
              value={deadlineAt}
              onChange={(e) => setDeadlineAt(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Poznámky</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Is paid */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-is-paid"
              checked={isPaid}
              onCheckedChange={(checked) => setIsPaid(checked === true)}
            />
            <Label htmlFor="edit-is-paid" className="cursor-pointer">Zaplatené</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušiť</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Ukladám...' : 'Uložiť'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
