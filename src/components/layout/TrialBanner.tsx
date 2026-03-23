import { AlertTriangle, XCircle } from 'lucide-react';
import { useTenantStatus } from '@/hooks/useTenantStatus';

export function TrialBanner() {
  const { isTrial, isExpired, daysLeft } = useTenantStatus();

  if (!isTrial) return null;

  if (isExpired) {
    return (
      <div className="flex items-center gap-3 bg-destructive/15 border-b border-destructive/30 px-6 py-3 text-sm">
        <XCircle className="h-4 w-4 shrink-0 text-destructive" />
        <span className="text-destructive font-medium">
          Váš trial vypršal. Kontaktujte nás pre aktiváciu účtu.
        </span>
      </div>
    );
  }

  if (daysLeft <= 7) {
    return (
      <div className="flex items-center gap-3 bg-yellow-500/10 border-b border-yellow-500/30 px-6 py-3 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
        <span className="text-yellow-800 dark:text-yellow-300 font-medium">
          Trial končí o {daysLeft} {daysLeft === 1 ? 'deň' : daysLeft < 5 ? 'dni' : 'dní'}.
          Pre pokračovanie kontaktujte nás.
        </span>
      </div>
    );
  }

  return null;
}
