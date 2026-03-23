import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Scale } from 'lucide-react';
import { STRUCTURE_TYPE_LABELS, GLOSS_TYPE_LABELS } from '@/lib/types';
import { formatRALWithName } from '@/lib/ral-colors';
import type { OrderItem, Color } from '@/lib/types';

interface BatchSuggestionAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerItem: (OrderItem & { color: Color | null }) | null;
  matchingItems: (OrderItem & { color: Color | null })[];
  onBatch: () => void;
  onIndividual: () => void;
}

export function BatchSuggestionAlert({
  open, onOpenChange, triggerItem, matchingItems, onBatch, onIndividual
}: BatchSuggestionAlertProps) {
  if (!triggerItem?.color) return null;

  const color = triggerItem.color;
  const allItems = [triggerItem, ...matchingItems];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
            <Users className="h-8 w-8 text-accent" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Hromadné váženie dostupné
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-center">
                V zákazke {matchingItems.length === 1 ? 'je ešte' : 'sú ešte'}{' '}
                <strong>{matchingItems.length} {matchingItems.length === 1 ? 'ďalšia položka' : matchingItems.length < 5 ? 'ďalšie položky' : 'ďalších položiek'}</strong>{' '}
                s rovnakou farbou:
              </p>

              <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted">
                <div
                  className="h-6 w-6 rounded border border-border shadow-sm flex-shrink-0"
                  style={{ backgroundColor: color.hex_code || '#808080' }}
                />
                <span className="font-mono font-bold">{formatRALWithName(color.ral_code, color.color_name)}</span>
                {color.ral_code !== 'ZAKLAD' && (
                  <span className="text-sm text-muted-foreground">
                    / {STRUCTURE_TYPE_LABELS[color.structure]} / {GLOSS_TYPE_LABELS[color.gloss]}
                  </span>
                )}
              </div>

              <div className="rounded-lg border border-border p-3 space-y-1">
                {allItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      č. {item.global_production_number} - {item.description || 'Bez popisu'}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {Number(item.area_m2).toFixed(4)} m²
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Nechcete ich vážiť hromadne?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 text-base"
            onClick={onBatch}
          >
            <Scale className="mr-2 h-5 w-5" />
            Áno, hromadne vážiť
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={onIndividual}
          >
            Nie, len túto položku
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
