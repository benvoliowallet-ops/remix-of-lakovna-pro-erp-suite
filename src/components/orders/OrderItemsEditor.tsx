import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Trash2, Calculator, ChevronDown, Package, AlertTriangle, AlertCircle } from 'lucide-react';
import { ORDER_ITEM_TYPE_LABELS } from '@/lib/types';
import type { PriceListItem, OrderItemType } from '@/lib/types';

import { SmartColorPicker } from './SmartColorPicker';
import { cn } from '@/lib/utils';
import { parseLocalizedNumber } from '@/lib/parse-number';
import { useTenantSettings } from '@/hooks/useTenantSettings';

export interface PendingOrderItem {
  id: string;
  price_list_id: string;
  color_id: string;
  description: string;
  area_m2: number;
  is_double_layer: boolean;
  is_rework: boolean;
  total_price: number;
  item_type: OrderItemType;
  price_per_m2: number;
  unit?: string;
  // For base coat items
  base_coat_id?: string;
  top_coat_id?: string;
  // For linking
  linked_item_id?: string;
}

interface OrderItemsEditorProps {
  items: PendingOrderItem[];
  onChange: (items: PendingOrderItem[]) => void;
  isVatPayer: boolean;
  isAdmin?: boolean;
}

export function OrderItemsEditor({ items, onChange, isVatPayer, isAdmin }: OrderItemsEditorProps) {
  const { settings } = useTenantSettings();
  const DISK_PRICE_PER_PIECE = settings.disk_price_per_piece;
  const ZAKLAD_PRICE_PER_M2 = settings.zaklad_price_per_m2;

  const [showForm, setShowForm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [unifiedType, setUnifiedType] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    item_type: 'standard' as OrderItemType,
    price_list_id: '',
    color_id: '',
    description: '',
    area_m2: '',
    is_rework: false,
    add_base_coat: false,
    disk_count: '1',
    unit_price: '',
    quantity: '1',
    service_price: '',
    service_quantity: '1',
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

  // Calculator state - different for each type
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

  const selectedPriceItem = priceList?.find((p) => p.id === formData.price_list_id);

  // Calculate area based on item type
  const calculatedArea = useMemo(() => {
    const length = parseFloat(calcData.length);
    const width = parseFloat(calcData.width);
    const height = parseFloat(calcData.height);
    const count = parseInt(calcData.count) || 1;

    if (formData.item_type === 'disky') {
      return 0; // Disks don't use area
    }

    if (formData.item_type === 'stlp') {
      // STĹP: (Width + Height) * 2 * Length * Count
      if (isNaN(width) || isNaN(height) || isNaN(length)) return 0;
      const perimeter = (width + height) * 2;
      return (perimeter / 1000) * (length / 1000) * count;
    }

    // Standard / Lamely_sito: Length * Width * Count * (Both sides ? 2 : 1)
    if (isNaN(length) || isNaN(width)) return 0;
    let area = (length / 1000) * (width / 1000) * count;
    if (calcData.isBothSides) area *= 2;
    return area;
  }, [calcData, formData.item_type]);


  const calculatePrice = (area: number, isRework: boolean, itemType?: OrderItemType) => {
    if (isRework) return 0;
    
    const type = itemType || formData.item_type;
    
    if (type === 'disky') {
      const diskCount = parseInt(formData.disk_count) || 1;
      return diskCount * DISK_PRICE_PER_PIECE;
    }

    if (type === 'ine') {
      const unitPrice = parseLocalizedNumber(formData.unit_price) || 0;
      const qty = parseInt(formData.quantity) || 1;
      return unitPrice * qty;
    }

    if (type === 'doplnkova_sluzba') {
      const unitPrice = parseLocalizedNumber(formData.service_price) || 0;
      const qty = parseInt(formData.service_quantity) || 1;
      return unitPrice * qty;
    }

    if (type === 'zaklad') {
      return area * ZAKLAD_PRICE_PER_M2;
    }

    if (!selectedPriceItem || isNaN(area) || area <= 0) return 0;
    return area * Number(selectedPriceItem.price_per_m2);
  };

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
    setShowCalculator(false);
  };

  const addItem = () => {
    const newItems: PendingOrderItem[] = [];
    const area = (formData.item_type === 'disky' || formData.item_type === 'ine' || formData.item_type === 'doplnkova_sluzba') ? 0 : parseLocalizedNumber(formData.area_m2);
    const diskCount = parseInt(formData.disk_count) || 1;

    // Validate
    if (formData.item_type === 'ine') {
      const unitPrice = parseLocalizedNumber(formData.unit_price) || 0;
      const qty = parseInt(formData.quantity) || 0;
      if (unitPrice <= 0 || qty <= 0) return;
    } else if (formData.item_type === 'doplnkova_sluzba') {
      const servicePrice = parseLocalizedNumber(formData.service_price) || 0;
      const serviceQty = parseInt(formData.service_quantity) || 0;
      if (servicePrice <= 0 || serviceQty <= 0 || !formData.description.trim()) return;
    } else if (formData.item_type !== 'disky' && (isNaN(area) || area <= 0)) return;
    if (!['disky', 'ine', 'doplnkova_sluzba'].includes(formData.item_type) && !formData.price_list_id) return;

    const baseId = crypto.randomUUID();
    const topId = crypto.randomUUID();

    // If adding base coat, create base item first (auto-use ZAKLAD color)
    if (formData.add_base_coat && formData.item_type !== 'disky') {
      const baseItem: PendingOrderItem = {
        id: baseId,
        price_list_id: formData.price_list_id,
        color_id: zakladColor?.id || '',
        description: `ZÁKLAD - ${formData.description || 'Bez popisu'}`,
        area_m2: area,
        is_double_layer: false,
        is_rework: formData.is_rework,
        total_price: calculatePrice(area, formData.is_rework, 'zaklad'),
        item_type: 'zaklad',
        price_per_m2: ZAKLAD_PRICE_PER_M2,
        unit: 'm2',
        top_coat_id: topId,
        linked_item_id: topId,
      };
      newItems.push(baseItem);
    }

    // Create main item (or top coat if base was added)
    const ineQty = parseInt(formData.quantity) || 1;
    const ineUnitPrice = parseLocalizedNumber(formData.unit_price) || 0;
    const servicePrice = parseLocalizedNumber(formData.service_price) || 0;
    const serviceQty = parseInt(formData.service_quantity) || 1;

    const mainItem: PendingOrderItem = {
      id: formData.add_base_coat ? topId : crypto.randomUUID(),
      price_list_id: formData.price_list_id,
      color_id: formData.item_type === 'doplnkova_sluzba' ? '' : formData.color_id,
      description: formData.description || '',
      area_m2: formData.item_type === 'disky' ? diskCount 
        : formData.item_type === 'doplnkova_sluzba' ? serviceQty 
        : formData.item_type === 'ine' ? area
        : area,
      is_double_layer: false,
      is_rework: formData.is_rework,
      total_price: calculatePrice(area, formData.is_rework),
      item_type: formData.item_type,
      price_per_m2: formData.item_type === 'disky' 
        ? DISK_PRICE_PER_PIECE 
        : formData.item_type === 'ine'
        ? ineUnitPrice
        : formData.item_type === 'doplnkova_sluzba'
        ? servicePrice
        : (selectedPriceItem ? Number(selectedPriceItem.price_per_m2) : 0),
      base_coat_id: formData.add_base_coat ? baseId : undefined,
      linked_item_id: formData.add_base_coat ? baseId : undefined,
    };
    newItems.push(mainItem);

    onChange([...items, ...newItems]);
    resetForm();
    setShowForm(false);
  };

  const removeItem = (id: string) => {
    const itemToRemove = items.find(item => item.id === id);
    if (itemToRemove?.linked_item_id) {
      // Remove both linked items
      onChange(items.filter(item => item.id !== id && item.id !== itemToRemove.linked_item_id));
    } else {
      // Also check if this item is linked from another
      const linkedFrom = items.find(item => item.linked_item_id === id);
      if (linkedFrom) {
        onChange(items.filter(item => item.id !== id && item.id !== linkedFrom.id));
      } else {
        onChange(items.filter(item => item.id !== id));
      }
    }
  };

  const totalPrice = items.reduce((sum, item) => sum + item.total_price, 0);
  const totalArea = items.reduce((sum, item) => item.item_type !== 'disky' ? sum + item.area_m2 : sum, 0);

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
            <p className="text-xs text-muted-foreground">{DISK_PRICE_PER_PIECE} € / disk</p>
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
                placeholder="0"
                className="font-mono h-12 text-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Strana B (mm)</Label>
              <Input
                type="number"
                value={calcData.height}
                onChange={(e) => setCalcData({ ...calcData, height: e.target.value })}
                placeholder="0"
                className="font-mono h-12 text-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Výška (mm)</Label>
              <Input
                type="number"
                value={calcData.length}
                onChange={(e) => setCalcData({ ...calcData, length: e.target.value })}
                placeholder="0"
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
                placeholder="1"
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

    // Standard / Lamely_sito calculator
    return (
      <div className="p-4 rounded-lg border border-border bg-muted/50 space-y-4 mb-3">
        <p className="text-xs text-muted-foreground">Vzorec: Dĺžka × Šírka × Počet {calcData.isBothSides && '× 2'}</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Dĺžka (mm)</Label>
            <Input
              type="number"
              value={calcData.length}
              onChange={(e) => setCalcData({ ...calcData, length: e.target.value })}
              placeholder="0"
              className="font-mono h-12 text-lg"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Šírka (mm)</Label>
            <Input
              type="number"
              value={calcData.width}
              onChange={(e) => setCalcData({ ...calcData, width: e.target.value })}
              placeholder="0"
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
              placeholder="1"
              className="font-mono h-12 text-lg"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="calc-both-sides-inline"
              checked={calcData.isBothSides}
              onCheckedChange={(checked) => 
                setCalcData({ ...calcData, isBothSides: checked as boolean })
              }
            />
            <Label htmlFor="calc-both-sides-inline" className="cursor-pointer text-sm">
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

  const colorRequired = !['disky', 'ine', 'doplnkova_sluzba', 'zaklad'].includes(formData.item_type);

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (formData.item_type === 'disky') {
      if ((parseInt(formData.disk_count) || 0) <= 0) errors.push('Zadajte počet diskov');
      return errors;
    }
    if (formData.item_type === 'ine') {
      if ((parseLocalizedNumber(formData.unit_price) || 0) <= 0) errors.push('Zadajte cenu za kus (€)');
      if ((parseInt(formData.quantity) || 0) <= 0) errors.push('Zadajte počet kusov');
      return errors;
    }
    if (formData.item_type === 'doplnkova_sluzba') {
      if ((parseLocalizedNumber(formData.service_price) || 0) <= 0) errors.push('Zadajte cenu za kus (€)');
      if ((parseInt(formData.service_quantity) || 0) <= 0) errors.push('Zadajte počet kusov');
      if (!formData.description.trim()) errors.push('Zadajte popis služby');
      return errors;
    }
    if (!formData.price_list_id) errors.push('Vyberte typ cenníka');
    if (!formData.area_m2 || parseLocalizedNumber(formData.area_m2) <= 0) errors.push('Zadajte plochu (m²)');
    if (colorRequired && !formData.color_id) errors.push('Vyberte farbu');
    return errors;
  };

  const isFormValid = () => getValidationErrors().length === 0;

  return (
    <div className="space-y-4">
      {/* Items list */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => {
            const priceItem = priceList?.find(p => p.id === item.price_list_id);
            const isBaseCoat = item.item_type === 'zaklad';
            
            return (
              <Card 
                key={item.id} 
                className={cn(
                  "border-border",
                  isBaseCoat && "border-destructive/50 bg-destructive/5"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={cn(
                          "font-medium",
                          isBaseCoat && "text-destructive"
                        )}>
                          {index + 1}. {ORDER_ITEM_TYPE_LABELS[item.item_type]}
                          {priceItem && ` (${priceItem.name ?? priceItem.item_type})`}
                        </span>
                        {isBaseCoat && (
                          <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded font-bold">
                            ZÁKLAD
                          </span>
                        )}
                        {item.is_rework && (
                          <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                            Oprava
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                      )}
                      <p className="text-sm font-mono">
                        {item.item_type === 'disky' || item.item_type === 'ine' || item.item_type === 'doplnkova_sluzba'
                          ? `${item.area_m2} ks` 
                          : `${item.area_m2.toFixed(4)} m²`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold">{item.total_price.toFixed(2)} €</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Total */}
          <div className="rounded-lg bg-muted p-4 mt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Celkom {items.length} položiek</p>
                {totalArea > 0 && <p className="text-sm font-mono">{totalArea.toFixed(4)} m²</p>}
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-sm">Cena bez DPH</p>
                <p className="text-xl font-mono font-bold">{totalPrice.toFixed(2)} €</p>
                {isVatPayer && (
                  <p className="text-sm text-muted-foreground">
                    s DPH: {(totalPrice * 1.23).toFixed(2)} €
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add item form */}
      {showForm ? (
        <Card className="border-accent">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Nová položka
              </h4>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>
                Zrušiť
              </Button>
            </div>

            {/* Item Type Selection */}
            <div className="space-y-2">
              <Label>Typ položky *</Label>
              <Select
                value={formData.item_type}
                onValueChange={(v) => {
                  setFormData({ ...formData, item_type: v as OrderItemType, area_m2: '', add_base_coat: false });
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
                  {isAdmin && <SelectItem value="doplnkova_sluzba">Doplnková služba</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* Price list item - not for disks, ine, doplnkova_sluzba */}
            {!['disky', 'ine', 'doplnkova_sluzba'].includes(formData.item_type) && (
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
                    {priceList?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name ?? item.item_type} — {Number(item.price_per_m2).toFixed(2)} € / {item.unit ?? 'm²'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Add base coat checkbox - not for disks, ine, doplnkova_sluzba */}
            {!['disky', 'ine', 'doplnkova_sluzba'].includes(formData.item_type) && (
              <div className="rounded-lg border border-warning/50 bg-warning/5 p-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="add-base-coat"
                    checked={formData.add_base_coat}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, add_base_coat: checked as boolean })
                    }
                  />
                  <div>
                    <Label htmlFor="add-base-coat" className="cursor-pointer font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Pridať základ
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Vytvorí 2 položky: základ (červený) + vrchná farba
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Base coat visual indicator - only if add_base_coat is checked */}
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

            {/* Top coat / Main color picker - not for doplnkova_sluzba */}
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

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="item-description">
                {formData.item_type === 'doplnkova_sluzba' ? 'Popis služby *' : 'Popis (voliteľné)'}
              </Label>
              <Input
                id="item-description"
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
                      type="text"
                      inputMode="decimal"
                      value={formData.unit_price}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.,]/g, '');
                        setFormData({ ...formData, unit_price: value });
                      }}
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
                    {((parseLocalizedNumber(formData.unit_price) || 0) * (parseInt(formData.quantity) || 1)).toFixed(2)} €
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
                      type="text"
                      inputMode="decimal"
                      value={formData.service_price}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.,]/g, '');
                        setFormData({ ...formData, service_price: value });
                      }}
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
                    {((parseLocalizedNumber(formData.service_price) || 0) * (parseInt(formData.service_quantity) || 1)).toFixed(2)} €
                  </p>
                </div>
              </div>
            )}

            {/* Calculator section - not for doplnkova_sluzba */}
            {formData.item_type !== 'doplnkova_sluzba' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{formData.item_type === 'disky' ? 'Počet diskov' : 'Plocha (m²) *'}</Label>
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
                    type="text"
                    inputMode="decimal"
                    value={formData.area_m2}
                    onChange={(e) => {
                      // Allow only numbers, dot, and comma
                      const value = e.target.value.replace(/[^0-9.,]/g, '');
                      setFormData({ ...formData, area_m2: value });
                    }}
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
                id="inline-is_rework"
                checked={formData.is_rework}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_rework: checked as boolean })
                }
              />
              <Label htmlFor="inline-is_rework" className="cursor-pointer text-destructive">
                Oprava (bez ceny)
              </Label>
            </div>

            {/* Price preview */}
            {isFormValid() && (
              <div className="rounded-lg bg-muted p-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cena položky:</span>
                  <span className="font-mono font-bold">
                    {formData.is_rework ? '0.00' : calculatePrice(parseLocalizedNumber(formData.area_m2) || 0, false).toFixed(2)} €
                  </span>
                </div>
                {formData.add_base_coat && !formData.is_rework && (
                  <div className="flex justify-between mt-1 text-sm">
                    <span className="text-muted-foreground">+ Základ (4 €/m²):</span>
                    <span className="font-mono">
                      {calculatePrice(parseLocalizedNumber(formData.area_m2) || 0, false, 'zaklad').toFixed(2)} €
                    </span>
                  </div>
                )}
                {formData.add_base_coat && !formData.is_rework && (
                  <div className="flex justify-between mt-2 pt-2 border-t border-border">
                    <span className="font-medium">Spolu:</span>
                    <span className="font-mono font-bold">
                      {(calculatePrice(parseLocalizedNumber(formData.area_m2) || 0, false) + calculatePrice(parseLocalizedNumber(formData.area_m2) || 0, false, 'zaklad')).toFixed(2)} €
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Validation errors */}
            {(() => {
              const errors = getValidationErrors();
              return errors.length > 0 ? (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-1">
                  {errors.map(err => (
                    <p key={err} className="text-xs text-destructive flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      {err}
                    </p>
                  ))}
                </div>
              ) : null;
            })()}

            {/* Add button */}
            <Button
              onClick={addItem}
              disabled={!isFormValid()}
              className="w-full bg-success text-success-foreground hover:bg-success/90 min-h-[48px]"
            >
              <Plus className="mr-2 h-4 w-4" />
              {formData.add_base_coat ? 'Pridať 2 položky (základ + farba)' : 'Pridať položku'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
          className="w-full border-dashed min-h-[48px]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Pridať položku
        </Button>
      )}
    </div>
  );
}
