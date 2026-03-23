import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';

export function CookieBanner() {
  const [show, setShow] = useState(() => !localStorage.getItem('cookie_consent'));

  if (!show) return null;

  const accept = () => { localStorage.setItem('cookie_consent', 'accepted'); setShow(false); };
  const decline = () => { localStorage.setItem('cookie_consent', 'declined'); setShow(false); };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background shadow-lg">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Táto aplikácia používa len nevyhnutné technické cookies pre správne fungovanie.
            Nepoužívame reklamné ani analytické cookies.
          </p>
        </div>
        <div className="flex shrink-0 gap-2 self-end sm:self-auto">
          <Button size="sm" variant="outline" onClick={decline}>
            Zamietnuť
          </Button>
          <Button size="sm" onClick={accept}>
            Rozumiem
          </Button>
        </div>
      </div>
    </div>
  );
}
