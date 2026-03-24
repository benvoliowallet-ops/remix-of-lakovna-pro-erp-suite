import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Wrench, 
  CheckCircle2, 
  Truck, 
  Calendar, 
  Clock, 
  Building2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Interface for data returned by the edge function
interface PublicOrderData {
  id: number;
  status: string;
  statusMessage: string;
  statusColor: string;
  progressPercent: number;
  createdAt: string;
  deadlineAt: string | null;
  customerName: string | null;
  companyName: string | null;
  itemsTotal: number;
  itemsCompleted: number;
  itemsInProgress: number;
}

const STATUS_STEPS = [
  { key: 'prijate', label: 'Prijaté', icon: Package },
  { key: 'vo_vyrobe', label: 'Vo výrobe', icon: Wrench },
  { key: 'ukoncene', label: 'Dokončené', icon: CheckCircle2 },
  { key: 'odovzdane', label: 'Odovzdané', icon: Truck },
];

export default function PublicOrderStatus() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<PublicOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrderStatus() {
      if (!id) {
        setError('ID zákazky nie je zadané');
        setLoading(false);
        return;
      }

      try {
        // Fetch order status via secure edge function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-order-status?id=${id}`,
          {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 404) {
            setError('Zákazka s týmto číslom nebola nájdená');
          } else {
            console.error('Order fetch error:', errorData);
            setError('Nepodarilo sa načítať stav zákazky');
          }
          return;
        }

        const publicData = await response.json();
        setOrder(publicData as PublicOrderData);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Nepodarilo sa načítať stav zákazky');
      } finally {
        setLoading(false);
      }
    }

    fetchOrderStatus();

    const interval = setInterval(fetchOrderStatus, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const getCurrentStepIndex = () => {
    if (!order) return -1;
    return STATUS_STEPS.findIndex(step => step.key === order.status);
  };

  const getStepStatus = (index: number) => {
    const currentIndex = getCurrentStepIndex();
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'pending';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Načítavam stav zákazky...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Zákazka nenájdená</h2>
            <p className="text-muted-foreground">
              {error || 'Nepodarilo sa načítať informácie o zákazke.'}
            </p>
            <p className="text-sm text-muted-foreground">
              Skontrolujte prosím číslo zákazky a skúste znova.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">Sledovanie zákazky</h1>
              <p className="text-sm text-muted-foreground">#{order.id}</p>
            </div>
          </div>
          {order.companyName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {order.companyName}
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Main Status Card */}
        <Card className="overflow-hidden">
          <div className={cn(
            'h-2',
            order.statusColor === 'blue' && 'bg-blue-500',
            order.statusColor === 'yellow' && 'bg-yellow-500',
            order.statusColor === 'green' && 'bg-green-500',
            order.statusColor === 'gray' && 'bg-gray-500'
          )} />
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl">
              Zákazka #{order.id}
            </CardTitle>
            {order.customerName && (
              <CardDescription className="text-base">
                {order.customerName}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Message */}
            <div className="text-center space-y-2">
              <Badge 
                variant="outline" 
                className={cn(
                  'text-lg px-4 py-2',
                  order.statusColor === 'blue' && 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950',
                  order.statusColor === 'yellow' && 'border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950',
                  order.statusColor === 'green' && 'border-green-500 text-green-600 bg-green-50 dark:bg-green-950',
                  order.statusColor === 'gray' && 'border-gray-500 text-gray-600 bg-gray-50 dark:bg-gray-900'
                )}
              >
                {order.statusMessage}
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Postup výroby</span>
                <span className="font-medium">{order.progressPercent}%</span>
              </div>
              <Progress value={order.progressPercent} className="h-3" />
              {order.itemsTotal > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {order.itemsCompleted} z {order.itemsTotal} položiek dokončených
                  {order.itemsInProgress > 0 && ` • ${order.itemsInProgress} v práci`}
                </p>
              )}
            </div>

            <Separator />

            {/* Status Timeline */}
            <div className="relative">
              <div className="flex justify-between">
                {STATUS_STEPS.map((step, index) => {
                  const status = getStepStatus(index);
                  const Icon = step.icon;
                  
                  return (
                    <div key={step.key} className="flex flex-col items-center relative z-10">
                      <div className={cn(
                        'h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all',
                        status === 'completed' && 'bg-green-500 border-green-500 text-white',
                        status === 'current' && 'bg-primary border-primary text-primary-foreground animate-pulse',
                        status === 'pending' && 'bg-muted border-muted-foreground/30 text-muted-foreground'
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={cn(
                        'text-xs mt-2 font-medium text-center',
                        status === 'current' && 'text-primary',
                        status === 'pending' && 'text-muted-foreground'
                      )}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* Connection Line */}
              <div className="absolute top-6 left-6 right-6 h-0.5 bg-muted -z-0">
                <div 
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${Math.max(0, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detaily zákazky</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Prijaté</p>
                  <p className="font-medium">
                    {format(new Date(order.createdAt), 'dd. MMMM yyyy', { locale: sk })}
                  </p>
                </div>
              </div>
              
              {order.deadlineAt && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Termín</p>
                    <p className="font-medium">
                      {format(new Date(order.deadlineAt), 'dd. MMMM yyyy', { locale: sk })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
    <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            Pre viac informácií nás kontaktujte telefonicky alebo emailom.
          </p>
          <p className="text-xs">
            Táto stránka sa automaticky neaktualizuje. Pre aktuálny stav obnovte stránku.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Obnoviť stav
          </button>
        </div>
      </main>
    </div>
  );
}
