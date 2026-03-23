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
} from 'recharts';
import { formatRALWithName } from '@/lib/ral-colors';

interface ProductionLog {
  id: string;
  consumed_kg: number | null;
  order_item?: {
    color?: {
      ral_code: string;
      color_name?: string | null;
    } | null;
  } | null;
}

interface ColorConsumptionChartProps {
  logs: ProductionLog[];
  isLoading: boolean;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function ColorConsumptionChart({ logs, isLoading }: ColorConsumptionChartProps) {
  const chartData = useMemo(() => {
    const colorMap = new Map<string, { consumed: number; colorName?: string | null }>();

    logs.forEach((log) => {
      const ralCode = log.order_item?.color?.ral_code || 'Neznáma';
      const colorName = log.order_item?.color?.color_name;
      const current = colorMap.get(ralCode) || { consumed: 0, colorName };
      colorMap.set(ralCode, { 
        consumed: current.consumed + (log.consumed_kg || 0),
        colorName: colorName || current.colorName 
      });
    });

    return Array.from(colorMap.entries())
      .map(([ral_code, data]) => ({
        ral_code,
        display_name: ral_code === 'Neznáma' ? 'Neznáma' : formatRALWithName(ral_code, data.colorName),
        consumed: Number(data.consumed.toFixed(3)),
      }))
      .sort((a, b) => b.consumed - a.consumed)
      .slice(0, 10);
  }, [logs]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
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
        <CardTitle>Spotreba podľa farby</CardTitle>
        <CardDescription>Top 10 farieb podľa spotreby</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Žiadne dáta pre zvolené obdobie
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  type="number"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${value} kg`}
                />
                <YAxis
                  type="category"
                  dataKey="display_name"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  width={160}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(3)} kg`, 'Spotreba']}
                />
                <Bar dataKey="consumed" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
