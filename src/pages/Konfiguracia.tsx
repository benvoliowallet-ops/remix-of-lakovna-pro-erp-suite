import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Trash2, Plus, Check, X, Tag, Settings2, Save, Layers, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useTenantSettings, TenantSettings } from '@/hooks/useTenantSettings';

const UNIT_OPTIONS = [
  { value: 'm2', label: 'm²' },
  { value: 'ks', label: 'ks' },
  { value: 'bm', label: 'bm (bežný meter)' },
];

type StructureRow = { id: string; value: string; label: string; sort_order: number };
type GlossRow = { id: string; value: string; label: string; sort_order: number };

export default function Konfiguracia() {
  // ── Cenník state ──
  const [addForm, setAddForm] = useState({ name: '', unit: 'm2', price: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ price: '', unit: '' });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Parametre výroby state ──
  const { settings, updateSettings, isUpdating } = useTenantSettings();
  const [form, setForm] = useState<TenantSettings | null>(null);
  useEffect(() => { if (settings && !form) setForm(settings); }, [settings]);

  // ── Štruktúry a lesky state ──
  const [newStructureLabel, setNewStructureLabel] = useState('');
  const [newGlossLabel, setNewGlossLabel] = useState('');

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
    onSuccess: () => { toast.success('Položka vymazaná'); refetchPriceList(); },
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

  // ── Štruktúry queries ──
  const { data: structures, refetch: refetchStructures } = useQuery({
    queryKey: ['tenant-structures'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tenant_structures')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as StructureRow[];
    },
  });

  const addStructureMutation = useMutation({
    mutationFn: async ({ value, label }: { value: string; label: string }) => {
      const { error } = await (supabase as any)
        .from('tenant_structures')
        .insert({ value: value.toLowerCase().replace(/\s+/g, '_'), label });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Štruktúra pridaná'); refetchStructures(); setNewStructureLabel(''); },
    onError: () => toast.error('Chyba — hodnota musí byť unikátna'),
  });

  const deleteStructureMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('tenant_structures').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Štruktúra vymazaná'); refetchStructures(); },
  });

  // ── Lesky queries ──
  const { data: glosses, refetch: refetchGlosses } = useQuery({
    queryKey: ['tenant-glosses'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tenant_glosses')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as GlossRow[];
    },
  });

  const addGlossMutation = useMutation({
    mutationFn: async ({ value, label }: { value: string; label: string }) => {
      const { error } = await (supabase as any)
        .from('tenant_glosses')
        .insert({ value: value.toLowerCase().replace(/\s+/g, '_'), label });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Lesk pridaný'); refetchGlosses(); setNewGlossLabel(''); },
    onError: () => toast.error('Chyba — hodnota musí byť unikátna'),
  });

  const deleteGlossMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('tenant_glosses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Lesk vymazaný'); refetchGlosses(); },
  });

  const handleAddStructure = () => {
    const label = newStructureLabel.trim();
    if (!label) { toast.error('Zadajte názov štruktúry'); return; }
    addStructureMutation.mutate({ value: label, label });
  };

  const handleAddGloss = () => {
    const label = newGlossLabel.trim();
    if (!label) { toast.error('Zadajte názov lesku'); return; }
    addGlossMutation.mutate({ value: label, label });
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
                            <Select value={editValues.unit} onValueChange={(v) => setEditValues(e => ({ ...e, unit: v }))}>
                              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
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
                                type="number" step="0.01"
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
                              <Button size="sm" variant="ghost" onClick={saveEdit} disabled={updateItemMutation.isPending}
                                className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                              ><Check className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              ><X className="h-4 w-4" /></Button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => startEdit(item)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-accent"
                              ><Pencil className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => setDeleteConfirmId(item.id)}
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
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                        type="number" step="0.01" placeholder="0.00"
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
                      <div className="space-y-1.5">
                        <Label>Cena disku kolesa (€/ks)</Label>
                        <p className="text-xs text-muted-foreground">
                          Používa sa pri výpočte ceny položiek typu „Disky" v zákazkách.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Input type="number" step="0.01" min="0"
                            value={form.disk_price_per_piece}
                            onChange={(e) => setForm(f => f ? { ...f, disk_price_per_piece: parseFloat(e.target.value) || 0 } : f)}
                            className="font-mono w-36"
                          />
                          <span className="text-sm text-muted-foreground">€ / ks</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Cena základu/podkladu (€/m²)</Label>
                        <p className="text-xs text-muted-foreground">
                          Cena za aplikáciu základného náteru pri dvojvrstvovom lakovaní.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Input type="number" step="0.01" min="0"
                            value={form.zaklad_price_per_m2}
                            onChange={(e) => setForm(f => f ? { ...f, zaklad_price_per_m2: parseFloat(e.target.value) || 0 } : f)}
                            className="font-mono w-36"
                          />
                          <span className="text-sm text-muted-foreground">€ / m²</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Spotreba farby pri čistení pištole (kg)</Label>
                        <p className="text-xs text-muted-foreground">
                          Množstvo farby spotrebovanej pri každom čistení/prepláchnutí striekacej pištole.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Input type="number" step="0.001" min="0"
                            value={form.gun_cleaning_kg}
                            onChange={(e) => setForm(f => f ? { ...f, gun_cleaning_kg: parseFloat(e.target.value) || 0 } : f)}
                            className="font-mono w-36"
                          />
                          <span className="text-sm text-muted-foreground">kg</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Tolerancia spotreby farby (±%)</Label>
                        <p className="text-xs text-muted-foreground">
                          Povolená odchýlka skutočnej spotreby od odhadovanej — pri porovnaní spotreby.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Input type="number" step="1" min="0" max="100"
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

          {/* ── ŠTRUKTÚRY A LESKY ── */}
          <TabsContent value="struktury" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Štruktúry */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="h-4 w-4" />
                    Štruktúry povrchu
                  </CardTitle>
                  <CardDescription>Typy povrchových štruktúr dostupné pri pridávaní farieb</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 min-h-[40px]">
                    {structures?.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">Žiadne štruktúry</p>
                    )}
                    {structures?.map((s) => (
                      <Badge key={s.id} variant="secondary" className="gap-1 pr-1 pl-3 py-1 text-sm">
                        {s.label}
                        <button
                          onClick={() => deleteStructureMutation.mutate(s.id)}
                          disabled={deleteStructureMutation.isPending}
                          className="ml-1 rounded-full hover:bg-destructive/20 hover:text-destructive p-0.5 transition-colors"
                          aria-label={`Zmazať ${s.label}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Zobrazovaný názov</Label>
                      <Input
                        placeholder="napr. Jemná štruktúra"
                        value={newStructureLabel}
                        onChange={(e) => setNewStructureLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddStructure(); }}
                        className="h-9"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button size="sm" onClick={handleAddStructure} disabled={addStructureMutation.isPending} className="h-9 gap-1">
                        <Plus className="h-3.5 w-3.5" />
                        Pridať
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lesky */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4" />
                    Typy lesku
                  </CardTitle>
                  <CardDescription>Stupne a typy lesku dostupné pri pridávaní farieb</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 min-h-[40px]">
                    {glosses?.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">Žiadne lesky</p>
                    )}
                    {glosses?.map((g) => (
                      <Badge key={g.id} variant="secondary" className="gap-1 pr-1 pl-3 py-1 text-sm">
                        {g.label}
                        <button
                          onClick={() => deleteGlossMutation.mutate(g.id)}
                          disabled={deleteGlossMutation.isPending}
                          className="ml-1 rounded-full hover:bg-destructive/20 hover:text-destructive p-0.5 transition-colors"
                          aria-label={`Zmazať ${g.label}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Zobrazovaný názov</Label>
                      <Input
                        placeholder="napr. Polomatné"
                        value={newGlossLabel}
                        onChange={(e) => setNewGlossLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddGloss(); }}
                        className="h-9"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button size="sm" onClick={handleAddGloss} disabled={addGlossMutation.isPending} className="h-9 gap-1">
                        <Plus className="h-3.5 w-3.5" />
                        Pridať
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert variant="default" className="border-warning/50 bg-warning/5 text-warning-foreground">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-sm">
                <strong>Upozornenie:</strong> Zmazanie štruktúry alebo lesku neovplyvní existujúce farby v sklade —
                tie si zachovajú pôvodnú hodnotu. Zmazanie odporúčame len pre nepotrebné hodnoty.
              </AlertDescription>
            </Alert>
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
