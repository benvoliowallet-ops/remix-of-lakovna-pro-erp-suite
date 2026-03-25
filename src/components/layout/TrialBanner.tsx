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
      <div
        className="flex items-center gap-3 px-6 py-3 text-sm border-b"
        style={{
          background: 'rgba(242, 75, 89, 0.08)',
          borderBottomColor: 'rgba(242, 75, 89, 0.3)',
          color: '#F24B59',
        }}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: '#F24B59' }} />
        <span className="font-medium">
          Trial končí o {daysLeft} {daysLeft === 1 ? 'deň' : daysLeft < 5 ? 'dni' : 'dní'}.
          Pre pokračovanie kontaktujte nás.
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-6 py-3 text-sm border-b"
      style={{
        background: 'rgba(242, 118, 46, 0.08)',
        borderBottomColor: 'rgba(242, 118, 46, 0.3)',
        color: '#F2762E',
      }}
    >
      <span>
        Ste na 14-dňovom trial. Zostáva vám <strong>{daysLeft} dní</strong>.
      </span>
    </div>
  );
}
