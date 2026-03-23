import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { ITEM_TYPE_LABELS, ORDER_ITEM_TYPE_LABELS } from '@/lib/types';
import type { PriceListItem, OrderItemType, OrderItem, Color } from '@/lib/types';
import { SmartColorPicker } from './SmartColorPicker';
import { Badge } from '@/components/ui/badge';
import { Calculator, ChevronDown, Tag, AlertCircle } from 'lucide-react';

const DISK_PRICE_PER_PIECE = 50;
const ZAKLAD_PRICE_PER_M2 = 4;

interface EditOrderItemDialogProps {
  item: OrderItem & { color: Color | null; price_list: PriceListItem | null };
  orderId: number;
  isVatPayer: boolean;
  paymentMethod?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditOrderItemDialog({ item, orderId, isVatPayer, paymentMethod, open, onOpenChange }: EditOrderItemDialogProps) {
  const queryClient = useQueryClient();
  const [showCalculator, setShowCalculator] = useState(false);

  const [formData, setFormData] = useState({
    item_type: (item.item_type || 'standard') as OrderItemType,
    price_list_id: item.price_list_id || '',
    color_id: item.color_id || '',
    description: item.description || '',
    area_m2: ['disky', 'ine', 'doplnkova_sluzba'].includes(item.item_type || '') ? '' : String(Number(item.area_m2)),
    is_rework: item.is_rework || false,
    disk_count: ['disky', 'ine', 'doplnkova_sluzba'].includes(item.item_type || '') ? String(Number(item.area_m2)) : '1',
    discount_percent: String(Number((item as any).discount_percent || 0)),
    unit_price: String(Number(item.price_per_m2 || 0)),
  });

  const [calcData, setCalcData] = useState({
    length: '',
    width: '',
    height: '',
    count: '1',
    isBothSides: false,
  });

  // Reset form when item changes
  useEffect(() => {
    setFormData({
      item_type: (item.item_type || 'standard') as OrderItemType,
      price_list_id: item.price_list_id || '',
      color_id: item.color_id || '',
      description: item.description || '',
      area_m2: ['disky', 'ine', 'doplnkova_sluzba'].includes(item.item_type || '') ? '' : String(Number(item.area_m2)),
      is_rework: item.is_rework || false,
      disk_count: ['disky', 'ine', 'doplnkova_sluzba'].includes(item.item_type || '') ? String(Number(item.area_m2)) : '1',
      discount_percent: String(Number((item as any).discount_percent || 0)),
      unit_price: String(Number(item.price_per_m2 || 0)),
    });
    setShowCalculator(false);
    setCalcData({ length: '', width: '', height: '', count: '1', isBothSides: false });
  }, [item.id]);

  const { data: priceList } = useQuery({
    queryKey: ['price_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('price_list').select('*');
      if (error) throw error;
      return data as PriceListItem[];
    },
  });

  const selectedPriceItem = priceList?.find((p) => p.id === formData.price_list_id);

  const calculatedArea = useMemo(() => {
    const length = parseFloat(calcData.length);
    const width = parseFloat(calcData.width);
    const height = parseFloat(calcData.height);
    const count = parseInt(calcData.count) || 1;

    if (formData.item_type === 'disky') return 0;

    if (formData.item_type === 'stlp') {
      if (isNaN(width) || isNaN(height) || isNaN(length)) return 0;
      const perimeter = (width + height) * 2;
      return (perimeter / 1000) * (length / 1000) * count;
    }

    if (isNaN(length) || isNaN(width)) return 0;
    let area = (length / 1000) * (width / 1000) * count;
    if (calcData.isBothSides) area *= 2;
    return area;
  }, [calcData, formData.item_type]);

  const calculatePrice = (area: number, isRework: boolean, itemType?: string) => {
    if (isRework) return 0;
    if (paymentMethod === 'interne') return 0;

    const type = itemType || formData.item_type;

    if (type === 'disky') {
      return (parseInt(formData.disk_count) || 1) * DISK_PRICE_PER_PIECE;
    }

    if (type === 'ine' || type === 'doplnkova_sluzba') {
      const unitPrice = parseFloat(formData.unit_price) || 0;
      const qty = parseInt(formData.disk_count) || 1;
      return unitPrice * qty;
    }

    if (type === 'zaklad') {
      return area * ZAKLAD_PRICE_PER_M2;
    }

    if (!selectedPriceItem || isNaN(area) || area <= 0) return 0;
    return area * Number(selectedPriceItem.price_per_m2);
  };

  const updateItemMutation = useMutation({
    mutationFn: async () => {
      const area = ['disky', 'ine', 'doplnkova_sluzba'].includes(formData.item_type) ? 0 : parseFloat(formData.area_m2);
      const pcsCount = parseInt(formData.disk_count) || 1;

      if (['ine', 'doplnkova_sluzba'].includes(formData.item_type)) {
        const unitPrice = parseFloat(formData.unit_price) || 0;
        if (unitPrice <= 0 || pcsCount <= 0) throw new Error('Zadajte platnú cenu a počet');
        if (formData.item_type === 'doplnkova_sluzba' && !formData.description.trim()) throw new Error('Zadajte popis služby');
      } else if (formData.item_type !== 'disky' && (isNaN(area) || area <= 0)) {
        throw new Error('Zadajte platnú plochu');
      }

      if (!['disky', 'ine', 'doplnkova_sluzba', 'zaklad'].includes(formData.item_type) && !formData.price_list_id) {
        throw new Error('Vyberte cenník');
      }

      const standardPrice = calculatePrice(area, formData.is_rework);
      const discountPct = Math.min(100, Math.max(0, parseFloat(formData.discount_percent) || 0));
      const totalPrice = standardPrice * (1 - discountPct / 100);
      
      const unitPrice = parseFloat(formData.unit_price) || 0;
      const pricePerM2 = formData.item_type === 'disky'
        ? DISK_PRICE_PER_PIECE
        : ['ine', 'doplnkova_sluzba'].includes(formData.item_type)
          ? unitPrice
          : formData.item_type === 'zaklad'
            ? ZAKLAD_PRICE_PER_M2
            : (selectedPriceItem ? Number(selectedPriceItem.price_per_m2) : 0);

      const { error } = await supabase
        .from('order_items')
        .update({
          description: formData.description || null,
          color_id: formData.item_type === 'doplnkova_sluzba' ? null : (formData.color_id || null),
          area_m2: ['disky', 'ine', 'doplnkova_sluzba'].includes(formData.item_type) ? pcsCount : area,
          price_list_id: ['disky', 'ine', 'doplnkova_sluzba'].includes(formData.item_type) ? null : (formData.price_list_id || null),
          item_type: formData.item_type,
          price_per_m2: pricePerM2,
          total_price: totalPrice,
          is_rework: formData.is_rework,
          discount_percent: discountPct,
        } as any)
        .eq('id', item.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Položka aktualizovaná');
      queryClient.invalidateQueries({ queryKey: ['order', String(orderId)] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const colorRequired = !['disky', 'ine', 'doplnkova_sluzba', 'zaklad'].includes(formData.item_type);

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (formData.item_type === 'disky') {
      if ((parseInt(formData.disk_count) || 0) <= 0) errors.push('Zadajte počet diskov');
      return errors;
    }
    if (formData.item_type === 'ine') {
      if ((parseFloat(formData.unit_price) || 0) <= 0) errors.push('Zadajte cenu za kus (€)');
      if ((parseInt(formData.disk_count) || 0) <= 0) errors.push('Zadajte počet kusov');
      return errors;
    }
    if (formData.item_type === 'doplnkova_sluzba') {
      if ((parseFloat(formData.unit_price) || 0) <= 0) errors.push('Zadajte cenu za kus (€)');
      if ((parseInt(formData.disk_count) || 0) <= 0) errors.push('Zadajte počet kusov');
      if (!formData.description.trim()) errors.push('Zadajte popis služby');
      return errors;
    }
    if (formData.item_type === 'zaklad') {
      if (!formData.area_m2 || parseFloat(formData.area_m2) <= 0) errors.push('Zadajte plochu (m²)');
      return errors;
    }
    if (!formData.price_list_id) errors.push('Vyberte typ cenníka');
    if (!formData.area_m2 || parseFloat(formData.area_m2) <= 0) errors.push('Zadajte plochu (m²)');
    if (colorRequired && !formData.color_id) errors.push('Vyberte farbu');
    return errors;
  };

  const isFormValid = () => getValidationErrors().length === 0;

  const renderCalculator = () => {
    if (formData.item_type === 'disky') {
      return (
        <div className="p-4 rounded-lg border border-border bg-muted/50 space-y-4 mb-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Počet diskov</Label>
            <Input
              type="number"
              min="1"
              value={formData.disk_count}
              onChange={(e) => setFormData({ ...formData, disk_count: e.target.value })}
              placeholder="1"
              className="font-mono h-12 text-lg"
            />
          </div>
          <div className="text-center p-3 bg-accent/10 rounded-lg">
            <p className="text-sm text-muted-foreground">Fixná cena</p>
            <p className="text-2xl font-bold font-mono">
              {(parseInt(formData.disk_count) || 1) * DISK_PRICE_PER_PIECE} €
            </p>
          </div>
        </div>
      );
    }

    if (formData.item_type === 'stlp') {
      return (
        <div className="p-4 rounded-lg border border-border bg-muted/50 space-y-4 mb-3">
          <p className="text-xs text-muted-foreground">Vzorec: (Strana A + Strana B) × 2 × Výška × Počet</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Strana A (mm)</Label>
              <Input type="number" value={calcData.width} onChange={(e) => setCalcData({ ...calcData, width: e.target.value })} className="font-mono h-12 text-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Strana B (mm)</Label>
              <Input type="number" value={calcData.height} onChange={(e) => setCalcData({ ...calcData, height: e.target.value })} className="font-mono h-12 text-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Výška (mm)</Label>
              <Input type="number" value={calcData.length} onChange={(e) => setCalcData({ ...calcData, length: e.target.value })} className="font-mono h-12 text-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Počet ks</Label>
              <Input type="number" min="1" value={calcData.count} onChange={(e) => setCalcData({ ...calcData, count: e.target.value })} className="font-mono h-12 text-lg" />
            </div>
          </div>
          <Button type="button" variant="secondary" size="sm" className="w-full"
            onClick={() => { if (calculatedArea > 0) setFormData({ ...formData, area_m2: calculatedArea.toFixed(4) }); }}
            disabled={calculatedArea <= 0}
          >
            Použiť: {calculatedArea.toFixed(4)} m²
          </Button>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-lg border border-border bg-muted/50 space-y-4 mb-3">
        <p className="text-xs text-muted-foreground">Vzorec: Dĺžka × Šírka × Počet</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Dĺžka (mm)</Label>
            <Input type="number" value={calcData.length} onChange={(e) => setCalcData({ ...calcData, length: e.target.value })} className="font-mono h-12 text-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Šírka (mm)</Label>
            <Input type="number" value={calcData.width} onChange={(e) => setCalcData({ ...calcData, width: e.target.value })} className="font-mono h-12 text-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Počet ks</Label>
            <Input type="number" min="1" value={calcData.count} onChange={(e) => setCalcData({ ...calcData, count: e.target.value })} className="font-mono h-12 text-lg" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox id="edit-calc-both-sides" checked={calcData.isBothSides}
              onCheckedChange={(checked) => setCalcData({ ...calcData, isBothSides: checked as boolean })}
            />
            <Label htmlFor="edit-calc-both-sides" className="cursor-pointer text-sm">Obojstranne (×2)</Label>
          </div>
          <Button type="button" variant="secondary" size="sm"
            onClick={() => { if (calculatedArea > 0) setFormData({ ...formData, area_m2: calculatedArea.toFixed(4) }); }}
            disabled={calculatedArea <= 0}
          >
            Použiť: {calculatedArea.toFixed(4)} m²
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upraviť položku</DialogTitle>
          <DialogDescription>
            Upravte údaje položky zákazky #{orderId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item Type */}
          <div className="space-y-2">
            <Label>Typ položky *</Label>
            <Select
              value={formData.item_type}
              onValueChange={(v) => {
                setFormData({ ...formData, item_type: v as OrderItemType, area_m2: '', });
                setCalcData({ length: '', width: '', height: '', count: '1', isBothSides: false });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Štandard</SelectItem>
                <SelectItem value="lamely_sito">Lamely / Sito</SelectItem>
                <SelectItem value="stlp">Stĺp</SelectItem>
                <SelectItem value="disky">Disky kolies (50 €/ks)</SelectItem>
                <SelectItem value="ine">Iné (vlastná cena)</SelectItem>
                <SelectItem value="doplnkova_sluzba">Doplnková služba</SelectItem>
                <SelectItem value="zaklad">Základ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price list - not for disks or zaklad */}
           {!['disky', 'ine', 'doplnkova_sluzba'].includes(formData.item_type) && formData.item_type !== 'zaklad' && (
            <div className="space-y-2">
              <Label>Cenník *</Label>
              <Select
                value={formData.price_list_id}
                onValueChange={(v) => setFormData({ ...formData, price_list_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte cenník" />
                </SelectTrigger>
                <SelectContent>
                  {priceList?.map((pl) => (
                    <SelectItem key={pl.id} value={pl.id}>
                      {ITEM_TYPE_LABELS[pl.item_type]} - {Number(pl.price_per_m2).toFixed(2)} €/m²
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Color picker - not for doplnkova_sluzba */}
          {formData.item_type !== 'doplnkova_sluzba' && (
            <SmartColorPicker
              value={formData.color_id}
              onChange={(colorId) => setFormData({ ...formData, color_id: colorId })}
            />
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Popis (voliteľné)</Label>
            <Input
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Napr. brána, plotové dielce..."
            />
          </div>

          {/* "Iné" type: unit price + quantity */}
          {formData.item_type === 'ine' && (
            <div className="p-4 rounded-lg border border-border bg-muted/50 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Cena za ks (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    placeholder="0.00"
                    className="font-mono h-12 text-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Počet ks</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.disk_count}
                    onChange={(e) => setFormData({ ...formData, disk_count: e.target.value })}
                    placeholder="1"
                    className="font-mono h-12 text-lg"
                  />
                </div>
              </div>
              <div className="text-center p-3 bg-accent/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Celková cena</p>
                <p className="text-2xl font-bold font-mono">
                  {((parseFloat(formData.unit_price) || 0) * (parseInt(formData.disk_count) || 1)).toFixed(2)} €
                </p>
              </div>
            </div>
          )}

          {/* "Doplnková služba" type: unit price + quantity */}
          {formData.item_type === 'doplnkova_sluzba' && (
            <div className="p-4 rounded-lg border border-border bg-muted/50 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Cena za ks (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    placeholder="0.00"
                    className="font-mono h-12 text-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Počet ks</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.disk_count}
                    onChange={(e) => setFormData({ ...formData, disk_count: e.target.value })}
                    placeholder="1"
                    className="font-mono h-12 text-lg"
                  />
                </div>
              </div>
              <div className="text-center p-3 bg-accent/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Celková cena</p>
                <p className="text-2xl font-bold font-mono">
                  {((parseFloat(formData.unit_price) || 0) * (parseInt(formData.disk_count) || 1)).toFixed(2)} €
                </p>
              </div>
            </div>
          )}

          {/* Area calculator - not for ine or doplnkova_sluzba */}
          {!['ine', 'doplnkova_sluzba'].includes(formData.item_type) && formData.item_type !== 'disky' && (
            <Collapsible open={showCalculator} onOpenChange={setShowCalculator}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Kalkulačka plochy
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showCalculator ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                {renderCalculator()}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Area / Disk count - not for doplnkova_sluzba */}
          {formData.item_type !== 'doplnkova_sluzba' && (
            formData.item_type === 'disky' ? (
              renderCalculator()
            ) : (
              <div className="space-y-2">
                <Label htmlFor="edit-area">Plocha (m²) *</Label>
                <Input
                  id="edit-area"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formData.area_m2}
                  onChange={(e) => setFormData({ ...formData, area_m2: e.target.value })}
                  placeholder="0.0000"
                  className="font-mono h-12 text-lg"
                />
              </div>
            )
          )}

          {/* Is rework */}
          <div className="flex items-center space-x-3 p-3 rounded-lg border border-border">
            <Checkbox
              id="edit-is-rework"
              checked={formData.is_rework}
              onCheckedChange={(checked) => setFormData({ ...formData, is_rework: checked as boolean })}
            />
            <Label htmlFor="edit-is-rework" className="cursor-pointer">
              Oprava (cena = 0 €)
            </Label>
          </div>

          {/* Discount section */}
          {!formData.is_rework && (
            <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Tag className="h-4 w-4" />
                Zľava
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Zľava (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.discount_percent}
                    onChange={(e) => {
                      const pct = e.target.value;
                      setFormData({ ...formData, discount_percent: pct });
                    }}
                    placeholder="0"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Zľava (EUR)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={(() => {
                      const stdPrice = calculatePrice(parseFloat(formData.area_m2) || 0, false);
                      const pct = parseFloat(formData.discount_percent) || 0;
                      if (stdPrice <= 0 || pct <= 0) return '';
                      return (stdPrice * pct / 100).toFixed(2);
                    })()}
                    onChange={(e) => {
                      const eur = parseFloat(e.target.value) || 0;
                      const stdPrice = calculatePrice(parseFloat(formData.area_m2) || 0, false);
                      if (stdPrice <= 0) return;
                      const pct = Math.min(100, Math.max(0, (eur / stdPrice) * 100));
                      setFormData({ ...formData, discount_percent: pct.toFixed(2) });
                    }}
                    placeholder="0.00"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Price preview */}
          {(() => {
            const stdPrice = calculatePrice(parseFloat(formData.area_m2) || 0, formData.is_rework);
            const discountPct = parseFloat(formData.discount_percent) || 0;
            const finalPrice = stdPrice * (1 - discountPct / 100);
            const hasDiscount = discountPct > 0 && !formData.is_rework;
            return (
              <div className="text-center p-3 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground">Cena položky</p>
                {hasDiscount && (
                  <p className="text-sm text-muted-foreground line-through font-mono">
                    {stdPrice.toFixed(2)} €
                  </p>
                )}
                <div className="flex items-center justify-center gap-2">
                  {hasDiscount && (
                    <Badge variant="destructive" className="text-xs">-{discountPct.toFixed(1)}%</Badge>
                  )}
                  <p className="text-2xl font-bold font-mono">
                    {finalPrice.toFixed(2)} €
                  </p>
                </div>
              </div>
            );
          })()}
        </div>

        {(() => {
          const errors = getValidationErrors();
          return errors.length > 0 ? (
            <div className="mx-6 mb-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-1">
              {errors.map(err => (
                <p key={err} className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  {err}
                </p>
              ))}
            </div>
          ) : null;
        })()}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušiť
          </Button>
          <Button
            onClick={() => updateItemMutation.mutate()}
            disabled={!isFormValid() || updateItemMutation.isPending}
          >
            {updateItemMutation.isPending ? 'Ukladám...' : 'Uložiť zmeny'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
