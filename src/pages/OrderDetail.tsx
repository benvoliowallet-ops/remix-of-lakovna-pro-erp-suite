import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Printer, Building2, User, Play, CheckCircle2, FileText, ChevronDown, Trash2, PackageCheck, AlertTriangle, Banknote, Lock, ExternalLink, Users, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ORDER_STATUS_LABELS, ITEM_TYPE_LABELS, ORDER_ITEM_TYPE_LABELS, STRUCTURE_TYPE_LABELS, GLOSS_TYPE_LABELS, WORK_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/types';
import { formatRALWithName } from '@/lib/ral-colors';
import type { Order, OrderItem, Color, PriceListItem, OrderStatus, WorkStatus } from '@/lib/types';
import { AddOrderItemDialog } from '@/components/orders/AddOrderItemDialog';
import { StartWorkDialog } from '@/components/orders/StartWorkDialog';
import { FinishWorkDialog } from '@/components/orders/FinishWorkDialog';
import { BatchWorkDialog } from '@/components/orders/BatchWorkDialog';
import { BatchSuggestionAlert } from '@/components/orders/BatchSuggestionAlert';
import { ConsumptionComparison } from '@/components/orders/ConsumptionComparison';
import { EditOrderItemDialog } from '@/components/orders/EditOrderItemDialog';
import { EditOrderDetailsDialog } from '@/components/orders/EditOrderDetailsDialog';
import { WorkflowProgress, getWorkflowConstraint } from '@/components/orders/WorkflowProgress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Helper: Group items by color key (ral_code + structure + gloss)
function getColorKey(item: OrderItem & { color: Color | null }): string {
  if (!item.color) return 'no-color';
  return `${item.color.ral_code}|${item.color.structure}|${item.color.gloss}`;
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, user } = useAuth();
  
  const [addItemDialog, setAddItemDialog] = useState(false);
  const [startWorkDialog, setStartWorkDialog] = useState(false);
  const [finishWorkDialog, setFinishWorkDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [handoverDialogOpen, setHandoverDialogOpen] = useState(false);
  const [markAsPaid, setMarkAsPaid] = useState(true);
  const [selectedItem, setSelectedItem] = useState<(OrderItem & { color: Color | null }) | null>(null);
  const [editingItem, setEditingItem] = useState<(OrderItem & { color: Color | null; price_list: PriceListItem | null }) | null>(null);
  const [editOrderDialog, setEditOrderDialog] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<OrderItem & { color: Color | null } | null>(null);
  
  // Batch workflow state
  const [selectedBatchItems, setSelectedBatchItems] = useState<Set<string>>(new Set());
  const [batchStartDialog, setBatchStartDialog] = useState(false);
  const [batchFinishDialog, setBatchFinishDialog] = useState(false);

  // Batch suggestion state (auto-detect matching items)
  const [batchSuggestion, setBatchSuggestion] = useState<{
    triggerItem: (OrderItem & { color: Color | null }) | null;
    matchingItems: (OrderItem & { color: Color | null })[];
  } | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          company:companies(*),
          customer:customers(*),
          order_items(*, color:colors(*), price_list:price_list(*))
        `)
      .eq('id', Number(id))
      .single();
      if (error) throw error;
      return data as Order & {
        company: { name: string; is_vat_payer: boolean; paint_coverage_m2_per_kg?: number; vat_rate?: number } | null;
        customer: { name: string; phone?: string } | null;
        order_items: (OrderItem & { color: Color | null; price_list: PriceListItem | null })[];
      };
    },
  });

  // Fetch production logs via order_id join — avoids stale closure on item IDs
  const { data: productionLogs } = useQuery({
    queryKey: ['production-logs', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_logs')
        .select('*, order_item:order_items!inner(order_id)')
        .eq('order_item.order_id', Number(id));
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch all order IDs for prev/next navigation
  const { data: orderIds } = useQuery({
    queryKey: ['order-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id')
        .order('id', { ascending: false });
      if (error) throw error;
      return (data as { id: number }[]).map(o => o.id);
    },
  });

  const currentIndex = orderIds?.indexOf(Number(id)) ?? -1;
  const prevId = currentIndex > 0 ? orderIds?.[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 && currentIndex < (orderIds?.length ?? 0) - 1
    ? orderIds?.[currentIndex + 1]
    : null;

  // Group items by color for batch processing
  const colorGroups = useMemo(() => {
    if (!order?.order_items) return new Map<string, (OrderItem & { color: Color | null })[]>();
    const groups = new Map<string, (OrderItem & { color: Color | null })[]>();
    for (const item of order.order_items) {
      const key = getColorKey(item as OrderItem & { color: Color | null });
      const arr = groups.get(key) || [];
      arr.push(item as OrderItem & { color: Color | null });
      groups.set(key, arr);
    }
    return groups;
  }, [order?.order_items]);

  // Get selected batch items as array
  const selectedBatchItemsArray = useMemo(() => {
    return (order?.order_items?.filter(item => selectedBatchItems.has(item.id)) || []) as (OrderItem & { color: Color | null })[];
  }, [order?.order_items, selectedBatchItems]);

  // Check if selected batch items share the same color
  const batchColorKey = useMemo(() => {
    if (selectedBatchItemsArray.length === 0) return null;
    const firstKey = getColorKey(selectedBatchItemsArray[0]);
    return selectedBatchItemsArray.every(item => getColorKey(item) === firstKey) ? firstKey : null;
  }, [selectedBatchItemsArray]);

  // Check batch validity
  const canBatchStart = useMemo(() => {
    if (selectedBatchItemsArray.length < 2) return false;
    if (!batchColorKey) return false;
    return selectedBatchItemsArray.every(item => 
      (item.work_status === 'pending' || !item.work_status) &&
      getWorkflowConstraint(order?.order_items as OrderItem[] || [], item.id).canStart
    );
  }, [selectedBatchItemsArray, batchColorKey, order?.order_items]);

  const canBatchFinish = useMemo(() => {
    if (selectedBatchItemsArray.length < 2) return false;
    if (!batchColorKey) return false;
    return selectedBatchItemsArray.every(item => item.work_status === 'in_progress');
  }, [selectedBatchItemsArray, batchColorKey]);

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: OrderStatus) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus as 'prijate' | 'vo_vyrobe' | 'ukoncene' | 'odovzdane' })
        .eq('id', Number(id));
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Stav zákazky aktualizovaný');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async () => {
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', Number(id));
      if (itemsError) throw itemsError;

      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', Number(id));
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Zákazka vymazaná');
      navigate('/zakazky');
    },
    onError: () => {
      toast.error('Chyba pri mazaní zákazky');
    },
  });

  // Helper: record inventory adjustment and update stock
  const recordDiscrepancy = async (colorId: string, expectedWeight: number, actualWeight: number) => {
    const diff = actualWeight - expectedWeight;
    if (Math.abs(diff) < 0.001) return; // No significant discrepancy

    // Record adjustment
    await supabase.from('inventory_adjustments').insert({
      color_id: colorId,
      worker_id: user?.id,
      expected_weight_kg: expectedWeight,
      actual_weight_kg: actualWeight,
      difference_kg: diff,
    });

    // Update stock to match actual weight
    await supabase
      .from('colors')
      .update({ stock_kg: actualWeight })
      .eq('id', colorId);
  };

  const startWorkMutation = useMutation({
    mutationFn: async ({ itemId, weightBefore }: { itemId: string; weightBefore: number }) => {
      const item = order?.order_items?.find(i => i.id === itemId);
      
      // Check for discrepancy and record it
      if (item?.color_id && item?.color) {
        const stockWeight = Number(item.color.stock_kg);
        await recordDiscrepancy(item.color_id, stockWeight, weightBefore);
      }

      const { error } = await supabase.rpc('update_order_item_work_fields', {
        _item_id: itemId,
        _work_status: 'in_progress',
        _weight_before_temp: weightBefore
      });
      if (error) throw error;

      if (order?.status === 'prijate') {
        await supabase
          .from('orders')
          .update({ status: 'vo_vyrobe' })
          .eq('id', Number(id));
      }
    },
    onSuccess: () => {
      toast.success('Práca začatá');
      setStartWorkDialog(false);
      setSelectedItem(null);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
    onError: (err) => {
      console.error('Start work error:', err);
      toast.error('Chyba pri začatí práce');
    },
  });

  const finishWorkMutation = useMutation({
    mutationFn: async ({ itemId, weightBefore, weightAfter }: { itemId: string; weightBefore: number; weightAfter: number }) => {
      const { error: logError } = await supabase.from('production_logs').insert({
        order_item_id: itemId,
        worker_id: user?.id,
        weight_before: weightBefore,
        weight_after: weightAfter,
      });
      if (logError) throw logError;

      const { error: itemError } = await supabase.rpc('update_order_item_work_fields', {
        _item_id: itemId,
        _work_status: 'completed',
        _weight_before_temp: null
      });
      if (itemError) throw itemError;

      const allItems = order?.order_items || [];
      const otherItemsCompleted = allItems
        .filter(item => item.id !== itemId)
        .every(item => item.work_status === 'completed');

      if (otherItemsCompleted) {
        await supabase
          .from('orders')
          .update({ status: 'ukoncene' })
          .eq('id', Number(id));
      }
    },
    onSuccess: () => {
      toast.success('Práca dokončená');
      setFinishWorkDialog(false);
      setSelectedItem(null);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['production-logs', id] });
    },
    onError: (err) => {
      console.error('Finish work error:', err);
      toast.error('Chyba pri dokončení práce');
    },
  });

  // Batch start mutation
  const batchStartMutation = useMutation({
    mutationFn: async (weightBefore: number) => {
      const items = selectedBatchItemsArray;
      if (items.length === 0) return;

      // Generate a batch group ID
      const batchGroupId = crypto.randomUUID();

      // Check for discrepancy with stock
      const firstItem = items[0];
      if (firstItem.color_id && firstItem.color) {
        const stockWeight = Number(firstItem.color.stock_kg);
        await recordDiscrepancy(firstItem.color_id, stockWeight, weightBefore);
      }

      // Start all items - store FULL weight (not divided) and batch_group_id
      for (const item of items) {
        const { error } = await supabase.rpc('update_order_item_work_fields', {
          _item_id: item.id,
          _work_status: 'in_progress',
          _weight_before_temp: weightBefore,
          _batch_group_id: batchGroupId
        });
        if (error) throw error;
      }

      if (order?.status === 'prijate') {
        await supabase
          .from('orders')
          .update({ status: 'vo_vyrobe' })
          .eq('id', Number(id));
      }
    },
    onSuccess: () => {
      toast.success(`${selectedBatchItemsArray.length} položiek začatých hromadne`);
      setBatchStartDialog(false);
      setSelectedBatchItems(new Set());
      setBatchSuggestion(null);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
    onError: (err) => {
      console.error('Batch start error:', err);
      toast.error('Chyba pri hromadnom začatí práce');
    },
  });

  // Batch finish mutation
  const batchFinishMutation = useMutation({
    mutationFn: async (weightAfter: number) => {
      const items = selectedBatchItemsArray;
      if (items.length === 0) return;

      // All items in batch have the same full weight_before_temp
      const totalWeightBefore = Number(items[0].weight_before_temp || 0);
      const totalConsumption = totalWeightBefore - weightAfter;
      const totalArea = items.reduce((sum, item) => sum + Number(item.area_m2), 0);

      // Create individual production logs with proportional consumption
      for (const item of items) {
        // Guard against division by zero (e.g. disk items with area_m2 = 0)
        const proportion = totalArea > 0 ? Number(item.area_m2) / totalArea : 1 / items.length;
        const itemConsumption = totalConsumption * proportion;
        const itemWeightBefore = totalWeightBefore * proportion;
        const itemWeightAfter = itemWeightBefore - itemConsumption;

        const { error: logError } = await supabase.from('production_logs').insert({
          order_item_id: item.id,
          worker_id: user?.id,
          weight_before: itemWeightBefore,
          weight_after: Math.max(0, itemWeightAfter),
        });
        if (logError) throw logError;

        const { error: itemError } = await supabase.rpc('update_order_item_work_fields', {
          _item_id: item.id,
          _work_status: 'completed',
          _weight_before_temp: null
        });
        if (itemError) throw itemError;
      }

      // Check if all items are now completed
      const allItems = order?.order_items || [];
      const otherItemsCompleted = allItems
        .filter(item => !items.some(bi => bi.id === item.id))
        .every(item => item.work_status === 'completed');

      if (otherItemsCompleted) {
        await supabase
          .from('orders')
          .update({ status: 'ukoncene' })
          .eq('id', Number(id));
      }
    },
    onSuccess: () => {
      toast.success(`${selectedBatchItemsArray.length} položiek dokončených`);
      setBatchFinishDialog(false);
      setSelectedBatchItems(new Set());
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['production-logs', id] });
    },
    onError: (err) => {
      console.error('Batch finish error:', err);
      toast.error('Chyba pri hromadnom dokončení');
    },
  });

  // Handover mutation
  const handoverMutation = useMutation({
    mutationFn: async (isPaid: boolean) => {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'odovzdane',
          is_paid: isPaid
        })
        .eq('id', Number(id));
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Zákazka odovzdaná');
      setHandoverDialogOpen(false);
      setMarkAsPaid(true);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      // Navigate ONLY after mutation succeeds (fix race condition)
      navigate(`/zakazky/${id}/protokol/odovzdavaci`);
    },
    onError: () => {
      toast.error('Chyba pri odovzdávaní');
    },
  });

  const deleteOrderItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Položka vymazaná');
      setDeleteItemDialogOpen(false);
      setItemToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
    onError: () => {
      toast.error('Chyba pri mazaní položky');
    },
  });

  const updatePaymentMethodMutation = useMutation({
    mutationFn: async (newMethod: string) => {
      const { error } = await supabase
        .from('orders')
        .update({ payment_method: newMethod as 'hotovost' | 'karta' | 'prevod' | 'postova_poukazka' | 'interne' })
        .eq('id', Number(id));
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Spôsob platby aktualizovaný');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
    onError: () => {
      toast.error('Chyba pri zmene spôsobu platby');
    },
  });

  const completeOrderMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'ukoncene' })
        .eq('id', Number(id));
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Zákazka dokončená');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
    onError: () => {
      toast.error('Chyba pri dokončení zákazky');
    },
  });

  const totalPrice = order?.order_items?.reduce((sum, item) => 
    sum + (item.is_rework ? 0 : Number(item.total_price)), 0
  ) || 0;

  // Calculate standard price (before discounts) for summary
  const totalStandardPrice = order?.order_items?.reduce((sum, item) => {
    if (item.is_rework) return sum;
    return sum + (Number(item.area_m2) * Number(item.price_per_m2));
  }, 0) || 0;

  const totalDiscount = totalStandardPrice - totalPrice;

  const vatRate = (order?.company?.vat_rate ?? 23) / 100;
  const vatAmount = order?.company?.is_vat_payer ? totalPrice * vatRate : 0;
  const vatPercent = order?.company?.vat_rate ?? 23;

  // Workflow helpers
  const allItemsCompleted = order?.order_items?.every(item => item.work_status === 'completed') ?? false;
  const anyItemInProgress = order?.order_items?.some(item => item.work_status === 'in_progress') ?? false;
  const anyItemPending = order?.order_items?.some(item => item.work_status === 'pending' || !item.work_status) ?? false;
  const hasItems = (order?.order_items?.length ?? 0) > 0;
  const isCashPayment = order?.payment_method === 'hotovost' || order?.payment_method === 'postova_poukazka';

  // Protection: all items must have consumption before completing order
  const allItemsHaveConsumption = useMemo(() => {
    if (!order?.order_items || !productionLogs) return false;
    return order.order_items.every(item => {
      // Doplnková služba doesn't need production logs
      if (item.item_type === 'doplnkova_sluzba') return true;
      if (item.work_status !== 'completed') return false;
      return productionLogs.some(log => log.order_item_id === item.id);
    });
  }, [order?.order_items, productionLogs]);

  // Calculate consumption data
  const getItemConsumption = (itemId: string) => {
    const log = productionLogs?.find(l => l.order_item_id === itemId);
    return log?.consumed_kg || 0;
  };

  const calculateEstimatedConsumption = (item: OrderItem) => {
    const coverage = order?.company?.paint_coverage_m2_per_kg || 8;
    const base = Number(item.area_m2) / coverage;
    return item.is_double_layer ? base * 1.5 : base;
  };

  const totalEstimatedConsumption = order?.order_items?.reduce((sum, item) => 
    sum + calculateEstimatedConsumption(item), 0
  ) || 0;

  const totalRealConsumption = order?.order_items?.reduce((sum, item) => 
    sum + getItemConsumption(item.id), 0
  ) || 0;

  // Direct start mutation for doplnkova_sluzba (no weighing)
  const directStartMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.rpc('update_order_item_work_fields', {
        _item_id: itemId,
        _work_status: 'in_progress',
      });
      if (error) throw error;

      if (order?.status === 'prijate') {
        await supabase
          .from('orders')
          .update({ status: 'vo_vyrobe' })
          .eq('id', Number(id));
      }
    },
    onSuccess: () => {
      toast.success('Práca začatá');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
    onError: (err) => {
      console.error('Direct start error:', err);
      toast.error('Chyba pri začatí práce');
    },
  });

  // Direct finish mutation for doplnkova_sluzba (no weighing, no production_log)
  const directFinishMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.rpc('update_order_item_work_fields', {
        _item_id: itemId,
        _work_status: 'completed',
      });
      if (error) throw error;

      const allItems = order?.order_items || [];
      const otherItemsCompleted = allItems
        .filter(item => item.id !== itemId)
        .every(item => item.work_status === 'completed');

      if (otherItemsCompleted) {
        await supabase
          .from('orders')
          .update({ status: 'ukoncene' })
          .eq('id', Number(id));
      }
    },
    onSuccess: () => {
      toast.success('Práca dokončená');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
    onError: (err) => {
      console.error('Direct finish error:', err);
      toast.error('Chyba pri dokončení práce');
    },
  });

  const handleStartWork = (item: OrderItem & { color: Color | null }) => {
    // Doplnková služba: skip weighing dialog, directly start
    if (item.item_type === 'doplnkova_sluzba') {
      directStartMutation.mutate(item.id);
      return;
    }

    // Check for matching pending items with same color
    if (item.color && order?.order_items) {
      const itemColorKey = getColorKey(item);
      const matchingPending = (order.order_items as (OrderItem & { color: Color | null })[]).filter(
        other => other.id !== item.id &&
          (other.work_status === 'pending' || !other.work_status) &&
          getColorKey(other) === itemColorKey &&
          getWorkflowConstraint(order.order_items as OrderItem[], other.id).canStart
      );
      if (matchingPending.length > 0) {
        setBatchSuggestion({ triggerItem: item, matchingItems: matchingPending });
        return;
      }
    }
    setSelectedItem(item);
    setStartWorkDialog(true);
  };

  const handleFinishWork = (item: OrderItem & { color: Color | null }) => {
    // Doplnková služba: skip weighing dialog, directly finish
    if (item.item_type === 'doplnkova_sluzba') {
      directFinishMutation.mutate(item.id);
      return;
    }

    // If item has batch_group_id, enforce batch finish
    if (item.batch_group_id && order?.order_items) {
      const batchItems = (order.order_items as (OrderItem & { color: Color | null })[]).filter(
        other => other.batch_group_id === item.batch_group_id
      );
      if (batchItems.length > 1) {
        setSelectedBatchItems(new Set(batchItems.map(i => i.id)));
        setBatchFinishDialog(true);
        return;
      }
    }
    setSelectedItem(item);
    setFinishWorkDialog(true);
  };

  const toggleBatchItem = (itemId: string) => {
    setSelectedBatchItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const getWorkStatusBadge = (status: WorkStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-muted">{WORK_STATUS_LABELS[status]}</Badge>;
      case 'in_progress':
        return <Badge className="bg-accent text-accent-foreground">{WORK_STATUS_LABELS[status]}</Badge>;
      case 'completed':
        return <Badge className="bg-success text-success-foreground">{WORK_STATUS_LABELS[status]}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span>Načítavam zákazku...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!order) {
    return (
      <MainLayout>
        <div className="text-center">
          <p>Zákazka nenájdená</p>
          <Button onClick={() => navigate('/zakazky')} className="mt-4">
            Späť na zákazky
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/zakazky')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Zákazka #{order.id}
              </h1>
              <p className="text-muted-foreground">
                {new Date(order.created_at).toLocaleDateString('sk-SK')}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigate(`/zakazky/${prevId}`)}
                disabled={!prevId}
                title="Predchádzajúca zákazka"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigate(`/zakazky/${nextId}`)}
                disabled={!nextId}
                title="Nasledujúca zákazka"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`status-${order.status} text-base px-4 py-1`}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>

            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setEditOrderDialog(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Upraviť zákazku
              </Button>
            )}
            
            {isAdmin && (
              <Select value={order.status} onValueChange={(v) => updateStatusMutation.mutate(v as OrderStatus)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Protokoly
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/zakazky/${id}/protokol/prijimaci`)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Prijímací protokol
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/zakazky/${id}/protokol/odovzdavaci`)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Odovzdávací protokol
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  const url = `${window.location.origin}/status/${id}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Link skopírovaný', { description: 'Verejný sledovací odkaz bol skopírovaný do schránky' });
                }}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Kopírovať sledovací odkaz
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Vymazať zákazku
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Firma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{order.company?.name || '—'}</p>
              {order.company?.is_vat_payer && (
                <Badge className="mt-1 bg-success text-success-foreground">Platca DPH</Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Zákazník
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{order.customer?.name || 'Bez zákazníka'}</p>
              {order.customer?.phone && (
                <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Banknote className="h-4 w-4" />
                Platba
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.status !== 'odovzdane' ? (
                <Select
                  value={order.payment_method}
                  onValueChange={(v) => updatePaymentMethodMutation.mutate(v)}
                  disabled={updatePaymentMethodMutation.isPending}
                >
                  <SelectTrigger className="h-8 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-semibold">{PAYMENT_METHOD_LABELS[order.payment_method]}</p>
              )}
              <Badge 
                className={cn(
                  "mt-1",
                  order.is_paid 
                    ? "bg-success text-success-foreground" 
                    : "bg-destructive/10 text-destructive border-destructive/20"
                )}
                variant={order.is_paid ? "default" : "outline"}
              >
                {order.is_paid ? 'Zaplatené' : 'Nezaplatené'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Poznámky
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {order.notes || 'Žiadne poznámky'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Controls */}
        {hasItems && (
          <Card className={cn(
            "border-2",
            order.status === 'prijate' && "border-primary bg-primary/5",
            order.status === 'vo_vyrobe' && "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
            order.status === 'ukoncene' && "border-success bg-success/5"
          )}>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Stav zákazky</h3>
                  <p className="text-sm text-muted-foreground">
                    {order.status === 'prijate' && 'Zákazka je prijatá a čaká na spracovanie'}
                    {order.status === 'vo_vyrobe' && `${allItemsCompleted ? 'Všetky položky dokončené!' : `Rozpracované: ${order.order_items?.filter(i => i.work_status === 'completed').length}/${order.order_items?.length}`}`}
                    {order.status === 'ukoncene' && 'Práce dokončené, pripravené na odovzdanie'}
                    {order.status === 'odovzdane' && 'Zákazka odovzdaná zákazníkovi'}
                  </p>
                </div>
                
                <div className="flex flex-col gap-2 sm:flex-row">
                  {order.status === 'prijate' && anyItemPending && (
                    <p className="text-sm text-muted-foreground italic">
                      Začnite prácu na jednotlivých položkách nižšie
                    </p>
                  )}
                  
                  {order.status === 'vo_vyrobe' && allItemsCompleted && allItemsHaveConsumption && (
                    <Button
                      size="lg"
                      className="min-h-[56px] bg-success text-success-foreground hover:bg-success/90 text-lg px-8"
                      onClick={() => completeOrderMutation.mutate()}
                      disabled={completeOrderMutation.isPending}
                    >
                      <CheckCircle2 className="mr-2 h-6 w-6" />
                      Dokončiť zákazku
                    </Button>
                  )}

                  {order.status === 'vo_vyrobe' && allItemsCompleted && !allItemsHaveConsumption && (
                    <div className="text-sm text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Nie všetky položky majú zaznamenanú spotrebu
                    </div>
                  )}
                  
                  {order.status === 'vo_vyrobe' && !allItemsCompleted && (
                    <div className="text-sm text-warning flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Dokončite všetky položky pred ukončením zákazky
                    </div>
                  )}
                  
                  {order.status === 'ukoncene' && (
                    <Button
                      size="lg"
                      className="min-h-[56px] bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8"
                      onClick={() => setHandoverDialogOpen(true)}
                    >
                      <PackageCheck className="mr-2 h-6 w-6" />
                      Odovzdať zákazníkovi
                    </Button>
                  )}
                </div>
              </div>
              
              {order.status === 'ukoncene' && isCashPayment && (
                <div className="mt-4 p-4 rounded-lg bg-destructive/10 border-2 border-destructive flex items-start gap-3">
                  <Banknote className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-destructive text-lg">POZOR! Platba {PAYMENT_METHOD_LABELS[order.payment_method]}</p>
                    <p className="text-destructive">Vytlačte pokladničný blok pred odovzdaním zákazky!</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Batch action bar */}
        {selectedBatchItems.size >= 2 && (
          <Card className="border-2 border-accent bg-accent/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  <span className="font-medium">{selectedBatchItems.size} položiek vybraných</span>
                  {!batchColorKey && (
                    <Badge variant="destructive" className="text-xs">Rôzne farby!</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {canBatchStart && (
                    <Button
                      className="bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={() => setBatchStartDialog(true)}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Hromadne začať
                    </Button>
                  )}
                  {canBatchFinish && (
                    <Button
                      className="bg-success text-success-foreground hover:bg-success/90"
                      onClick={() => setBatchFinishDialog(true)}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Hromadne dokončiť
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedBatchItems(new Set())}
                  >
                    Zrušiť výber
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Položky zákazky</CardTitle>
                  <CardDescription>
                    {order.order_items?.length || 0} položiek
                  </CardDescription>
                </div>
                {order.status !== 'odovzdane' && (
                  <Button 
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => setAddItemDialog(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Pridať položku
                  </Button>
                )}
              </div>
              
              {order.order_items && order.order_items.length > 0 && (
                <WorkflowProgress items={order.order_items as OrderItem[]} />
              )}
            </div>
          </CardHeader>
          <CardContent>
          {order.order_items && order.order_items.length > 0 ? (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="w-16">Číslo</TableHead>
                    <TableHead>Popis</TableHead>
                    <TableHead>Farba</TableHead>
                    <TableHead className="text-right">Množstvo</TableHead>
                    <TableHead className="text-center">Stav</TableHead>
                    {isAdmin && <TableHead className="text-right">Cena</TableHead>}
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...order.order_items].sort((a, b) => {
                    const numA = a.global_production_number ?? Infinity;
                    const numB = b.global_production_number ?? Infinity;
                    if (numA !== numB) return numA - numB;
                    if (a.item_type === 'zaklad' && b.item_type !== 'zaklad') return -1;
                    if (a.item_type !== 'zaklad' && b.item_type === 'zaklad') return 1;
                    return 0;
                  }).map((item) => {
                    const isBaseCoat = item.item_type === 'zaklad';
                    const isSelectable = (item.work_status === 'pending' || !item.work_status || item.work_status === 'in_progress');
                    return (
                    <TableRow key={item.id} className={cn(
                      isBaseCoat ? 'bg-destructive/10' : '',
                      selectedBatchItems.has(item.id) ? 'bg-accent/10' : ''
                    )}>
                      <TableCell>
                        {isSelectable && (
                          <Checkbox
                            checked={selectedBatchItems.has(item.id)}
                            onCheckedChange={() => toggleBatchItem(item.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-lg text-primary">
                        {item.global_production_number || '—'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className={`font-medium ${isBaseCoat ? 'text-destructive' : ''}`}>
                            {isBaseCoat && (
                              <span className="inline-flex items-center justify-center bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded mr-2 font-bold">
                                ZÁKLAD
                              </span>
                            )}
                            {item.item_type && ORDER_ITEM_TYPE_LABELS[item.item_type]}
                            {item.price_list && ` (${ITEM_TYPE_LABELS[item.price_list.item_type]})`}
                          </p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                          {item.is_rework && (
                            <Badge variant="destructive" className="mt-1">Oprava</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.color ? (
                          <div className="flex items-center gap-2">
                            <div
                            className="h-6 w-6 rounded border border-border shadow-sm flex-shrink-0"
                              style={{ backgroundColor: item.color.hex_code || '#808080' }}
                            />
                            <div>
                              <p className="font-mono font-bold">{formatRALWithName(item.color.ral_code, item.color.color_name)}</p>
                              {item.color.ral_code !== 'ZAKLAD' && (
                                <p className="text-xs text-muted-foreground">
                                  {STRUCTURE_TYPE_LABELS[item.color.structure]} / {GLOSS_TYPE_LABELS[item.color.gloss]}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {(item as any).unit === 'ks'
                          ? `${Number(item.area_m2)} ks`
                          : `${Number(item.area_m2).toFixed(2)} m²`}
                      </TableCell>
                      <TableCell className="text-center">
                        {getWorkStatusBadge(item.work_status || 'pending')}
                        {item.batch_group_id && (
                          <Badge variant="outline" className="mt-1 text-xs border-accent text-accent">
                            <Users className="mr-1 h-3 w-3" />
                            Batch
                          </Badge>
                        )}
                        {item.work_status === 'in_progress' && item.weight_before_temp && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Váha pred: {Number(item.weight_before_temp).toFixed(3)} kg
                          </p>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right font-mono">
                          {item.is_rework ? (
                            '0.00 €'
                          ) : (() => {
                            const discountPct = Number((item as any).discount_percent || 0);
                            const stdPrice = Number(item.area_m2) * Number(item.price_per_m2);
                            const hasDiscount = discountPct > 0;
                            return (
                              <div>
                                {hasDiscount && (
                                  <p className="text-xs text-muted-foreground line-through">
                                    {stdPrice.toFixed(2)} €
                                  </p>
                                )}
                                <div className="flex items-center justify-end gap-1">
                                  {hasDiscount && (
                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                      -{discountPct.toFixed(1)}%
                                    </Badge>
                                  )}
                                  <span>{Number(item.total_price).toFixed(2)} €</span>
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                      )}
                      <TableCell className="space-x-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          {isAdmin && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-10 w-10"
                                    onClick={() => setEditingItem(item as OrderItem & { color: Color | null; price_list: PriceListItem | null })}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Upraviť položku</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      setItemToDelete(item as OrderItem & { color: Color | null });
                                      setDeleteItemDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Vymazať položku</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          {(item.work_status === 'pending' || !item.work_status) && (() => {
                            const constraint = getWorkflowConstraint(order.order_items as OrderItem[], item.id);
                            return constraint.canStart ? (
                              <Button 
                                size="lg" 
                                className={cn(
                                  "h-12 min-h-[48px]",
                                  isBaseCoat 
                                    ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
                                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                                )}
                                onClick={() => handleStartWork(item as OrderItem & { color: Color | null })}
                              >
                                <Play className="mr-2 h-5 w-5" />
                                Začať prácu
                              </Button>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="lg" 
                                    variant="outline"
                                    className="h-12 min-h-[48px] opacity-50 cursor-not-allowed"
                                    disabled
                                  >
                                    <Lock className="mr-2 h-5 w-5" />
                                    Blokované
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[200px]">
                                  <p>{constraint.reason}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
                          {item.work_status === 'in_progress' && (
                            <Button 
                              size="lg" 
                              className="h-12 min-h-[48px] bg-success text-success-foreground hover:bg-success/90"
                              onClick={() => handleFinishWork(item as OrderItem & { color: Color | null })}
                            >
                              <CheckCircle2 className="mr-2 h-5 w-5" />
                              Dokončiť
                            </Button>
                          )}
                          {item.work_status === 'completed' && (
                            <Badge className="bg-success/10 text-success border-success px-4 py-2">
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Hotové
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Žiadne položky. Kliknite na "Pridať položku" pre pridanie.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Item Dialog */}
        <AddOrderItemDialog
          orderId={order.id}
          isVatPayer={order.company?.is_vat_payer || false}
          open={addItemDialog}
          onOpenChange={setAddItemDialog}
          isAdmin={isAdmin}
        />

        {/* Edit Item Dialog (Admin only) */}
        {editingItem && (
          <EditOrderItemDialog
            item={editingItem}
            orderId={order.id}
            isVatPayer={order.company?.is_vat_payer || false}
            paymentMethod={order.payment_method}
            open={!!editingItem}
            onOpenChange={(open) => { if (!open) setEditingItem(null); }}
          />
        )}

        {/* Start Work Dialog */}
        {selectedItem && (
          <StartWorkDialog
            open={startWorkDialog}
            onOpenChange={setStartWorkDialog}
            color={selectedItem.color}
            stockWeight={selectedItem.color ? Number(selectedItem.color.stock_kg) : null}
            onConfirm={(weightBefore) => startWorkMutation.mutate({ itemId: selectedItem.id, weightBefore })}
            isPending={startWorkMutation.isPending}
          />
        )}

        {/* Finish Work Dialog */}
        {selectedItem && selectedItem.weight_before_temp && (
          <FinishWorkDialog
            open={finishWorkDialog}
            onOpenChange={setFinishWorkDialog}
            color={selectedItem.color}
            weightBefore={Number(selectedItem.weight_before_temp)}
            onConfirm={(weightAfter) => finishWorkMutation.mutate({ 
              itemId: selectedItem.id, 
              weightBefore: Number(selectedItem.weight_before_temp),
              weightAfter 
            })}
            isPending={finishWorkMutation.isPending}
          />
        )}

        {/* Batch Start Dialog */}
        {selectedBatchItemsArray.length > 0 && (
          <BatchWorkDialog
            open={batchStartDialog}
            onOpenChange={setBatchStartDialog}
            items={selectedBatchItemsArray}
            mode="start"
            onConfirmStart={(w) => batchStartMutation.mutate(w)}
            isPending={batchStartMutation.isPending}
            stockWeight={selectedBatchItemsArray[0]?.color ? Number(selectedBatchItemsArray[0].color.stock_kg) : null}
          />
        )}

        {/* Batch Finish Dialog */}
        {selectedBatchItemsArray.length > 0 && (
          <BatchWorkDialog
            open={batchFinishDialog}
            onOpenChange={setBatchFinishDialog}
            items={selectedBatchItemsArray}
            mode="finish"
            onConfirmFinish={(w) => batchFinishMutation.mutate(w)}
            isPending={batchFinishMutation.isPending}
          />
        )}

        {/* Batch Suggestion Alert */}
        <BatchSuggestionAlert
          open={!!batchSuggestion}
          onOpenChange={(open) => { if (!open) setBatchSuggestion(null); }}
          triggerItem={batchSuggestion?.triggerItem || null}
          matchingItems={batchSuggestion?.matchingItems || []}
          onBatch={() => {
            if (batchSuggestion) {
              const allIds = [batchSuggestion.triggerItem!.id, ...batchSuggestion.matchingItems.map(i => i.id)];
              setSelectedBatchItems(new Set(allIds));
              setBatchSuggestion(null);
              setBatchStartDialog(true);
            }
          }}
          onIndividual={() => {
            if (batchSuggestion) {
              const item = batchSuggestion.triggerItem!;
              setBatchSuggestion(null);
              setSelectedItem(item);
              setStartWorkDialog(true);
            }
          }}
        />


        {isAdmin && totalRealConsumption > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Porovnanie spotreby farby</CardTitle>
              <CardDescription>Odhadovaná vs reálna spotreba</CardDescription>
            </CardHeader>
            <CardContent>
              <ConsumptionComparison
                estimatedKg={totalEstimatedConsumption}
                realKg={totalRealConsumption}
              />
            </CardContent>
          </Card>
        )}

        {/* Price Summary (Admin Only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Cenový súhrn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {totalDiscount > 0 ? (
                  <>
                    <div className="flex justify-between text-lg">
                      <span>Cenník (bez zľavy):</span>
                      <span className="font-mono">{totalStandardPrice.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-lg text-destructive">
                      <span>Zľava:</span>
                      <span className="font-mono">-{totalDiscount.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-lg border-t pt-2">
                      <span>Základ (po zľave):</span>
                      <span className="font-mono">{totalPrice.toFixed(2)} €</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-lg">
                    <span>Základ:</span>
                    <span className="font-mono">{totalPrice.toFixed(2)} €</span>
                  </div>
                )}
                {order.company?.is_vat_payer && (
                  <div className="flex justify-between text-lg">
                    <span>DPH ({vatPercent}%):</span>
                    <span className="font-mono">{vatAmount.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-xl font-bold">
                  <span>Celkom:</span>
                  <span className="font-mono">{(totalPrice + vatAmount).toFixed(2)} €</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Order Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Vymazať zákazku #{order.id}?</AlertDialogTitle>
              <AlertDialogDescription>
                Táto akcia je nevratná. Zákazka a všetky jej položky budú natrvalo vymazané.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušiť</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteOrderMutation.mutate()}
                disabled={deleteOrderMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteOrderMutation.isPending ? 'Mažem...' : 'Vymazať'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Handover Dialog */}
        <AlertDialog 
          open={handoverDialogOpen} 
          onOpenChange={(open) => {
            setHandoverDialogOpen(open);
            if (!open) setMarkAsPaid(true);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5" />
                Odovzdať zákazku #{order.id}?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>Potvrďte odovzdanie zákazky zákazníkovi.</p>
                  
                  {isCashPayment && (
                    <>
                      <div className="p-4 rounded-lg bg-destructive/10 border-2 border-destructive">
                        <div className="flex items-start gap-3">
                          <Banknote className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-destructive">POZOR! Platba {PAYMENT_METHOD_LABELS[order.payment_method]}</p>
                            <p className="text-destructive text-sm">Uistite sa, že máte vytlačený pokladničný blok!</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-4 rounded-lg bg-success/10 border border-success/30">
                        <Checkbox
                          id="mark-paid"
                          checked={markAsPaid}
                          onCheckedChange={(checked) => setMarkAsPaid(checked === true)}
                          className="mt-0.5 border-success data-[state=checked]:bg-success data-[state=checked]:text-success-foreground"
                        />
                        <div className="grid gap-1">
                          <Label htmlFor="mark-paid" className="font-semibold text-success cursor-pointer">
                            Zákazka zaplatená
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Označiť zákazku ako zaplatenú pri odovzdaní
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-foreground">
                      <strong>Zákazník:</strong> {order.customer?.name || 'Bez zákazníka'}
                    </p>
                    <p className="text-sm text-foreground">
                      <strong>Celková suma:</strong> {(totalPrice + vatAmount).toFixed(2)} €
                      {order.company?.is_vat_payer && ' (vrátane DPH)'}
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušiť</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const isPaid = isCashPayment ? markAsPaid : (order.is_paid ?? false);
                  handoverMutation.mutate(isPaid);
                  // Navigation moved to onSuccess to avoid race condition
                }}
                disabled={handoverMutation.isPending}
                className="bg-success text-success-foreground hover:bg-success/90"
              >
                {handoverMutation.isPending ? 'Spracovávam...' : 'Odovzdať a vytlačiť protokol'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {isAdmin && (
          <EditOrderDetailsDialog
            order={order as Order}
            open={editOrderDialog}
            onOpenChange={setEditOrderDialog}
          />
        )}

        {/* Delete item confirmation dialog */}
        <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Vymazať položku zákazky?</AlertDialogTitle>
              <AlertDialogDescription>
                Táto akcia je nevratná. Naozaj chcete vymazať položku{' '}
                {itemToDelete && (
                  <strong>
                    #{itemToDelete.global_production_number} – {itemToDelete.item_type && ORDER_ITEM_TYPE_LABELS[itemToDelete.item_type]}
                  </strong>
                )}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušiť</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => itemToDelete && deleteOrderItemMutation.mutate(itemToDelete.id)}
                disabled={deleteOrderItemMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteOrderItemMutation.isPending ? 'Mažem...' : 'Vymazať'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
