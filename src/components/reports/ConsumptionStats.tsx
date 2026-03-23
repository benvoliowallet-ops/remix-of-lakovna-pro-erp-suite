import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Scale, Target, TrendingUp, Package } from 'lucide-react';

interface ConsumptionStatsProps {
  totalConsumed: number;
  totalEstimated: number;
  efficiency: number;
  totalItems: number;
  isLoading: boolean;
}

export function ConsumptionStats({
  totalConsumed,
  totalEstimated,
  efficiency,
  totalItems,
  isLoading,
}: ConsumptionStatsProps) {
  const stats = [
    {
      title: 'Celková spotreba',
      value: `${totalConsumed.toFixed(3)} kg`,
      icon: Scale,
      description: 'Reálne spotrebovaná farba',
    },
    {
      title: 'Odhadovaná spotreba',
      value: `${totalEstimated.toFixed(3)} kg`,
      icon: Target,
      description: 'Podľa výpočtov',
    },
    {
      title: 'Efektivita',
      value: `${efficiency.toFixed(1)}%`,
      icon: TrendingUp,
      description: efficiency >= 85 ? 'Výborná' : efficiency >= 70 ? 'Dobrá' : 'Potrebuje zlepšenie',
      color: efficiency >= 85 ? 'text-green-600' : efficiency >= 70 ? 'text-yellow-600' : 'text-red-600',
    },
    {
      title: 'Počet položiek',
      value: totalItems.toString(),
      icon: Package,
      description: 'Spracovaných záznamov',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stat.color || ''}`}>{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
