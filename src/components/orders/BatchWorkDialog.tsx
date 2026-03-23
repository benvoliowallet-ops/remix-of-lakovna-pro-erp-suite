import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scale, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { STRUCTURE_TYPE_LABELS, GLOSS_TYPE_LABELS } from '@/lib/types';
import { formatRALWithName } from '@/lib/ral-colors';
import type { OrderItem, Color } from '@/lib/types';

interface BatchWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: (OrderItem & { color: Color | null })[];
  mode: 'start' | 'finish';
  onConfirmStart?: (weightBefore: number) => void;
  onConfirmFinish?: (weightAfter: number) => void;
  isPending: boolean;
  stockWeight?: number | null;
}

export function BatchWorkDialog({
  open, onOpenChange, items, mode, onConfirmStart, onConfirmFinish, isPending, stockWeight
}: BatchWorkDialogProps) {
  const [weight, setWeight] = useState('');
  const [error, setError] = useState('');

  const color = items[0]?.color;
  const totalArea = items.reduce((sum, item) => sum + Number(item.area_m2), 0);

  // For finish mode: items in batch all store the same full weight
  // Use the first item's weight_before_temp as the total (they're all identical)
  const combinedWeightBefore = items.length > 0 ? Number(items[0].weight_before_temp || 0) : 0;

  const consumption = mode === 'finish' && weight ? combinedWeightBefore - parseFloat(weight) : 0;
  const isValidFinishWeight = mode === 'finish' && weight && !isNaN(parseFloat(weight)) && parseFloat(weight) < combinedWeightBefore;

  const handleConfirm = () => {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) {
      setError('Zadajte platnú váhu');
      return;
    }
    if (mode === 'finish' && w >= combinedWeightBefore) {
      setError('Váha PO musí byť menšia ako váha PRED');
      return;
    }
    setError('');
    if (mode === 'start' && onConfirmStart) onConfirmStart(w);
    if (mode === 'finish' && onConfirmFinish) onConfirmFinish(w);
  };

  const handleClose = () => {
    setWeight('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className={`mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full ${
            mode === 'start' ? 'bg-accent/10' : 'bg-success/10'
          }`}>
            <Scale className={`h-8 w-8 ${mode === 'start' ? 'text-accent' : 'text-success'}`} />
          </div>
          <DialogTitle className="text-center text-xl">
            {mode === 'start' ? 'Hromadné váženie PRED' : 'Hromadné váženie PO'}
          </DialogTitle>
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

        <div className="py-4 space-y-4">
          {/* Items summary */}
          <div className="rounded-lg bg-muted p-3">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{items.length} položiek spolu</span>
            </div>
            <div className="space-y-1">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                  <span>č. {item.global_production_number} - {item.description || 'Bez popisu'}</span>
                  <span className="font-mono">{Number(item.area_m2).toFixed(4)} m²</span>
                </div>
              ))}
              <div className="border-t border-border pt-1 mt-1 flex justify-between text-sm font-medium">
                <span>Celková plocha</span>
                <span className="font-mono">{totalArea.toFixed(4)} m²</span>
              </div>
            </div>
          </div>

          {/* Stock weight indicator for start mode */}
          {mode === 'start' && stockWeight !== undefined && stockWeight !== null && (
            <div className="rounded-lg bg-accent/10 border border-accent/30 p-3">
              <p className="text-sm text-muted-foreground">Evidenčný stav</p>
              <p className="text-xl font-mono font-bold">{stockWeight.toFixed(3)} kg</p>
            </div>
          )}

          {/* Weight before info for finish mode */}
          {mode === 'finish' && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">Spoločná váha pred nastriekaním</p>
              <p className="text-2xl font-mono font-bold">{combinedWeightBefore.toFixed(3)} kg</p>
            </div>
          )}

          {/* Weight input */}
          <div className="space-y-3">
            <Label className="text-base">
              {mode === 'start' ? 'Spoločná váha farby PRED (kg)' : 'Spoločná váha farby PO (kg)'}
            </Label>
            <Input
              type="number"
              step="0.001"
              inputMode="decimal"
              value={weight}
              onChange={(e) => { setWeight(e.target.value); setError(''); }}
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

          {/* Consumption preview for finish */}
          {mode === 'finish' && isValidFinishWeight && (
            <div className="space-y-3">
              <div className="rounded-lg bg-success/10 p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <p className="text-sm font-medium text-success">Celková spotreba</p>
                </div>
                <p className="text-3xl font-mono font-bold text-success">
                  {consumption.toFixed(3)} kg
                </p>
              </div>

              {/* Proportional breakdown */}
              <div className="rounded-lg border border-border p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Proporcionálne rozdelenie:</p>
                {items.map(item => {
                  const proportion = Number(item.area_m2) / totalArea;
                  const itemConsumption = consumption * proportion;
                  return (
                    <div key={item.id} className="flex justify-between text-xs">
                      <span>č. {item.global_production_number} ({(proportion * 100).toFixed(1)}%)</span>
                      <span className="font-mono font-medium">{itemConsumption.toFixed(3)} kg</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleConfirm}
            disabled={!weight || isPending}
            className={`w-full h-14 text-lg ${
              mode === 'start'
                ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                : 'bg-success text-success-foreground hover:bg-success/90'
            }`}
          >
            {isPending ? 'Ukladám...' : mode === 'start' ? 'Potvrdiť a začať všetky' : 'Uložiť a dokončiť všetky'}
          </Button>
          <Button variant="ghost" onClick={handleClose} disabled={isPending} className="w-full">
            Zrušiť
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
