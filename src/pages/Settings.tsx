import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Tag, Pencil, Check, X, Plus, Trash2, SlidersHorizontal, Layers } from 'lucide-react';
import { toast } from 'sonner';
import type { Company, PriceListItem, TenantProductionParams } from '@/lib/types';
import { CompanyEditDialog } from '@/components/settings/CompanyEditDialog';
import { UserManagement } from '@/components/settings/UserManagement';
import { useStructuresGlosses, type TenantOption } from '@/hooks/useStructuresGlosses';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Settings() {
  const queryClient = useQueryClient();
  const { structures, glosses } = useStructuresGlosses();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [addingCompany, setAddingCompany] = useState(false);
  const [deletingPriceId, setDeletingPriceId] = useState<string | null>(null);
  const [addingPrice, setAddingPrice] = useState(false);
  const [newPriceName, setNewPriceName] = useState('');
  const [newPriceValue, setNewPriceValue] = useState('');
  const [newPriceUnit, setNewPriceUnit] = useState('m2');

  // Structures/glosses add state
  const [addingStructure, setAddingStructure] = useState(false);
  const [newStructureValue, setNewStructureValue] = useState('');
  const [newStructureLabel, setNewStructureLabel] = useState('');
  const [addingGloss, setAddingGloss] = useState(false);
  const [newGlossValue, setNewGlossValue] = useState('');
  const [newGlossLabel, setNewGlossLabel] = useState('');

  // Production params state
  const [prodParams, setProdParams] = useState<TenantProductionParams>({
    disk_price_per_piece: 50,
    zaklad_price_per_m2: 4,
    gun_cleaning_kg: 0.3,
    consumption_tolerance_pct: 15,
  });
  const [savingProd, setSavingProd] = useState(false);

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;
      return data as Company[];
    },
  });

  // Load tenant production params
  const { data: tenantData } = useQuery({
    queryKey: ['tenant-prod-params'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('tenants') as any)
        .select('disk_price_per_piece, zaklad_price_per_m2, gun_cleaning_kg, consumption_tolerance_pct')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as TenantProductionParams | null;
    },
  });

  useEffect(() => {
    if (tenantData) {
      setProdParams({
        disk_price_per_piece: Number(tenantData.disk_price_per_piece),
        zaklad_price_per_m2: Number(tenantData.zaklad_price_per_m2),
        gun_cleaning_kg: Number(tenantData.gun_cleaning_kg),
        consumption_tolerance_pct: Number(tenantData.consumption_tolerance_pct),
      });
    }
  }, [tenantData]);

  const saveProdParams = async () => {
    setSavingProd(true);
    try {
      const { error } = await (supabase.from('tenants') as any).update({
        disk_price_per_piece: prodParams.disk_price_per_piece,
        zaklad_price_per_m2: prodParams.zaklad_price_per_m2,
        gun_cleaning_kg: prodParams.gun_cleaning_kg,
        consumption_tolerance_pct: prodParams.consumption_tolerance_pct,
      }).eq('id', (await supabase.rpc('get_tenant_id')).data);
      if (error) throw error;
      toast.success('Parametre výroby uložené');
      queryClient.invalidateQueries({ queryKey: ['tenant-prod-params'] });
    } catch {
      toast.error('Chyba pri ukladaní parametrov');
    } finally {
      setSavingProd(false);
    }
  };

  const { data: priceList } = useQuery({
    queryKey: ['price-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('price_list').select('*');
      if (error) throw error;
      return data as PriceListItem[];
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { error } = await supabase
        .from('price_list')
        .update({ price_per_m2: price })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cena aktualizovaná');
      queryClient.invalidateQueries({ queryKey: ['price-list'] });
      setEditingId(null);
    },
    onError: () => {
      toast.error('Chyba pri aktualizácii ceny');
    },
  });

  const addPriceMutation = useMutation({
    mutationFn: async ({ name, price, unit }: { name: string; price: number; unit: string }) => {
      const { error } = await (supabase.from('price_list') as any).insert({
        item_type: name.toLowerCase().replace(/\s+/g, '_'),
        name,
        unit,
        price_per_m2: price,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Položka pridaná');
      queryClient.invalidateQueries({ queryKey: ['price-list'] });
      setAddingPrice(false);
      setNewPriceName('');
      setNewPriceValue('');
      setNewPriceUnit('m2');
    },
    onError: () => {
      toast.error('Chyba pri pridávaní položky');
    },
  });

  const deletePriceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('price_list').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Položka odstránená');
      queryClient.invalidateQueries({ queryKey: ['price-list'] });
      setDeletingPriceId(null);
    },
    onError: () => {
      toast.error('Chyba pri mazaní položky');
    },
  });

  const startEditing = (item: PriceListItem) => {
    setEditingId(item.id);
    setEditValue(Number(item.price_per_m2).toFixed(2));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const savePrice = (id: string) => {
    const price = parseFloat(editValue);
    if (isNaN(price) || price < 0) {
      toast.error('Zadajte platnú cenu');
      return;
    }
    updatePriceMutation.mutate({ id, price });
  };

  const saveNewPrice = () => {
    if (!newPriceName.trim()) {
      toast.error('Zadajte názov položky');
      return;
    }
    const price = parseFloat(newPriceValue);
    if (isNaN(price) || price < 0) {
      toast.error('Zadajte platnú cenu');
      return;
    }
    addPriceMutation.mutate({ name: newPriceName.trim(), price, unit: newPriceUnit || 'm2' });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const addStructureMutation = useMutation({
    mutationFn: async ({ value, label }: { value: string; label: string }) => {
      const { error } = await db.from('tenant_structures').insert({
        value: value.toLowerCase().replace(/\s+/g, '_'),
        label,
        sort_order: structures.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Štruktúra pridaná');
      queryClient.invalidateQueries({ queryKey: ['tenant-structures'] });
      setAddingStructure(false);
      setNewStructureValue('');
      setNewStructureLabel('');
    },
    onError: () => toast.error('Chyba pri pridávaní štruktúry'),
  });

  const deleteStructureMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('tenant_structures').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Štruktúra odstránená');
      queryClient.invalidateQueries({ queryKey: ['tenant-structures'] });
    },
    onError: () => toast.error('Chyba pri mazaní štruktúry'),
  });

  const addGlossMutation = useMutation({
    mutationFn: async ({ value, label }: { value: string; label: string }) => {
      const { error } = await db.from('tenant_glosses').insert({
        value: value.toLowerCase().replace(/\s+/g, '_'),
        label,
        sort_order: glosses.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Lesk pridaný');
      queryClient.invalidateQueries({ queryKey: ['tenant-glosses'] });
      setAddingGloss(false);
      setNewGlossValue('');
      setNewGlossLabel('');
    },
    onError: () => toast.error('Chyba pri pridávaní lesku'),
  });

  const deleteGlossMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('tenant_glosses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Lesk odstránený');
      queryClient.invalidateQueries({ queryKey: ['tenant-glosses'] });
    },
    onError: () => toast.error('Chyba pri mazaní lesku'),
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nastavenia</h1>
          <p className="text-muted-foreground">Správa systému (len pre administrátorov)</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Companies */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Moje firmy
                </CardTitle>
                <CardDescription>
                  Firmy pre fakturáciu zákaziek
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddingCompany(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Pridať firmu
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Názov</TableHead>
                    <TableHead>IČO</TableHead>
                    <TableHead>DPH</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies?.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell className="font-mono">{company.ico || '—'}</TableCell>
                      <TableCell>
                        {company.is_vat_payer ? (
                          <Badge className="bg-success text-success-foreground">Platca DPH</Badge>
                        ) : (
                          <Badge variant="secondary">Neplatca</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingCompany(company)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-accent"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Price List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Cenník charakterov
                </CardTitle>
                <CardDescription>
                  Kliknite na cenu pre úpravu
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddingPrice(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Pridať
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Názov</TableHead>
                    <TableHead>Jednotka</TableHead>
                    <TableHead className="text-right">Cena</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceList?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.name || item.item_type}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.unit || 'm²'}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === item.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-24 h-8 font-mono text-right"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') savePrice(item.id);
                                if (e.key === 'Escape') cancelEditing();
                              }}
                            />
                            <span className="text-muted-foreground">€</span>
                          </div>
                        ) : (
                          <span className="font-mono">
                            {Number(item.price_per_m2).toFixed(2)} €
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => savePrice(item.id)}
                              disabled={updatePriceMutation.isPending}
                              className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditing(item)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-accent"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeletingPriceId(item.id)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Add new price row */}
                  {addingPrice && (
                    <TableRow>
                      <TableCell>
                        <Input
                          value={newPriceName}
                          onChange={(e) => setNewPriceName(e.target.value)}
                          placeholder="Názov (napr. Rám)"
                          className="h-8"
                          autoFocus
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={newPriceUnit}
                          onChange={(e) => setNewPriceUnit(e.target.value)}
                          placeholder="m2"
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={newPriceValue}
                            onChange={(e) => setNewPriceValue(e.target.value)}
                            placeholder="0.00"
                            className="w-24 h-8 font-mono text-right"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveNewPrice();
                              if (e.key === 'Escape') setAddingPrice(false);
                            }}
                          />
                          <span className="text-muted-foreground">€</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={saveNewPrice}
                            disabled={addPriceMutation.isPending}
                            className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setAddingPrice(false)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* User Management */}
        <UserManagement />

        {/* Production Parameters */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" />
                Parametre výroby
              </CardTitle>
              <CardDescription>
                Výrobné hodnoty používané pri výpočtoch spotreby a cien
              </CardDescription>
            </div>
            <Button size="sm" onClick={saveProdParams} disabled={savingProd}>
              <Check className="h-4 w-4 mr-2" />
              Uložiť
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="disk_price">Cena disku (€/ks)</Label>
                <Input
                  id="disk_price"
                  type="number"
                  step="0.01"
                  value={prodParams.disk_price_per_piece}
                  onChange={(e) => setProdParams(p => ({ ...p, disk_price_per_piece: parseFloat(e.target.value) || 0 }))}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="zaklad_price">Cena základu (€/m²)</Label>
                <Input
                  id="zaklad_price"
                  type="number"
                  step="0.01"
                  value={prodParams.zaklad_price_per_m2}
                  onChange={(e) => setProdParams(p => ({ ...p, zaklad_price_per_m2: parseFloat(e.target.value) || 0 }))}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gun_cleaning">Čistenie pištoľa (kg)</Label>
                <Input
                  id="gun_cleaning"
                  type="number"
                  step="0.001"
                  value={prodParams.gun_cleaning_kg}
                  onChange={(e) => setProdParams(p => ({ ...p, gun_cleaning_kg: parseFloat(e.target.value) || 0 }))}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tolerance">Tolerancia spotreby (%)</Label>
                <Input
                  id="tolerance"
                  type="number"
                  step="0.1"
                  value={prodParams.consumption_tolerance_pct}
                  onChange={(e) => setProdParams(p => ({ ...p, consumption_tolerance_pct: parseFloat(e.target.value) || 0 }))}
                  className="font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Structures & Glosses */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Structures */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Štruktúry povrchu
                </CardTitle>
                <CardDescription>Dostupné štruktúry pri pridávaní farieb</CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddingStructure(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Pridať
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hodnota</TableHead>
                    <TableHead>Názov</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {structures.map((s: TenantOption) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-sm text-muted-foreground">{s.value}</TableCell>
                      <TableCell className="font-medium">{s.label}</TableCell>
                      <TableCell>
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => deleteStructureMutation.mutate(s.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {addingStructure && (
                    <TableRow>
                      <TableCell>
                        <Input
                          value={newStructureValue}
                          onChange={(e) => setNewStructureValue(e.target.value)}
                          placeholder="napr. perla"
                          className="h-8 font-mono"
                          autoFocus
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={newStructureLabel}
                          onChange={(e) => setNewStructureLabel(e.target.value)}
                          placeholder="napr. Perla"
                          className="h-8"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newStructureValue && newStructureLabel)
                              addStructureMutation.mutate({ value: newStructureValue, label: newStructureLabel });
                            if (e.key === 'Escape') setAddingStructure(false);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost"
                            onClick={() => newStructureValue && newStructureLabel && addStructureMutation.mutate({ value: newStructureValue, label: newStructureLabel })}
                            className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                          ><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost"
                            onClick={() => setAddingStructure(false)}
                            className="h-8 w-8 p-0 text-muted-foreground"
                          ><X className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Glosses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Stupne lesku
                </CardTitle>
                <CardDescription>Dostupné lesky pri pridávaní farieb</CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddingGloss(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Pridať
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hodnota</TableHead>
                    <TableHead>Názov</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {glosses.map((g: TenantOption) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono text-sm text-muted-foreground">{g.value}</TableCell>
                      <TableCell className="font-medium">{g.label}</TableCell>
                      <TableCell>
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => deleteGlossMutation.mutate(g.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {addingGloss && (
                    <TableRow>
                      <TableCell>
                        <Input
                          value={newGlossValue}
                          onChange={(e) => setNewGlossValue(e.target.value)}
                          placeholder="napr. ultra_matne"
                          className="h-8 font-mono"
                          autoFocus
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={newGlossLabel}
                          onChange={(e) => setNewGlossLabel(e.target.value)}
                          placeholder="napr. Ultra matné"
                          className="h-8"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newGlossValue && newGlossLabel)
                              addGlossMutation.mutate({ value: newGlossValue, label: newGlossLabel });
                            if (e.key === 'Escape') setAddingGloss(false);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost"
                            onClick={() => newGlossValue && newGlossLabel && addGlossMutation.mutate({ value: newGlossValue, label: newGlossLabel })}
                            className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                          ><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost"
                            onClick={() => setAddingGloss(false)}
                            className="h-8 w-8 p-0 text-muted-foreground"
                          ><X className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <CompanyEditDialog
          company={editingCompany}
          open={!!editingCompany}
          onOpenChange={(open) => !open && setEditingCompany(null)}
        />

        {/* Company Add Dialog — create new */}
        <CompanyEditDialog
          company={null}
          open={addingCompany}
          onOpenChange={setAddingCompany}
          onSuccess={() => setAddingCompany(false)}
        />

        {/* Delete price list item confirmation */}
        <AlertDialog open={!!deletingPriceId} onOpenChange={(open) => !open && setDeletingPriceId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Odstrániť položku cenníka?</AlertDialogTitle>
              <AlertDialogDescription>
                Táto akcia je nevratná. Položka bude trvalo odstránená z cenníka.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušiť</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingPriceId && deletePriceMutation.mutate(deletingPriceId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Odstrániť
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
