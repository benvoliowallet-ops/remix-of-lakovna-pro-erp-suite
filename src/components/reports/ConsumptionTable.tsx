import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface ProductionLog {
  id: string;
  created_at: string | null;
  consumed_kg: number | null;
  worker_id: string | null;
  order_item?: {
    estimated_consumption_kg: number | null;
    area_m2: number | null;
    color?: {
      ral_code: string;
    } | null;
    order?: {
      id: number;
      customer?: {
        name: string;
      } | null;
    } | null;
  } | null;
}

interface ConsumptionTableProps {
  logs: ProductionLog[];
  profileMap: Map<string, string | null>;
  isLoading: boolean;
}

export function ConsumptionTable({ logs, profileMap, isLoading }: ConsumptionTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');

  // Get unique workers and colors for filters
  const workers = useMemo(() => {
    const unique = new Set<string>();
    logs.forEach((log) => {
      if (log.worker_id) unique.add(log.worker_id);
    });
    return Array.from(unique);
  }, [logs]);

  const colors = useMemo(() => {
    const unique = new Set<string>();
    logs.forEach((log) => {
      const ral = log.order_item?.color?.ral_code;
      if (ral) unique.add(ral);
    });
    return Array.from(unique).sort();
  }, [logs]);

  // Calculate variance and filter logs
  const processedLogs = useMemo(() => {
    return logs
      .map((log) => {
        const estimated = log.order_item?.estimated_consumption_kg || 0;
        const consumed = log.consumed_kg || 0;
        const variance = estimated > 0 ? ((consumed - estimated) / estimated) * 100 : 0;
        const isOverConsumed = variance > 15; // More than 15% over estimated

        return {
          ...log,
          variance,
          isOverConsumed,
        };
      })
      .filter((log) => {
        if (statusFilter === 'normal' && log.isOverConsumed) return false;
        if (statusFilter === 'over' && !log.isOverConsumed) return false;
        if (workerFilter !== 'all' && log.worker_id !== workerFilter) return false;
        if (colorFilter !== 'all' && log.order_item?.color?.ral_code !== colorFilter) return false;
        return true;
      });
  }, [logs, statusFilter, workerFilter, colorFilter]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Detailný prehľad</CardTitle>
            <CardDescription>Všetky záznamy spotreby za zvolené obdobie</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všetky</SelectItem>
                <SelectItem value="normal">V norme</SelectItem>
                <SelectItem value="over">Nadmerné</SelectItem>
              </SelectContent>
            </Select>
            <Select value={workerFilter} onValueChange={setWorkerFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Pracovník" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všetci</SelectItem>
                {workers.map((workerId) => (
                  <SelectItem key={workerId} value={workerId}>
                    {profileMap.get(workerId) || 'Neznámy'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={colorFilter} onValueChange={setColorFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Farba" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všetky</SelectItem>
                {colors.map((ral) => (
                  <SelectItem key={ral} value={ral}>
                    {ral}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {processedLogs.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            Žiadne záznamy pre zvolené filtre
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dátum</TableHead>
                  <TableHead>Zákazka</TableHead>
                  <TableHead>Farba</TableHead>
                  <TableHead>Pracovník</TableHead>
                  <TableHead className="text-right">Plocha (m²)</TableHead>
                  <TableHead className="text-right">Odhad (kg)</TableHead>
                  <TableHead className="text-right">Reálna (kg)</TableHead>
                  <TableHead className="text-right">Rozdiel</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {log.created_at
                        ? format(new Date(log.created_at), 'dd.MM.yyyy', { locale: sk })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {log.order_item?.order?.id ? (
                        <Link
                          to={`/zakazky/${log.order_item.order.id}`}
                          className="text-primary hover:underline"
                        >
                          #{log.order_item.order.id}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {log.order_item?.color?.ral_code || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>{profileMap.get(log.worker_id || '') || '-'}</TableCell>
                    <TableCell className="text-right">
                      {log.order_item?.area_m2?.toFixed(2) || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.order_item?.estimated_consumption_kg?.toFixed(3) || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.consumed_kg?.toFixed(3) || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          log.isOverConsumed
                            ? 'text-destructive font-medium'
                            : 'text-green-600'
                        }
                      >
                        {log.variance > 0 ? '+' : ''}
                        {log.variance.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {log.isOverConsumed ? (
                        <AlertTriangle className="mx-auto h-5 w-5 text-destructive" />
                      ) : (
                        <CheckCircle className="mx-auto h-5 w-5 text-green-600" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
