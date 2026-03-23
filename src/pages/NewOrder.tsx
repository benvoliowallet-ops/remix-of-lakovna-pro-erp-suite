import { useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Building2, Users, Package, Plus, ClipboardList, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { TRANSPORT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/types';
import type { Company, Customer, TransportType, PaymentMethod } from '@/lib/types';
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog';
import { OrderSuccessDialog } from '@/components/orders/OrderSuccessDialog';
import { OrderItemsEditor, PendingOrderItem } from '@/components/orders/OrderItemsEditor';
import { useTenantStatus } from '@/hooks/useTenantStatus';

type WizardStep = 1 | 2 | 3 | 4;

export default function NewOrder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [step, setStep] = useState<WizardStep>(1);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  
  const [orderData, setOrderData] = useState({
    company_id: '',
    customer_id: '',
    transport_in: 'zakaznik' as TransportType,
    transport_out: 'zakaznik' as TransportType,
    payment_method: 'hotovost' as PaymentMethod,
    deadline_at: '',
    notes: '',
  });

  const [orderItems, setOrderItems] = useState<PendingOrderItem[]>([]);

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;
      return data as Company[];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').order('name');
      if (error) throw error;
      return data as Customer[];
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      // Create order first
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          company_id: orderData.company_id || null,
          customer_id: orderData.customer_id || null,
          transport_in: orderData.transport_in,
          transport_out: orderData.transport_out,
          payment_method: orderData.payment_method,
          deadline_at: orderData.deadline_at || null,
          notes: orderData.notes || null,
          status: 'prijate',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items if any
      if (orderItems.length > 0) {
        // Generate shared production numbers for paired items
        // Items sharing the same base_coat_id/top_coat_id pair get the same number
        const prodNumberMap = new Map<string, number>();
        
        // Group items by their pair (base+top share a number)
        for (const item of orderItems) {
          // Find the "group key" - items linked by base_coat_id/top_coat_id share a number
          let groupKey = item.id;
          if (item.base_coat_id) groupKey = item.base_coat_id;
          if (item.top_coat_id) groupKey = item.id; // this is the base coat itself
          
          if (!prodNumberMap.has(groupKey)) {
            // Get next production number from sequence
            const { data: seqResult } = await supabase.rpc('nextval_production_seq' as any);
            const num = typeof seqResult === 'number' ? seqResult : null;
            if (num) prodNumberMap.set(groupKey, num);
          }
        }

        // Assign production numbers - paired items share
        const getItemProdNumber = (item: PendingOrderItem): number | null => {
          // If this item has a base_coat_id, use the base coat's group key
          if (item.base_coat_id) {
            return prodNumberMap.get(item.base_coat_id) || null;
          }
          // If this item IS a base coat (has top_coat_id pointing to it from another item)
          const hasTopCoat = orderItems.some(other => other.base_coat_id === item.id);
          if (hasTopCoat) {
            return prodNumberMap.get(item.id) || null;
          }
          // Standalone item
          return prodNumberMap.get(item.id) || null;
        };

        // Step 1: Insert items without relationships and get their new DB IDs
        const itemsToInsert = orderItems.map(item => ({
          order_id: order.id,
          price_list_id: item.price_list_id || null,
          color_id: item.item_type === 'doplnkova_sluzba' ? null : (item.color_id || null),
          description: item.description || null,
          area_m2: item.item_type === 'disky' ? 0 
            : item.item_type === 'ine' ? item.area_m2 
            : item.item_type === 'doplnkova_sluzba' ? 1 
            : item.area_m2,
          is_double_layer: item.is_double_layer,
          is_rework: item.is_rework,
          total_price: item.total_price,
          item_type: item.item_type,
          price_per_m2: item.price_per_m2,
          global_production_number: item.item_type === 'doplnkova_sluzba' ? null : getItemProdNumber(item),
          work_status: 'pending',
          unit: item.item_type === 'doplnkova_sluzba' ? 'ks' : (item.item_type === 'disky' ? 'ks' : 'm2'),
        }));

        const { data: insertedItems, error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert)
          .select('id');

        if (itemsError) throw itemsError;

        // Step 2: Create mapping from frontend IDs to database IDs
        const idMap = new Map<string, string>();
        orderItems.forEach((item, index) => {
          if (insertedItems?.[index]) {
            idMap.set(item.id, insertedItems[index].id);
          }
        });

        // Step 3: Update base_coat_id and top_coat_id relationships with new DB IDs
        const itemsWithRelationships = orderItems.filter(
          item => item.base_coat_id || item.top_coat_id
        );

        for (const item of itemsWithRelationships) {
          const newId = idMap.get(item.id);
          if (!newId) continue;

          const updateData: { base_coat_id?: string; top_coat_id?: string } = {};
          
          if (item.base_coat_id) {
            const mappedBaseCoatId = idMap.get(item.base_coat_id);
            if (mappedBaseCoatId) {
              updateData.base_coat_id = mappedBaseCoatId;
            }
          }
          
          if (item.top_coat_id) {
            const mappedTopCoatId = idMap.get(item.top_coat_id);
            if (mappedTopCoatId) {
              updateData.top_coat_id = mappedTopCoatId;
            }
          }

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from('order_items')
              .update(updateData)
              .eq('id', newId);

            if (updateError) throw updateError;
          }
        }
      }

      return order;
    },
    onSuccess: (data) => {
      toast.success('Zákazka uložená', {
        description: `Zákazka #${data.id} bola úspešne uložená s ${orderItems.length} položkami`,
      });
      setCreatedOrderId(data.id);
      setSuccessDialogOpen(true);
    },
    onError: () => {
      toast.error('Chyba pri ukladaní zákazky');
    },
  });

  const canProceed = () => {
    if (step === 1) return orderData.company_id !== '';
    if (step === 2) return true; // Customer is optional
    if (step === 3) return true; // Details are optional
    return true;
  };

  const handleNext = () => {
    if (step < 4) {
      setStep((step + 1) as WizardStep);
    } else {
      createOrderMutation.mutate();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as WizardStep);
    } else {
      navigate('/zakazky');
    }
  };

  const selectedCompany = companies?.find(c => c.id === orderData.company_id);

  const stepLabels = [
    { icon: Building2, label: 'Firma' },
    { icon: Users, label: 'Zákazník' },
    { icon: Package, label: 'Detaily' },
    { icon: ClipboardList, label: 'Položky' },
  ];

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nová zákazka</h1>
            <p className="text-muted-foreground">Krok {step} z 4 - {stepLabels[step - 1].label}</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2">
          {stepLabels.map((s, index) => {
            const stepNum = index + 1;
            const Icon = s.icon;
            return (
              <div
                key={stepNum}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  stepNum === step
                    ? 'border-accent bg-accent text-accent-foreground'
                    : stepNum < step
                    ? 'border-success bg-success text-success-foreground'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {stepNum < step ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Company */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Výber firmy
              </CardTitle>
              <CardDescription>
                Vyberte firmu, ktorá bude fakturovať zákazku
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {companies?.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => setOrderData({ ...orderData, company_id: company.id })}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                      orderData.company_id === company.id
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{company.name}</p>
                        <p className="text-sm text-muted-foreground">
                          IČO: {company.ico || '—'}
                        </p>
                      </div>
                      {company.is_vat_payer ? (
                        <span className="rounded bg-success/10 px-2 py-1 text-xs font-medium text-success">
                          Platca DPH
                        </span>
                      ) : (
                        <span className="rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          Neplatca DPH
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {!orderData.company_id && (
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 flex-shrink-0" />
                  Pre pokračovanie vyberte firmu
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Customer */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Výber zákazníka
                  </CardTitle>
                  <CardDescription>
                    Vyberte zákazníka pre túto zákazku (voliteľné)
                  </CardDescription>
                </div>
                <CustomerFormDialog
                  onCustomerCreated={(id) => {
                    setOrderData({ ...orderData, customer_id: id });
                    queryClient.invalidateQueries({ queryKey: ['customers'] });
                  }}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Nový zákazník
                    </Button>
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={orderData.customer_id || "__none__"}
                onValueChange={(v) => setOrderData({ ...orderData, customer_id: v === "__none__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte zákazníka" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Bez zákazníka</SelectItem>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.ico && ` • IČO: ${customer.ico}`}
                      {customer.phone && ` • ${customer.phone}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Detaily zákazky
              </CardTitle>
              <CardDescription>
                Doplňujúce informácie o zákazke
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Dovoz</Label>
                  <Select
                    value={orderData.transport_in}
                    onValueChange={(v) => setOrderData({ ...orderData, transport_in: v as TransportType })}
                  >
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
                  <Label>Odvoz</Label>
                  <Select
                    value={orderData.transport_out}
                    onValueChange={(v) => setOrderData({ ...orderData, transport_out: v as TransportType })}
                  >
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

              <div className="space-y-2">
                <Label>Spôsob platby</Label>
                <Select
                  value={orderData.payment_method}
                  onValueChange={(v) => setOrderData({ ...orderData, payment_method: v as PaymentMethod })}
                >
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

              <div className="space-y-2">
                <Label>Termín dokončenia</Label>
                <Input
                  type="date"
                  value={orderData.deadline_at}
                  onChange={(e) => setOrderData({ ...orderData, deadline_at: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Poznámky</Label>
                <Textarea
                  value={orderData.notes}
                  onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                  placeholder="Poznámky k zákazke..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Items */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Položky zákazky
              </CardTitle>
              <CardDescription>
                Pridajte položky, ktoré budú súčasťou zákazky
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrderItemsEditor
                items={orderItems}
                onChange={setOrderItems}
                isVatPayer={selectedCompany?.is_vat_payer || false}
                isAdmin={isAdmin}
              />

              {/* Summary */}
              <div className="rounded-lg bg-muted p-4 mt-6">
                <h4 className="mb-2 font-semibold">Súhrn zákazky</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Firma:</span> {selectedCompany?.name}</p>
                  <p>
                    <span className="text-muted-foreground">Zákazník:</span>{' '}
                    {customers?.find(c => c.id === orderData.customer_id)?.name || 'Bez zákazníka'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Položky:</span>{' '}
                    {orderItems.length}
                  </p>
                  <p>
                    <span className="text-muted-foreground">DPH:</span>{' '}
                    {selectedCompany?.is_vat_payer ? '23%' : '0%'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {step === 1 ? 'Zrušiť' : 'Späť'}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || createOrderMutation.isPending}
            className={step === 4 ? 'bg-success text-success-foreground hover:bg-success/90' : ''}
          >
            {step === 4 ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Uložiť zákazku
              </>
            ) : (
              <>
                Ďalej
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Success Dialog */}
        {createdOrderId && (
          <OrderSuccessDialog
            open={successDialogOpen}
            orderId={createdOrderId}
            onClose={() => setSuccessDialogOpen(false)}
          />
        )}
      </div>
    </MainLayout>
  );
}
