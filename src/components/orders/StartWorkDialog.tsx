import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scale, AlertCircle, Info } from 'lucide-react';
import { STRUCTURE_TYPE_LABELS, GLOSS_TYPE_LABELS } from '@/lib/types';
import { formatRALWithName } from '@/lib/ral-colors';
import type { Color } from '@/lib/types';

interface StartWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  color: Color | null;
  onConfirm: (weightBefore: number) => void;
  isPending: boolean;
  stockWeight?: number | null;
}

export function StartWorkDialog({ open, onOpenChange, color, onConfirm, isPending, stockWeight }: StartWorkDialogProps) {
  const [weightBefore, setWeightBefore] = useState('');
  const [error, setError] = useState('');

  const parsedWeight = parseFloat(weightBefore);
  const hasDiscrepancy = stockWeight !== undefined && stockWeight !== null && !isNaN(parsedWeight) && parsedWeight > 0 && Math.abs(parsedWeight - stockWeight) > 0.001;
  const discrepancy = hasDiscrepancy ? parsedWeight - stockWeight! : 0;

  const handleConfirm = () => {
    const weight = parseFloat(weightBefore);
    if (isNaN(weight) || weight <= 0) {
      setError('Zadajte platnú váhu');
      return;
    }
    setError('');
    onConfirm(weight);
  };

  const handleClose = () => {
    setWeightBefore('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
            <Scale className="h-8 w-8 text-accent" />
          </div>
          <DialogTitle className="text-center text-xl">Váženie pred nastriekaním</DialogTitle>
          {color && (
            <DialogDescription className="text-center text-base">
              <span className="font-mono font-bold">{formatRALWithName(color.ral_code, color.color_name)}</span>
              {color.ral_code !== 'ZAKLAD' && (
                <>
                  <br />
                  {STRUCTURE_TYPE_LABELS[color.structure]} / {GLOSS_TYPE_LABELS[color.gloss]}
                </>
              )}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="py-6 space-y-4">
          {/* Stock weight indicator */}
          {stockWeight !== undefined && stockWeight !== null && (
            <div className="rounded-lg bg-accent/10 border border-accent/30 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Info className="h-4 w-4 text-accent" />
                <span className="text-sm text-muted-foreground">Evidenčný stav</span>
              </div>
              <p className="text-xl font-mono font-bold">{stockWeight.toFixed(3)} kg</p>
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="weight-before" className="text-base">
              Váha farby PRED (kg)
            </Label>
            <Input
              id="weight-before"
              type="number"
              step="0.001"
              inputMode="decimal"
              value={weightBefore}
              onChange={(e) => {
                setWeightBefore(e.target.value);
                setError('');
              }}
              placeholder="0.000"
              className="h-16 text-2xl font-mono text-center"
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          {/* Discrepancy warning */}
          {hasDiscrepancy && (
            <div className={`rounded-lg p-3 border ${
              discrepancy < 0 
                ? 'bg-destructive/10 border-destructive/30' 
                : 'bg-success/10 border-success/30'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className={`h-4 w-4 ${discrepancy < 0 ? 'text-destructive' : 'text-success'}`} />
                <span className={`text-sm font-medium ${discrepancy < 0 ? 'text-destructive' : 'text-success'}`}>
                  {discrepancy < 0 ? 'Manko' : 'Prebytok'}: {discrepancy > 0 ? '+' : ''}{discrepancy.toFixed(3)} kg
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Rozdiel bude automaticky zaznamenaný a sklad aktualizovaný
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleConfirm}
            disabled={!weightBefore || isPending}
            className="w-full h-14 text-lg bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isPending ? 'Ukladám...' : 'Potvrdiť a začať'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isPending}
            className="w-full"
          >
            Zrušiť
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
