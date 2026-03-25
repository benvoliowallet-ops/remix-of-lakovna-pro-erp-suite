import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Trash2, Plus, Check, X, Tag, Settings2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTenantSettings, TenantSettings } from '@/hooks/useTenantSettings';

const UNIT_OPTIONS = [
  { value: 'm2', label: 'm²' },
  { value: 'ks', label: 'ks' },
  { value: 'bm', label: 'bm (bežný meter)' },
];

export default function Konfiguracia() {
  // ── Cenník state ──
  const [addForm, setAddForm] = useState({ name: '', unit: 'm2', price: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ price: '', unit: '' });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Parametre výroby state ──
  const { settings, updateSettings, isUpdating } = useTenantSettings();
  const [form, setForm] = useState<TenantSettings | null>(null);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings]);

  // ── Cenník queries ──
  const { data: priceList, refetch: refetchPriceList } = useQuery({
    queryKey: ['price_list'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('price_list') as any).select('*').order('name');
      if (error) throw error;
      return data as { id: string; name: string; unit: string; price_per_m2: number; item_type: string }[];
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: { name: string; unit: string; price_per_m2: number }) => {
      const { error } = await (supabase.from('price_list') as any).insert({
        item_type: item.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        name: item.name,
        unit: item.unit,
        price_per_m2: item.price_per_m2,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Položka pridaná');
      refetchPriceList();
      setAddForm({ name: '', unit: 'm2', price: '' });
    },
    onError: () => toast.error('Chyba pri pridávaní položky'),
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, price_per_m2, unit }: { id: string; price_per_m2: number; unit: string }) => {
      const { error } = await supabase.from('price_list').update({ price_per_m2, unit }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Položka aktualizovaná');
      refetchPriceList();
      setEditingId(null);
    },
    onError: () => toast.error('Chyba pri aktualizácii'),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('price_list').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Položka vymazaná');
      refetchPriceList();
    },
    onError: () => toast.error('Chyba pri mazaní'),
  });

  const startEdit = (item: { id: string; price_per_m2: number; unit: string }) => {
    setEditingId(item.id);
    setEditValues({ price: String(item.price_per_m2), unit: item.unit || 'm2' });
  };

  const saveEdit = () => {
    if (!editingId) return;
    const price = parseFloat(editValues.price);
    if (isNaN(price) || price < 0) { toast.error('Zadajte platnú cenu'); return; }
    updateItemMutation.mutate({ id: editingId, price_per_m2: price, unit: editValues.unit });
  };

  const handleAdd = () => {
    if (!addForm.name.trim()) { toast.error('Zadajte názov položky'); return; }
    const price = parseFloat(addForm.price);
    if (isNaN(price) || price < 0) { toast.error('Zadajte platnú cenu'); return; }
    addItemMutation.mutate({ name: addForm.name.trim(), unit: addForm.unit, price_per_m2: price });
  };

  const handleSaveParams = async () => {
    if (!form) return;
    try {
      await updateSettings(form);
      toast.success('Parametre uložené');
    } catch {
      toast.error('Chyba pri ukladaní parametrov');
    }
  };

  const deleteTarget = priceList?.find(i => i.id === deleteConfirmId);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Konfigurácia</h1>
          <p className="text-muted-foreground">Správa cenníka, parametrov výroby a povrchových úprav</p>
        </div>

        <Tabs defaultValue="cennik">
          <TabsList>
            <TabsTrigger value="cennik">Cenník</TabsTrigger>
            <TabsTrigger value="parametre">Parametre výroby</TabsTrigger>
            <TabsTrigger value="struktury">Štruktúry a lesky</TabsTrigger>
          </TabsList>

          {/* ── CENNÍK ── */}
          <TabsContent value="cennik" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Položky cenníka
                </CardTitle>
                <CardDescription>Ceny za jednotku pre jednotlivé typy charakterov</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Názov</TableHead>
                      <TableHead className="w-[140px]">Jednotka</TableHead>
                      <TableHead className="text-right w-[140px]">Cena</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceList?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name || item.item_type}</TableCell>

                        <TableCell>
                          {editingId === item.id ? (
                            <Select
                              value={editValues.unit}
                              onValueChange={(v) => setEditValues(e => ({ ...e, unit: v }))}
                            >
                              <SelectTrigger className="h-8 w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {UNIT_OPTIONS.map(u => (
                                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              {UNIT_OPTIONS.find(u => u.value === item.unit)?.label ?? item.unit ?? 'm²'}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          {editingId === item.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={editValues.price}
                                onChange={(e) => setEditValues(v => ({ ...v, price: e.target.value }))}
                                className="h-8 w-24 font-mono text-right"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                              />
                              <span className="text-muted-foreground text-sm">€</span>
                            </div>
                          ) : (
                            <span className="font-mono">{Number(item.price_per_m2).toFixed(2)} €</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {editingId === item.id ? (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost"
                                onClick={saveEdit}
                                disabled={updateItemMutation.isPending}
                                className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                              ><Check className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost"
                                onClick={() => setEditingId(null)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              ><X className="h-4 w-4" /></Button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost"
                                onClick={() => startEdit(item)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-accent"
                              ><Pencil className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost"
                                onClick={() => setDeleteConfirmId(item.id)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              ><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="h-4 w-4" />
                  Pridať položku
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Názov položky</Label>
                    <Input
                      placeholder="napr. Rám, Výplň..."
                      value={addForm.name}
                      onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Jednotka</Label>
                    <Select value={addForm.unit} onValueChange={(v) => setAddForm(f => ({ ...f, unit: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map(u => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cena (€)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={addForm.price}
                        onChange={(e) => setAddForm(f => ({ ...f, price: e.target.value }))}
                        className="font-mono"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                      />
                      <Button onClick={handleAdd} disabled={addItemMutation.isPending}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PARAMETRE VÝROBY ── */}
          <TabsContent value="parametre" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Parametre výroby
                </CardTitle>
                <CardDescription>
                  Základné hodnoty používané pri výpočtoch cien a spotreby materiálu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {form && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Disk */}
                      <div className="space-y-1.5">
                        <Label>Cena disku kolesa (€/ks)</Label>
                        <p className="text-xs text-muted-foreground">
                          Používa sa pri výpočte ceny položiek typu „Disky" v zákazkách.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.disk_price_per_piece}
                            onChange={(e) => setForm(f => f ? { ...f, disk_price_per_piece: parseFloat(e.target.value) || 0 } : f)}
                            className="font-mono w-36"
                          />
                          <span className="text-sm text-muted-foreground">€ / ks</span>
                        </div>
                      </div>

                      {/* Základ */}
                      <div className="space-y-1.5">
                        <Label>Cena základu/podkladu (€/m²)</Label>
                        <p className="text-xs text-muted-foreground">
                          Cena za aplikáciu základného náteru pri dvojvrstvovom lakovaní.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.zaklad_price_per_m2}
                            onChange={(e) => setForm(f => f ? { ...f, zaklad_price_per_m2: parseFloat(e.target.value) || 0 } : f)}
                            className="font-mono w-36"
                          />
                          <span className="text-sm text-muted-foreground">€ / m²</span>
                        </div>
                      </div>

                      {/* Čistenie pištole */}
                      <div className="space-y-1.5">
                        <Label>Spotreba farby pri čistení pištole (kg)</Label>
                        <p className="text-xs text-muted-foreground">
                          Množstvo farby spotrebovanej pri každom čistení/prepláchnutí striekacej pištole.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            value={form.gun_cleaning_kg}
                            onChange={(e) => setForm(f => f ? { ...f, gun_cleaning_kg: parseFloat(e.target.value) || 0 } : f)}
                            className="font-mono w-36"
                          />
                          <span className="text-sm text-muted-foreground">kg</span>
                        </div>
                      </div>

                      {/* Tolerancia spotreby */}
                      <div className="space-y-1.5">
                        <Label>Tolerancia spotreby farby (±%)</Label>
                        <p className="text-xs text-muted-foreground">
                          Povolená odchýlka skutočnej spotreby od odhadovanej — používa sa pri porovnaní spotreby.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            value={form.consumption_tolerance_pct}
                            onChange={(e) => setForm(f => f ? { ...f, consumption_tolerance_pct: parseFloat(e.target.value) || 0 } : f)}
                            className="font-mono w-36"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <Button onClick={handleSaveParams} disabled={isUpdating} className="gap-2">
                        <Save className="h-4 w-4" />
                        Uložiť parametre
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="struktury" className="mt-6">
            <p className="text-muted-foreground">Sekcia sa načítava...</p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Naozaj vymazať položku?</AlertDialogTitle>
            <AlertDialogDescription>
              Naozaj vymazať položku <strong>{deleteTarget?.name || deleteTarget?.item_type}</strong>?
              Zákazky s touto položkou nebudú ovplyvnené.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteConfirmId) deleteItemMutation.mutate(deleteConfirmId); setDeleteConfirmId(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Vymazať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
