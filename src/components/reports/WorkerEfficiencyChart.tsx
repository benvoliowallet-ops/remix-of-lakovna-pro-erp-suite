import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

interface ProductionLog {
  id: string;
  consumed_kg: number | null;
  worker_id: string | null;
  order_item?: {
    estimated_consumption_kg: number | null;
  } | null;
}

interface WorkerEfficiencyChartProps {
  logs: ProductionLog[];
  profileMap: Map<string, string | null>;
  isLoading: boolean;
}

export function WorkerEfficiencyChart({ logs, profileMap, isLoading }: WorkerEfficiencyChartProps) {
  const chartData = useMemo(() => {
    const workerMap = new Map<string, { consumed: number; estimated: number }>();

    logs.forEach((log) => {
      if (!log.worker_id) return;

      const current = workerMap.get(log.worker_id) || { consumed: 0, estimated: 0 };
      workerMap.set(log.worker_id, {
        consumed: current.consumed + (log.consumed_kg || 0),
        estimated: current.estimated + (log.order_item?.estimated_consumption_kg || 0),
      });
    });

    return Array.from(workerMap.entries())
      .map(([workerId, data]) => {
        const efficiency = data.consumed > 0 ? (data.estimated / data.consumed) * 100 : 0;
        return {
          workerId,
          name: profileMap.get(workerId) || 'Neznámy',
          efficiency: Number(efficiency.toFixed(1)),
          consumed: Number(data.consumed.toFixed(3)),
          estimated: Number(data.estimated.toFixed(3)),
        };
      })
      .sort((a, b) => b.efficiency - a.efficiency);
  }, [logs, profileMap]);

  const getBarColor = (efficiency: number) => {
    if (efficiency >= 85) return 'hsl(142, 76%, 36%)'; // green
    if (efficiency >= 70) return 'hsl(48, 96%, 53%)'; // yellow
    return 'hsl(0, 84%, 60%)'; // red
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Efektivita pracovníkov</CardTitle>
        <CardDescription>Pomer odhadovanej a reálnej spotreby (%)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Žiadne dáta pre zvolené obdobie
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'efficiency') return [`${value}%`, 'Efektivita'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Pracovník: ${label}`}
                />
                <ReferenceLine y={85} stroke="hsl(142, 76%, 36%)" strokeDasharray="3 3" />
                <ReferenceLine y={70} stroke="hsl(48, 96%, 53%)" strokeDasharray="3 3" />
                <Bar dataKey="efficiency" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.efficiency)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-4 flex justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} />
            <span>≥85% Výborná</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(48, 96%, 53%)' }} />
            <span>70-85% Dobrá</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }} />
            <span>&lt;70% Slabá</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
