import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatRALWithName } from '@/lib/ral-colors';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

export function InventoryAdjustmentsReport() {
  const { data: adjustments, isLoading } = useQuery({
    queryKey: ['inventory-adjustments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_adjustments')
        .select('*, color:colors(ral_code, color_name, hex_code)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['all-profiles-adjustments'],
    queryFn: async () => {
      const workerIds = [...new Set(adjustments?.map(a => a.worker_id).filter(Boolean))];
      if (workerIds.length === 0) return new Map<string, string>();
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', workerIds);
      return new Map(data?.map(p => [p.id, p.full_name || 'Neznámy']) || []);
    },
    enabled: !!adjustments?.length,
  });

  const totalManko = adjustments?.filter(a => Number(a.difference_kg) < 0).reduce((s, a) => s + Math.abs(Number(a.difference_kg)), 0) || 0;
  const totalPrebytok = adjustments?.filter(a => Number(a.difference_kg) > 0).reduce((s, a) => s + Number(a.difference_kg), 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Manká a prebytky
        </CardTitle>
        <CardDescription>
          Sledovanie rozdielov medzi evidenčným stavom a skutočnou váhou farby
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Celkové manko</span>
            </div>
            <p className="text-2xl font-mono font-bold text-destructive">-{totalManko.toFixed(3)} kg</p>
          </div>
          <div className="rounded-lg bg-success/10 border border-success/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">Celkový prebytok</span>
            </div>
            <p className="text-2xl font-mono font-bold text-success">+{totalPrebytok.toFixed(3)} kg</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Načítavam...</p>
        ) : adjustments && adjustments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dátum</TableHead>
                <TableHead>Farba</TableHead>
                <TableHead>Pracovník</TableHead>
                <TableHead className="text-right">Evidencia (kg)</TableHead>
                <TableHead className="text-right">Skutočnosť (kg)</TableHead>
                <TableHead className="text-right">Rozdiel (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adjustments.map((adj) => {
                const diff = Number(adj.difference_kg);
                const color = adj.color as any;
                return (
                  <TableRow key={adj.id}>
                    <TableCell className="font-mono text-sm">
                      {new Date(adj.created_at).toLocaleString('sk-SK')}
                    </TableCell>
                    <TableCell>
                      {color ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded border border-border"
                            style={{ backgroundColor: color.hex_code || '#808080' }}
                          />
                          <span className="font-mono text-sm">
                            {formatRALWithName(color.ral_code, color.color_name)}
                          </span>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {profiles?.get(adj.worker_id) || '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(adj.expected_weight_kg).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(adj.actual_weight_kg).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={diff < 0
                          ? 'text-destructive border-destructive/50'
                          : 'text-success border-success/50'
                        }
                      >
                        <span className="font-mono">
                          {diff > 0 ? '+' : ''}{diff.toFixed(3)} kg
                        </span>
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center py-8 text-muted-foreground">Žiadne záznamy o rozdieloch</p>
        )}
      </CardContent>
    </Card>
  );
}
