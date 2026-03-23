import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Loader2, AlertTriangle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderItem, WorkStatus } from '@/lib/types';

interface WorkflowProgressProps {
  items: OrderItem[];
  className?: string;
}

export function WorkflowProgress({ items, className }: WorkflowProgressProps) {
  const total = items.length;
  const completed = items.filter(i => i.work_status === 'completed').length;
  const inProgress = items.filter(i => i.work_status === 'in_progress').length;
  const pending = items.filter(i => i.work_status === 'pending' || !i.work_status).length;
  
  const progressPercent = total > 0 ? (completed / total) * 100 : 0;
  const hasInProgress = inProgress > 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress bar */}
      <div className="relative">
        <Progress 
          value={progressPercent} 
          className="h-4 bg-muted"
        />
        {hasInProgress && (
          <div 
            className="absolute top-0 h-4 bg-amber-500/50 animate-pulse rounded-r-full"
            style={{ 
              left: `${progressPercent}%`, 
              width: `${(inProgress / total) * 100}%` 
            }}
          />
        )}
      </div>

      {/* Status counts */}
      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
        <StatusBadge 
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Hotové"
          count={completed}
          variant="success"
        />
        <StatusBadge 
          icon={<Loader2 className="h-4 w-4 animate-spin" />}
          label="V práci"
          count={inProgress}
          variant="warning"
        />
        <StatusBadge 
          icon={<Clock className="h-4 w-4" />}
          label="Čaká"
          count={pending}
          variant="muted"
        />
      </div>

      {/* Overall status message */}
      <div className="text-center sm:text-left">
        {completed === total && total > 0 && (
          <p className="text-success font-semibold flex items-center gap-2 justify-center sm:justify-start">
            <CheckCircle2 className="h-5 w-5" />
            Všetky položky dokončené!
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ 
  icon, 
  label, 
  count, 
  variant 
}: { 
  icon: React.ReactNode; 
  label: string; 
  count: number; 
  variant: 'success' | 'warning' | 'muted';
}) {
  const variantStyles = {
    success: 'bg-success/10 text-success border-success/30',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    muted: 'bg-muted text-muted-foreground border-muted-foreground/20',
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1.5 px-3 py-1.5 text-sm font-medium",
        variantStyles[variant]
      )}
    >
      {icon}
      <span>{count}</span>
      <span className="hidden sm:inline">{label}</span>
    </Badge>
  );
}

// Helper component to show workflow constraints
interface WorkflowConstraintProps {
  items: OrderItem[];
  currentItemId: string;
}

export function getWorkflowConstraint(items: OrderItem[], currentItemId: string): { canStart: boolean; reason?: string } {
  const currentItem = items.find(i => i.id === currentItemId);
  if (!currentItem) return { canStart: false, reason: 'Položka nenájdená' };

  // If current item is top coat, check if its base coat is completed
  if (currentItem.base_coat_id) {
    const baseCoat = items.find(i => i.id === currentItem.base_coat_id);
    if (baseCoat && baseCoat.work_status !== 'completed') {
      return { 
        canStart: false, 
        reason: 'Najskôr dokončite základnú vrstvu (ZÁKLAD)' 
      };
    }
  }

  // If current item IS a base coat (item_type === 'zaklad'), check if its related top coat exists
  // This is fine - base coat can always start if nothing else is in progress

  return { canStart: true };
}

export function WorkflowConstraintBadge({ constraint }: { constraint: { canStart: boolean; reason?: string } }) {
  if (constraint.canStart) return null;

  return (
    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg text-sm">
      <Lock className="h-4 w-4 flex-shrink-0" />
      <span>{constraint.reason}</span>
    </div>
  );
}
