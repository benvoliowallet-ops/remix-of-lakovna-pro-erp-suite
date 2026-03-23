import { useMemo } from 'react';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { sk } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ProductionLog {
  id: string;
  created_at: string | null;
  consumed_kg: number | null;
  order_item?: {
    estimated_consumption_kg: number | null;
  } | null;
}

interface ConsumptionChartProps {
  logs: ProductionLog[];
  dateRange: { from: Date; to: Date };
  isLoading: boolean;
}

export function ConsumptionChart({ logs, dateRange, isLoading }: ConsumptionChartProps) {
  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

    return days.map((day) => {
      const dayLogs = logs.filter(
        (log) => log.created_at && isSameDay(new Date(log.created_at), day)
      );

      const consumed = dayLogs.reduce((sum, log) => sum + (log.consumed_kg || 0), 0);
      const estimated = dayLogs.reduce(
        (sum, log) => sum + (log.order_item?.estimated_consumption_kg || 0),
        0
      );

      return {
        date: format(day, 'dd.MM', { locale: sk }),
        fullDate: format(day, 'EEEE, dd.MM.yyyy', { locale: sk }),
        consumed: Number(consumed.toFixed(3)),
        estimated: Number(estimated.toFixed(3)),
      };
    });
  }, [logs, dateRange]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spotreba v čase</CardTitle>
        <CardDescription>Porovnanie odhadovanej a reálnej spotreby farby</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${value} kg`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(3)} kg`,
                  name === 'consumed' ? 'Reálna spotreba' : 'Odhadovaná spotreba',
                ]}
              />
              <Legend
                formatter={(value) =>
                  value === 'consumed' ? 'Reálna spotreba' : 'Odhadovaná spotreba'
                }
              />
              <Line
                type="monotone"
                dataKey="estimated"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="consumed"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
