import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Filter, Paintbrush, AlertTriangle, Plus, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { STRUCTURE_TYPE_LABELS, GLOSS_TYPE_LABELS } from '@/lib/types';
import type { Color } from '@/lib/types';
import { findRALColor, formatRALWithName } from '@/lib/ral-colors';
import { AddColorDialog } from '@/components/inventory/AddColorDialog';
import { EditColorDialog } from '@/components/inventory/EditColorDialog';
import { useTenantSettings } from '@/hooks/useTenantSettings';

export default function Inventory() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { settings } = useTenantSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [structureFilter, setStructureFilter] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(searchParams.get('filter') === 'low-stock');
  const [cleanGunDialog, setCleanGunDialog] = useState(false);
  const [selectedColorForCleaning, setSelectedColorForCleaning] = useState<string>('');
  const [addColorDialog, setAddColorDialog] = useState(false);
  const [editColorDialog, setEditColorDialog] = useState(false);
  const [selectedColorForEdit, setSelectedColorForEdit] = useState<Color | null>(null);

  // Sync URL params
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'low-stock') {
      setShowLowStockOnly(true);
    }
  }, [searchParams]);

  // Update URL when filter changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (showLowStockOnly) params.set('filter', 'low-stock');
    if (structureFilter !== 'all') params.set('structure', structureFilter);
    setSearchParams(params, { replace: true });
  }, [showLowStockOnly, structureFilter, setSearchParams]);

  const { data: colors, isLoading } = useQuery({
    queryKey: ['colors', structureFilter],
    queryFn: async () => {
      let query = supabase
        .from('colors')
        .select('*')
        .order('ral_code', { ascending: true });

      if (structureFilter !== 'all') {
        query = query.eq('structure', structureFilter as 'hladka' | 'jemna' | 'hruba' | 'antik' | 'kladivkova');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Color[];
    },
  });

  const cleanGunMutation = useMutation({
    mutationFn: async (colorId: string) => {
      const color = colors?.find(c => c.id === colorId);
      if (!color) throw new Error('Farba nenájdená');

      const newStock = Math.max(0, Number(color.stock_kg) - 0.3);
      const { error } = await supabase
        .from('colors')
        .update({ stock_kg: newStock })
        .eq('id', colorId);

      if (error) throw error;

      await supabase
        .from('inventory_adjustments')
        .insert({
          color_id: colorId,
          actual_weight_kg: newStock,
          expected_weight_kg: Number(color.stock_kg),
          difference_kg: -0.3,
          reason: 'Čistenie striekacej pištole',
        });

      return { color, newStock };
    },
    onSuccess: ({ color, newStock }) => {
      toast.success(`Čistenie pištole: RAL ${color.ral_code}`, {
        description: `Odčítané 0.3 kg. Nový stav: ${newStock.toFixed(3)} kg`,
      });
      queryClient.invalidateQueries({ queryKey: ['colors'] });
      setCleanGunDialog(false);
      setSelectedColorForCleaning('');
    },
    onError: () => {
      toast.error('Chyba pri čistení pištole');
    },
  });

  const isLowStock = (color: Color) => Number(color.stock_kg) < Number(color.min_stock_limit);

  const filteredColors = colors?.filter(color => {
    const matchesSearch = 
      color.ral_code.toLowerCase().includes(search.toLowerCase()) ||
      (color.color_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesLowStock = showLowStockOnly ? isLowStock(color) : true;
    return matchesSearch && matchesLowStock;
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sklad farieb</h1>
            <p className="text-muted-foreground">Správa zásob práškových farieb</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={cleanGunDialog} onOpenChange={setCleanGunDialog}>
            <DialogTrigger asChild>
                <Button variant="outline">
                  <Paintbrush className="mr-2 h-4 w-4" />
                  Čistenie pištole
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Čistenie pištole</DialogTitle>
                  <DialogDescription>
                    Vyberte farbu, z ktorej sa odčíta 0.3 kg pre čistenie striekacej pištole.
                  </DialogDescription>
                </DialogHeader>
                <Select value={selectedColorForCleaning} onValueChange={setSelectedColorForCleaning}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte farbu" />
                  </SelectTrigger>
                  <SelectContent>
                    {colors?.map((color) => (
                      <SelectItem key={color.id} value={color.id}>
                        {formatRALWithName(color.ral_code, color.color_name)} - {STRUCTURE_TYPE_LABELS[color.structure]} ({Number(color.stock_kg).toFixed(3)} kg)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCleanGunDialog(false)}>
                    Zrušiť
                  </Button>
                  <Button
                    onClick={() => cleanGunMutation.mutate(selectedColorForCleaning)}
                    disabled={!selectedColorForCleaning || cleanGunMutation.isPending}
                  >
                    Potvrdiť (-0.3 kg)
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {isAdmin && (
              <Button 
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => setAddColorDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Pridať farbu
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hľadať podľa RAL kódu alebo názvu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={structureFilter} onValueChange={setStructureFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Štruktúra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všetky štruktúry</SelectItem>
                {Object.entries(STRUCTURE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showLowStockOnly ? 'default' : 'outline'}
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={showLowStockOnly ? 'bg-warning text-warning-foreground hover:bg-warning/90' : ''}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Nízky stav
            </Button>
          </CardContent>
        </Card>

        {/* Low stock filter indicator */}
        {showLowStockOnly && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 bg-warning/20 text-warning-foreground">
              Zobrazené iba farby pod limitom
              <button 
                onClick={() => setShowLowStockOnly(false)}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          </div>
        )}

        {/* Colors Table */}
        <Card>
          <CardHeader>
            <CardTitle>Zoznam farieb</CardTitle>
            <CardDescription>
              {filteredColors?.filter(isLowStock).length || 0} farieb pod minimálnym stavom
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RAL kód</TableHead>
                  <TableHead>Štruktúra</TableHead>
                  <TableHead>Lesk</TableHead>
                  <TableHead className="text-right">Stav (kg)</TableHead>
                  <TableHead className="text-right">Min. stav</TableHead>
                  {isAdmin && <TableHead className="text-right">Cena/kg</TableHead>}
                  {isAdmin && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColors?.map((color) => (
                  <TableRow key={color.id} className={isLowStock(color) ? 'bg-warning/5' : ''}>
                    <TableCell className="font-mono font-bold">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-5 w-5 rounded border border-border shadow-sm flex-shrink-0"
                          style={{ backgroundColor: color.hex_code || findRALColor(color.ral_code)?.hex || '#808080' }}
                          title={color.hex_code || findRALColor(color.ral_code)?.hex || 'Neznáma farba'}
                        />
                        {formatRALWithName(color.ral_code, color.color_name)}
                        {isLowStock(color) && (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {STRUCTURE_TYPE_LABELS[color.structure]}
                      </Badge>
                    </TableCell>
                    <TableCell>{GLOSS_TYPE_LABELS[color.gloss]}</TableCell>
                    <TableCell className={`text-right font-mono ${isLowStock(color) ? 'text-warning font-bold' : ''}`}>
                      {Number(color.stock_kg).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {Number(color.min_stock_limit).toFixed(3)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right font-mono">
                        {Number(color.price_per_kg).toFixed(2)} €
                      </TableCell>
                    )}
                    {isAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedColorForEdit(color);
                            setEditColorDialog(true);
                          }}
                          title="Upraviť farbu"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 5} className="text-center">
                      Načítavam...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && (!filteredColors || filteredColors.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 5} className="text-center text-muted-foreground">
                      Žiadne farby
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add Color Dialog */}
        <AddColorDialog
          open={addColorDialog}
          onOpenChange={setAddColorDialog}
        />

        {/* Edit Color Dialog */}
        <EditColorDialog
          open={editColorDialog}
          onOpenChange={setEditColorDialog}
          color={selectedColorForEdit}
        />
      </div>
    </MainLayout>
  );
}
