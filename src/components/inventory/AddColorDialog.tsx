import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Plus, Search, Palette } from 'lucide-react';
import { STRUCTURE_TYPE_LABELS, GLOSS_TYPE_LABELS } from '@/lib/types';
import type { StructureType, GlossType } from '@/lib/types';
import { RAL_COLORS, findRALColor } from '@/lib/ral-colors';
import { cn } from '@/lib/utils';

interface AddColorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STRUCTURE_OPTIONS: StructureType[] = ['hladka', 'jemna', 'hruba', 'antik', 'kladivkova'];
const GLOSS_OPTIONS: GlossType[] = ['leskle', 'polomatne', 'matne', 'satenovane', 'hlboko_matne', 'metalicke', 'fluorescentne', 'glitrove', 'perletove'];

export function AddColorDialog({ open, onOpenChange }: AddColorDialogProps) {
  const queryClient = useQueryClient();
  const [structure, setStructure] = useState<StructureType>('hladka');
  const [gloss, setGloss] = useState<GlossType>('matne');
  const [ralCode, setRalCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockKg, setStockKg] = useState('0');
  const [minStockLimit, setMinStockLimit] = useState('5');
  const [pricePerKg, setPricePerKg] = useState('0');
  const [pricePerKgPurchase, setPricePerKgPurchase] = useState('0');

  const selectedRalInfo = ralCode ? findRALColor(ralCode) : null;

  const filteredRALColors = useMemo(() => {
    if (!searchQuery) return RAL_COLORS;
    const query = searchQuery.toLowerCase();
    return RAL_COLORS.filter(c =>
      c.code.includes(query) ||
      c.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const createColorMutation = useMutation({
    mutationFn: async () => {
      if (!ralCode) throw new Error('Vyberte RAL kód');

      const { data, error } = await supabase
        .from('colors')
        .insert({
          ral_code: ralCode,
          structure,
          gloss,
          hex_code: selectedRalInfo?.hex || '#808080',
          color_name: selectedRalInfo?.name || null,
          stock_kg: parseFloat(stockKg) || 0,
          min_stock_limit: parseFloat(minStockLimit) || 5,
          price_per_kg: parseFloat(pricePerKg) || 0,
          price_per_kg_purchase: parseFloat(pricePerKgPurchase) || 0,
          density: 1.5,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Farba pridaná', {
        description: `RAL ${ralCode} - ${STRUCTURE_TYPE_LABELS[structure]} / ${GLOSS_TYPE_LABELS[gloss]}`,
      });
      queryClient.invalidateQueries({ queryKey: ['colors'] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Chyba pri pridávaní farby', {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setStructure('hladka');
    setGloss('matne');
    setRalCode('');
    setSearchQuery('');
    setStockKg('0');
    setMinStockLimit('5');
    setPricePerKg('0');
    setPricePerKgPurchase('0');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Pridať novú farbu</DialogTitle>
              <DialogDescription>
                Pridajte novú kombináciu RAL farby, štruktúry a lesku do skladu
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Structure & Gloss Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Štruktúra povrchu</Label>
              <Select value={structure} onValueChange={(v) => setStructure(v as StructureType)}>
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRUCTURE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="min-h-[44px]">
                      {STRUCTURE_TYPE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stupeň lesku</Label>
              <Select value={gloss} onValueChange={(v) => setGloss(v as GlossType)}>
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GLOSS_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g} className="min-h-[44px]">
                      {GLOSS_TYPE_LABELS[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* RAL Code Selection */}
          <div className="space-y-2">
            <Label>RAL kód</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hľadať RAL kód alebo názov..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 min-h-[48px]"
              />
            </div>
            <ScrollArea className="h-[180px] border rounded-lg p-2">
              <div className="grid grid-cols-4 gap-2">
                {filteredRALColors.map((color) => (
                  <button
                    key={color.code}
                    type="button"
                    onClick={() => setRalCode(color.code)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                      ralCode === color.code
                        ? "ring-2 ring-primary border-primary bg-primary/5"
                        : "hover:border-primary/50 hover:bg-muted"
                    )}
                    title={`RAL ${color.code} - ${color.name}`}
                  >
                    <div
                      className="h-8 w-8 rounded border shadow-sm"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-xs font-mono">{color.code}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* Selected color preview */}
            {selectedRalInfo && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div
                  className="h-12 w-12 rounded-lg border-2 shadow-md"
                  style={{ backgroundColor: selectedRalInfo.hex }}
                />
                <div>
                  <p className="font-mono font-bold">RAL {selectedRalInfo.code}</p>
                  <p className="text-sm text-muted-foreground">{selectedRalInfo.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Stock & Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Počiatočný stav (kg)</Label>
              <Input
                type="number"
                step="0.001"
                value={stockKg}
                onChange={(e) => setStockKg(e.target.value)}
                className="min-h-[48px] font-mono"
                placeholder="0.000"
              />
            </div>
            <div className="space-y-2">
              <Label>Minimálny stav (kg)</Label>
              <Input
                type="number"
                step="0.001"
                value={minStockLimit}
                onChange={(e) => setMinStockLimit(e.target.value)}
                className="min-h-[48px] font-mono"
                placeholder="5.000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Predajná cena za kg (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                className="min-h-[48px] font-mono"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Nákupná cena za kg (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={pricePerKgPurchase}
                onChange={(e) => setPricePerKgPurchase(e.target.value)}
                className="min-h-[48px] font-mono"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleClose}>
            Zrušiť
          </Button>
          <Button
            onClick={() => createColorMutation.mutate()}
            disabled={!ralCode || createColorMutation.isPending}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {createColorMutation.isPending ? 'Pridávam...' : 'Pridať farbu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
