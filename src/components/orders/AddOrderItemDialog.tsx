import { useState, useMemo } from 'react';
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
import type { PriceListItem, OrderItemType } from '@/lib/types';
import { SmartColorPicker } from './SmartColorPicker';
import { Badge } from '@/components/ui/badge';
import { Calculator, ChevronDown, AlertTriangle, Tag, AlertCircle } from 'lucide-react';
import { useTenantSettings } from '@/hooks/useTenantSettings';

interface AddOrderItemDialogProps {
  orderId: number;
  isVatPayer: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
}

export function AddOrderItemDialog({ orderId, isVatPayer, open, onOpenChange, isAdmin }: AddOrderItemDialogProps) {
  const queryClient = useQueryClient();
  const { settings } = useTenantSettings();
  const DISK_PRICE_PER_PIECE = settings.disk_price_per_piece;
  const ZAKLAD_PRICE_PER_M2 = settings.zaklad_price_per_m2;

  const [showCalculator, setShowCalculator] = useState(false);
  const [unifiedType, setUnifiedType] = useState<string>('');

  const [formData, setFormData] = useState({
    item_type: 'standard' as OrderItemType,
    price_list_id: '',
    color_id: '',
    description: '',
    area_m2: '',
    is_rework: false,
    add_base_coat: false,
    disk_count: '1',
    discount_percent: '0',
    unit_price: '',
    quantity: '1',
    service_price: '',
    service_quantity: '1',
  });

  const [calcData, setCalcData] = useState({
    length: '',
    width: '',
    height: '',
    count: '1',
    isBothSides: false,
  });

  const { data: priceList } = useQuery({
    queryKey: ['price_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('price_list').select('*');
      if (error) throw error;
      return data as PriceListItem[];
    },
  });

  // Fetch the ZAKLAD color for base coat items
  const { data: zakladColor } = useQuery({
    queryKey: ['zaklad-color'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colors')
        .select('id')
        .eq('ral_code', 'ZAKLAD')
        .single();
      if (error) return null;
      return data;
    },
  });

  const selectedPriceItem = priceList?.find((p) => p.id === formData.price_list_id);

  // Calculate area based on item type
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
    
    const type = itemType || formData.item_type;
    
    if (type === 'disky') {
      return (parseInt(formData.disk_count) || 1) * DISK_PRICE_PER_PIECE;
    }

    if (type === 'ine') {
      const unitPrice = parseFloat(formData.unit_price) || 0;
      const qty = parseInt(formData.quantity) || 1;
      return unitPrice * qty;
    }

    if (type === 'doplnkova_sluzba') {
      const unitPrice = parseFloat(formData.service_price) || 0;
      const qty = parseInt(formData.service_quantity) || 1;
      return unitPrice * qty;
    }

    if (type === 'zaklad') {
      return area * ZAKLAD_PRICE_PER_M2;
    }

    if (!selectedPriceItem || isNaN(area) || area <= 0) return 0;
    return area * Number(selectedPriceItem.price_per_m2);
  };

  const addItemMutation = useMutation({
    mutationFn: async () => {
      const area = ['disky', 'ine', 'doplnkova_sluzba'].includes(formData.item_type) ? 0 : parseFloat(formData.area_m2);
      const diskCount = parseInt(formData.disk_count) || 1;
      const ineQty = parseInt(formData.quantity) || 1;
      const ineUnitPrice = parseFloat(formData.unit_price) || 0;
      const servicePrice = parseFloat(formData.service_price) || 0;
      const serviceQty = parseInt(formData.service_quantity) || 1;

      if (formData.item_type === 'ine') {
        if (ineUnitPrice <= 0 || ineQty <= 0) throw new Error('Zadajte platnú cenu a počet');
      } else if (formData.item_type === 'doplnkova_sluzba') {
        if (servicePrice <= 0 || serviceQty <= 0 || !formData.description.trim()) throw new Error('Zadajte cenu, počet a popis služby');
      } else if (formData.item_type !== 'disky' && (isNaN(area) || area <= 0)) {
        throw new Error('Zadajte platnú plochu');
      }

      if (!['disky', 'ine', 'doplnkova_sluzba'].includes(formData.item_type) && !formData.price_list_id) {
        throw new Error('Vyberte cenník');
      }

      // Get a shared production number for this item (and its base coat pair)
      const { data: seqData, error: seqError } = await supabase.rpc('nextval_production_seq' as any);
      if (seqError) {
        throw new Error('Nepodarilo sa získať výrobné číslo. Skúste to znova.');
      }
      if (typeof seqData !== 'number') {
        throw new Error('Neplatná odpoveď pri generovaní výrobného čísla.');
      }
      const prodNumber = seqData as number;

      const itemsToInsert = [];

      // If adding base coat (auto-use ZAKLAD color)
      if (formData.add_base_coat && !['disky', 'ine', 'doplnkova_sluzba'].includes(formData.item_type)) {
        itemsToInsert.push({
          order_id: orderId,
          price_list_id: formData.price_list_id,
          color_id: zakladColor?.id || null,
          description: `ZÁKLAD - ${formData.description || 'Bez popisu'}`,
          area_m2: area,
          is_double_layer: false,
          is_rework: formData.is_rework,
          total_price: calculatePrice(area, formData.is_rework, 'zaklad'),
          item_type: 'zaklad' as OrderItemType,
          price_per_m2: ZAKLAD_PRICE_PER_M2,
          global_production_number: prodNumber,
          unit: 'm2',
        });
      }

      // Main item
      const mainStdPrice = calculatePrice(area, formData.is_rework);
      const discountPct = Math.min(100, Math.max(0, parseFloat(formData.discount_percent) || 0));
      const mainFinalPrice = mainStdPrice * (1 - discountPct / 100);
      
      const mainAreaValue = formData.item_type === 'disky' ? diskCount 
        : formData.item_type === 'ine' ? ineQty
        : formData.item_type === 'doplnkova_sluzba' ? serviceQty
        : area;

      const mainPricePerM2 = formData.item_type === 'disky' 
        ? DISK_PRICE_PER_PIECE 
        : formData.item_type === 'ine'
        ? ineUnitPrice
        : formData.item_type === 'doplnkova_sluzba'
        ? servicePrice
        : (selectedPriceItem ? Number(selectedPriceItem.price_per_m2) : 0);

      itemsToInsert.push({
        order_id: orderId,
        price_list_id: ['disky', 'ine', 'doplnkova_sluzba'].includes(formData.item_type) ? null : formData.price_list_id,
        color_id: formData.item_type === 'doplnkova_sluzba' ? null : (formData.color_id || null),
        description: formData.description || null,
        area_m2: mainAreaValue,
        is_double_layer: false,
        is_rework: formData.is_rework,
        total_price: mainFinalPrice,
        item_type: formData.item_type,
        price_per_m2: mainPricePerM2,
        global_production_number: formData.item_type === 'doplnkova_sluzba' ? null : prodNumber,
        discount_percent: discountPct,
        work_status: 'pending',
        unit: formData.item_type === 'doplnkova_sluzba' ? 'ks' : (formData.item_type === 'disky' ? 'ks' : 'm2'),
      });

      const { error } = await supabase.from('order_items').insert(itemsToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(formData.add_base_coat ? '2 položky pridané' : 'Položka pridaná');
      queryClient.invalidateQueries({ queryKey: ['order', String(orderId)] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      item_type: 'standard',
      price_list_id: '',
      color_id: '',
      description: '',
      area_m2: '',
      is_rework: false,
      add_base_coat: false,
      disk_count: '1',
      discount_percent: '0',
      unit_price: '',
      quantity: '1',
      service_price: '',
      service_quantity: '1',
    });
    setCalcData({
      length: '',
      width: '',
      height: '',
      count: '1',
      isBothSides: false,
    });
    setUnifiedType('');
    setShowCalculator(false);
  };

  const handleUnifiedTypeChange = (value: string) => {
    setUnifiedType(value);
    if (['disky', 'ine', 'doplnkova_sluzba', 'stlp'].includes(value)) {
      setFormData({
        ...formData,
        item_type: value as OrderItemType,
        price_list_id: '',
        area_m2: '',
        add_base_coat: false,
      });
    } else {
      const selectedItem = priceList?.find(p => p.id === value);
      const nameLower = (selectedItem?.name ?? '').toLowerCase();
      const itemType: OrderItemType =
        nameLower.includes('lamel') || nameLower.includes('sito') ? 'lamely_sito' : 'standard';
      setFormData({
        ...formData,
        item_type: itemType,
        price_list_id: value,
        area_m2: '',
        add_base_coat: false,
      });
    }
    setCalcData({ length: '', width: '', height: '', count: '1', isBothSides: false });
  };

  const colorRequired = !['disky', 'ine', 'doplnkova_sluzba', 'zaklad'].includes(formData.item_type);

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (!unifiedType) {
      errors.push('Vyberte typ položky');
      return errors;
    }
    if (formData.item_type === 'disky') {
      if ((parseInt(formData.disk_count) || 0) <= 0) errors.push('Zadajte počet diskov');
      return errors;
    }
    if (formData.item_type === 'ine') {
      if ((parseFloat(formData.unit_price) || 0) <= 0) errors.push('Zadajte cenu za kus (€)');
      if ((parseInt(formData.quantity) || 0) <= 0) errors.push('Zadajte počet kusov');
      return errors;
    }
    if (formData.item_type === 'doplnkova_sluzba') {
      if ((parseFloat(formData.service_price) || 0) <= 0) errors.push('Zadajte cenu za kus (€)');
      if ((parseInt(formData.service_quantity) || 0) <= 0) errors.push('Zadajte počet kusov');
      if (!formData.description.trim()) errors.push('Zadajte popis služby');
      return errors;
    }
    if (!['disky', 'ine', 'doplnkova_sluzba', 'stlp'].includes(formData.item_type) && !formData.price_list_id) errors.push('Vyberte typ cenníka');
    if (!formData.area_m2 || parseFloat(formData.area_m2) <= 0) errors.push('Zadajte plochu (m²)');
    if (colorRequired && !formData.color_id) errors.push('Vyberte farbu');
    return errors;
  };

  const isFormValid = () => getValidationErrors().length === 0;

  // Render calculator based on item type
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
              <Input
                type="number"
                value={calcData.width}
                onChange={(e) => setCalcData({ ...calcData, width: e.target.value })}
                className="font-mono h-12 text-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Strana B (mm)</Label>
              <Input
                type="number"
                value={calcData.height}
                onChange={(e) => setCalcData({ ...calcData, height: e.target.value })}
                className="font-mono h-12 text-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Výška (mm)</Label>
              <Input
                type="number"
                value={calcData.length}
                onChange={(e) => setCalcData({ ...calcData, length: e.target.value })}
                className="font-mono h-12 text-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Počet ks</Label>
              <Input
                type="number"
                min="1"
                value={calcData.count}
                onChange={(e) => setCalcData({ ...calcData, count: e.target.value })}
                className="font-mono h-12 text-lg"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => {
              if (calculatedArea > 0) {
                setFormData({ ...formData, area_m2: calculatedArea.toFixed(4) });
              }
            }}
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
            <Input
              type="number"
              value={calcData.length}
              onChange={(e) => setCalcData({ ...calcData, length: e.target.value })}
              className="font-mono h-12 text-lg"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Šírka (mm)</Label>
            <Input
              type="number"
              value={calcData.width}
              onChange={(e) => setCalcData({ ...calcData, width: e.target.value })}
              className="font-mono h-12 text-lg"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Počet ks</Label>
            <Input
              type="number"
              min="1"
              value={calcData.count}
              onChange={(e) => setCalcData({ ...calcData, count: e.target.value })}
              className="font-mono h-12 text-lg"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="calc-both-sides"
              checked={calcData.isBothSides}
              onCheckedChange={(checked) => 
                setCalcData({ ...calcData, isBothSides: checked as boolean })
              }
            />
            <Label htmlFor="calc-both-sides" className="cursor-pointer text-sm">
              Obojstranne (×2)
            </Label>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              if (calculatedArea > 0) {
                setFormData({ ...formData, area_m2: calculatedArea.toFixed(4) });
              }
            }}
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
          <DialogTitle>Pridať položku</DialogTitle>
          <DialogDescription>
            Vyplňte údaje novej položky zákazky
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Unified typ položky */}
          <div className="space-y-2">
            <Label>Typ položky *</Label>
            <Select
              value={unifiedType}
              onValueChange={handleUnifiedTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vyberte typ položky" />
              </SelectTrigger>
              <SelectContent>
                {/* Položky z cenníka */}
                {priceList && priceList.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Štandardné
                    </div>
                    {priceList.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name ?? item.item_type} — {Number(item.price_per_m2).toFixed(2)} €/{item.unit ?? 'm²'}
                      </SelectItem>
                    ))}
                    <div className="my-1 border-t border-border" />
                  </>
                )}
                {/* Špeciálne typy */}
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Špeciálne
                </div>
                <SelectItem value="stlp">Stĺp (obvod × dĺžka)</SelectItem>
                <SelectItem value="disky">Disky kolies ({DISK_PRICE_PER_PIECE} €/ks)</SelectItem>
                <SelectItem value="ine">Iné (vlastná cena)</SelectItem>
                {isAdmin && (
                  <SelectItem value="doplnkova_sluzba">Doplnková služba</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Add base coat checkbox - not for disks, ine, doplnkova_sluzba */}
          {!['disky', 'ine', 'doplnkova_sluzba'].includes(formData.item_type) && (
            <div className="rounded-lg border border-warning/50 bg-warning/5 p-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="add-base-coat-dialog"
                  checked={formData.add_base_coat}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, add_base_coat: checked as boolean })
                  }
                />
                <div>
                  <Label htmlFor="add-base-coat-dialog" className="cursor-pointer font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Pridať základ
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Vytvorí 2 položky: základ (strieborná) + vrchná farba
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Show base coat info when checkbox is checked */}
          {formData.add_base_coat && !['disky', 'ine', 'doplnkova_sluzba'].includes(formData.item_type) && (
            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded border border-border" 
                  style={{ backgroundColor: '#C0C0C0' }}
                />
                <div>
                  <p className="text-sm font-medium">Základ</p>
                  <p className="text-xs text-muted-foreground">Strieborná - automaticky</p>
                </div>
              </div>
            </div>
          )}

          {/* Main color - not for doplnkova_sluzba */}
          {formData.item_type !== 'doplnkova_sluzba' && (
          <div className="space-y-2">
            {formData.add_base_coat && !['disky', 'ine', 'doplnkova_sluzba'].includes(formData.item_type) && (
              <Label className="text-accent font-medium">Vrchná farba *</Label>
            )}
            <SmartColorPicker
              value={formData.color_id}
              onChange={(colorId) => setFormData({ ...formData, color_id: colorId })}
            />
            {colorRequired && !formData.color_id && (
              <p className="text-xs text-destructive">* Farba je povinná</p>
            )}
          </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">
              {formData.item_type === 'doplnkova_sluzba' ? 'Popis služby *' : 'Popis (voliteľné)'}
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={formData.item_type === 'doplnkova_sluzba' ? 'Napr. Zváranie, montáž...' : 'Napr. dvere, okná...'}
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
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="1"
                    className="font-mono h-12 text-lg"
                  />
                </div>
              </div>
              <div className="text-center p-3 bg-accent/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Celková cena</p>
                <p className="text-2xl font-bold font-mono">
                  {((parseFloat(formData.unit_price) || 0) * (parseInt(formData.quantity) || 1)).toFixed(2)} €
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
                    value={formData.service_price}
                    onChange={(e) => setFormData({ ...formData, service_price: e.target.value })}
                    placeholder="0.00"
                    className="font-mono h-12 text-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Počet ks</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.service_quantity}
                    onChange={(e) => setFormData({ ...formData, service_quantity: e.target.value })}
                    placeholder="1"
                    className="font-mono h-12 text-lg"
                  />
                </div>
              </div>
              <div className="text-center p-3 bg-accent/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Celková cena</p>
                <p className="text-2xl font-bold font-mono">
                  {((parseFloat(formData.service_price) || 0) * (parseInt(formData.service_quantity) || 1)).toFixed(2)} €
                </p>
              </div>
            </div>
          )}

          {/* Calculator - not for doplnkova_sluzba */}
          {formData.item_type !== 'doplnkova_sluzba' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{formData.item_type === 'disky' ? 'Počet' : 'Plocha (m²) *'}</Label>
              {formData.item_type !== 'disky' && (
                <Collapsible open={showCalculator} onOpenChange={setShowCalculator}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 text-accent">
                      <Calculator className="h-4 w-4" />
                      Kalkulačka
                      <ChevronDown className={`h-4 w-4 transition-transform ${showCalculator ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </div>

            {formData.item_type === 'disky' ? (
              renderCalculator()
            ) : (
              <>
                <Collapsible open={showCalculator} onOpenChange={setShowCalculator}>
                  <CollapsibleContent>
                    {renderCalculator()}
                  </CollapsibleContent>
                </Collapsible>

                <Input
                  id="area_m2"
                  type="number"
                  step="0.0001"
                  value={formData.area_m2}
                  onChange={(e) => setFormData({ ...formData, area_m2: e.target.value })}
                  placeholder="0.0000"
                  className="font-mono"
                />
              </>
            )}
          </div>
          )}


          {/* Rework checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_rework"
              checked={formData.is_rework}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, is_rework: checked as boolean })
              }
            />
            <Label htmlFor="is_rework" className="cursor-pointer text-destructive">
              Oprava (bez ceny)
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
                    onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
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
          {isFormValid() && (() => {
            const stdPrice = calculatePrice(parseFloat(formData.area_m2) || 0, formData.is_rework);
            const discountPct = parseFloat(formData.discount_percent) || 0;
            const finalPrice = stdPrice * (1 - discountPct / 100);
            const hasDiscount = discountPct > 0 && !formData.is_rework;
            return (
              <div className="rounded-lg bg-muted p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cena položky:</span>
                  <div className="text-right">
                    {hasDiscount && (
                      <span className="text-sm text-muted-foreground line-through font-mono mr-2">
                        {stdPrice.toFixed(2)} €
                      </span>
                    )}
                    <span className="font-mono font-bold">
                      {finalPrice.toFixed(2)} €
                    </span>
                    {hasDiscount && (
                      <Badge variant="destructive" className="ml-2 text-xs">-{discountPct.toFixed(1)}%</Badge>
                    )}
                  </div>
                </div>
                {formData.add_base_coat && !formData.is_rework && (
                  <>
                    <div className="flex justify-between mt-1 text-sm">
                      <span className="text-muted-foreground">+ Základ:</span>
                      <span className="font-mono">
                        {calculatePrice(parseFloat(formData.area_m2) || 0, false, 'zaklad').toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-border">
                      <span className="font-medium">Spolu:</span>
                      <span className="font-mono font-bold">
                        {(finalPrice + calculatePrice(parseFloat(formData.area_m2) || 0, false, 'zaklad')).toFixed(2)} €
                      </span>
                    </div>
                  </>
                )}
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
            onClick={() => addItemMutation.mutate()}
            disabled={!isFormValid() || addItemMutation.isPending}
            className="bg-success text-success-foreground hover:bg-success/90 min-h-[48px]"
          >
            {formData.add_base_coat ? 'Pridať 2 položky' : 'Pridať položku'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
