import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { STRUCTURE_TYPE_LABELS, GLOSS_TYPE_LABELS } from '@/lib/types';
import type { Color } from '@/lib/types';

interface EditColorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  color: Color | null;
}

export function EditColorDialog({ open, onOpenChange, color }: EditColorDialogProps) {
  const queryClient = useQueryClient();
  const [stockKg, setStockKg] = useState('');
  const [minStockLimit, setMinStockLimit] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [pricePerKgPurchase, setPricePerKgPurchase] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Sync form with color data when dialog opens
  useEffect(() => {
    if (color && open) {
      setStockKg(String(color.stock_kg || 0));
      setMinStockLimit(String(color.min_stock_limit || 5));
      setPricePerKg(String(color.price_per_kg || 0));
      setPricePerKgPurchase(String(color.price_per_kg_purchase || 0));
    }
  }, [color, open]);

  const updateColorMutation = useMutation({
    mutationFn: async () => {
      if (!color) throw new Error('Farba nenájdená');

      const { error } = await supabase
        .from('colors')
        .update({
          stock_kg: parseFloat(stockKg) || 0,
          min_stock_limit: parseFloat(minStockLimit) || 5,
          price_per_kg: parseFloat(pricePerKg) || 0,
          price_per_kg_purchase: parseFloat(pricePerKgPurchase) || 0,
        })
        .eq('id', color.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Farba aktualizovaná', {
        description: `RAL ${color?.ral_code}`,
      });
      queryClient.invalidateQueries({ queryKey: ['colors'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Chyba pri aktualizácii farby', {
        description: error.message,
      });
    },
  });

  if (!color) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-lg border-2 shadow-md flex-shrink-0"
              style={{ backgroundColor: color.hex_code || '#808080' }}
            />
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Upraviť RAL {color.ral_code}
              </DialogTitle>
              <DialogDescription>
                {STRUCTURE_TYPE_LABELS[color.structure]} / {GLOSS_TYPE_LABELS[color.gloss]}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Aktuálny stav (kg)</Label>
              <Input
                type="number"
                step="0.001"
                value={stockKg}
                onChange={(e) => setStockKg(e.target.value)}
                className="min-h-[48px] font-mono"
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
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Predajná cena za kg (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                className="min-h-[48px] font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Nákupná cena za kg (€)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={pricePerKgPurchase}
                onChange={(e) => setPricePerKgPurchase(e.target.value)}
                className="min-h-[48px] font-mono text-primary font-bold"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušiť
          </Button>
          <Button
            onClick={() => updateColorMutation.mutate()}
            disabled={updateColorMutation.isPending}
          >
            {updateColorMutation.isPending ? 'Ukladám...' : 'Uložiť zmeny'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
