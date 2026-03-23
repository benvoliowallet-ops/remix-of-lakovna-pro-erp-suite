import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { sk } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/MainLayout';
import { ConsumptionStats } from '@/components/reports/ConsumptionStats';
import { ConsumptionChart } from '@/components/reports/ConsumptionChart';
import { ColorConsumptionChart } from '@/components/reports/ColorConsumptionChart';
import { WorkerEfficiencyChart } from '@/components/reports/WorkerEfficiencyChart';
import { ConsumptionTable } from '@/components/reports/ConsumptionTable';
import { InventoryAdjustmentsReport } from '@/components/reports/InventoryAdjustmentsReport';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type DateRange = {
  from: Date;
  to: Date;
};

type PeriodType = 'week' | 'month' | 'custom';

export default function Reports() {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [customRange, setCustomRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const getDateRange = (): DateRange => {
    const now = new Date();
    switch (period) {
      case 'week':
        return {
          from: startOfWeek(now, { locale: sk }),
          to: endOfWeek(now, { locale: sk }),
        };
      case 'month':
        return {
          from: startOfMonth(now),
          to: endOfMonth(now),
        };
      case 'custom':
        return customRange;
    }
  };

  const dateRange = getDateRange();

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reports', dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      // Fetch production logs with related data
      const { data: logs, error: logsError } = await supabase
        .from('production_logs')
        .select(`
          *,
          order_item:order_items(
            *,
            color:colors(*),
            order:orders(id, customer:customers(name))
          )
        `)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      // Fetch worker profiles
      const workerIds = [...new Set(logs?.map(l => l.worker_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', workerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      return {
        logs: logs || [],
        profileMap,
      };
    },
  });

  // Filter out doplnkova_sluzba items from stats
  const filteredLogs = (reportData?.logs || []).filter(
    log => log.order_item?.item_type !== 'doplnkova_sluzba'
  );
  const logs = filteredLogs;
  const profileMap = reportData?.profileMap || new Map();

  // Calculate stats
  const totalConsumed = logs.reduce((sum, log) => sum + (log.consumed_kg || 0), 0);
  const totalEstimated = logs.reduce((sum, log) => {
    const estimated = log.order_item?.estimated_consumption_kg || 0;
    return sum + estimated;
  }, 0);
  const efficiency = totalConsumed > 0 ? (totalEstimated / totalConsumed) * 100 : 0;
  const totalItems = logs.length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reporty - Spotreba farby</h1>
          <p className="text-muted-foreground">
            Prehľad efektivity výroby a spotreby materiálu
          </p>
        </div>

        {/* Period selector */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={period === 'week' ? 'default' : 'outline'}
            onClick={() => setPeriod('week')}
          >
            Tento týždeň
          </Button>
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            onClick={() => setPeriod('month')}
          >
            Tento mesiac
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={period === 'custom' ? 'default' : 'outline'}
                onClick={() => setPeriod('custom')}
                className={cn('justify-start text-left font-normal')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {period === 'custom'
                  ? `${format(customRange.from, 'dd.MM.yyyy')} - ${format(customRange.to, 'dd.MM.yyyy')}`
                  : 'Vlastné obdobie'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={customRange.from}
                selected={{ from: customRange.from, to: customRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setCustomRange({ from: range.from, to: range.to });
                    setPeriod('custom');
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Stats cards */}
        <ConsumptionStats
          totalConsumed={totalConsumed}
          totalEstimated={totalEstimated}
          efficiency={efficiency}
          totalItems={totalItems}
          isLoading={isLoading}
        />

        {/* Main chart */}
        <ConsumptionChart logs={logs} dateRange={dateRange} isLoading={isLoading} />

        {/* Secondary charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <ColorConsumptionChart logs={logs} isLoading={isLoading} />
          <WorkerEfficiencyChart logs={logs} profileMap={profileMap} isLoading={isLoading} />
        </div>

        {/* Detail table */}
        <ConsumptionTable logs={logs} profileMap={profileMap} isLoading={isLoading} />

        {/* Inventory Adjustments Report */}
        <InventoryAdjustmentsReport />
      </div>
    </MainLayout>
  );
}
