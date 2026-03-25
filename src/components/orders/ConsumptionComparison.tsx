import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface ConsumptionComparisonProps {
  estimatedKg: number;
  realKg: number;
  className?: string;
  tolerancePct?: number;
}

export function ConsumptionComparison({ estimatedKg, realKg, className = '', tolerancePct }: ConsumptionComparisonProps) {
  const difference = realKg - estimatedKg;
  const percentDiff = estimatedKg > 0 ? (difference / estimatedKg) * 100 : 0;

  const tolerance = tolerancePct ?? 15;
  const isOverConsumption = percentDiff > tolerance;
  const isUnderConsumption = percentDiff < -tolerance;

  const getStatusColor = () => {
    if (isOverConsumption) return 'text-destructive';
    if (isUnderConsumption) return 'text-success';
    return 'text-muted-foreground';
  };

  const getStatusBg = () => {
    if (isOverConsumption) return 'bg-destructive/10';
    if (isUnderConsumption) return 'bg-success/10';
    return 'bg-muted';
  };

  const StatusIcon = isOverConsumption ? TrendingUp : isUnderConsumption ? TrendingDown : Minus;

  if (estimatedKg === 0 && realKg === 0) {
    return null;
  }

  return (
    <div className={`rounded-lg p-4 ${getStatusBg()} ${className}`}>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-muted-foreground uppercase mb-1">Odhad</p>
          <p className="font-mono font-semibold">{estimatedKg.toFixed(3)} kg</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase mb-1">Reálna</p>
          <p className="font-mono font-semibold">{realKg.toFixed(3)} kg</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase mb-1">Rozdiel</p>
          <div className={`flex items-center justify-center gap-1 ${getStatusColor()}`}>
            <StatusIcon className="h-4 w-4" />
            <span className="font-mono font-semibold">
              {difference >= 0 ? '+' : ''}{difference.toFixed(3)} kg
            </span>
          </div>
          <p className={`text-xs font-medium ${getStatusColor()}`}>
            ({percentDiff >= 0 ? '+' : ''}{percentDiff.toFixed(1)}%)
          </p>
        </div>
      </div>
    </div>
  );
}
