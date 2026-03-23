import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scale, AlertCircle, CheckCircle2 } from 'lucide-react';
import { STRUCTURE_TYPE_LABELS, GLOSS_TYPE_LABELS } from '@/lib/types';
import { formatRALWithName } from '@/lib/ral-colors';
import type { Color } from '@/lib/types';

interface FinishWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  color: Color | null;
  weightBefore: number;
  onConfirm: (weightAfter: number) => void;
  isPending: boolean;
}

export function FinishWorkDialog({ open, onOpenChange, color, weightBefore, onConfirm, isPending }: FinishWorkDialogProps) {
  const [weightAfter, setWeightAfter] = useState('');
  const [error, setError] = useState('');

  const consumption = weightAfter ? weightBefore - parseFloat(weightAfter) : 0;
  const isValidWeight = weightAfter && !isNaN(parseFloat(weightAfter)) && parseFloat(weightAfter) < weightBefore;

  const handleConfirm = () => {
    const weight = parseFloat(weightAfter);
    if (isNaN(weight) || weight <= 0) {
      setError('Zadajte platnú váhu');
      return;
    }
    if (weight >= weightBefore) {
      setError('Váha PO musí byť menšia ako váha PRED');
      return;
    }
    setError('');
    onConfirm(weight);
  };

  const handleClose = () => {
    setWeightAfter('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <Scale className="h-8 w-8 text-success" />
          </div>
          <DialogTitle className="text-center text-xl">Váženie po nastriekaní</DialogTitle>
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
          {/* Weight before info */}
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">Váha pred nastriekaním</p>
            <p className="text-2xl font-mono font-bold">{weightBefore.toFixed(3)} kg</p>
          </div>

          {/* Weight after input */}
          <div className="space-y-3">
            <Label htmlFor="weight-after" className="text-base">
              Váha farby PO (kg)
            </Label>
            <Input
              id="weight-after"
              type="number"
              step="0.001"
              inputMode="decimal"
              value={weightAfter}
              onChange={(e) => {
                setWeightAfter(e.target.value);
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

          {/* Consumption preview */}
          {isValidWeight && (
            <div className="rounded-lg bg-success/10 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="text-sm font-medium text-success">Spotreba</p>
              </div>
              <p className="text-3xl font-mono font-bold text-success">
                {consumption.toFixed(3)} kg
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleConfirm}
            disabled={!weightAfter || isPending}
            className="w-full h-14 text-lg bg-success text-success-foreground hover:bg-success/90"
          >
            {isPending ? 'Ukladám...' : 'Uložiť a dokončiť'}
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
