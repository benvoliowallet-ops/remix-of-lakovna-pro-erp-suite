import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Tag, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { ITEM_TYPE_LABELS } from '@/lib/types';
import type { Company, PriceListItem } from '@/lib/types';
import { CompanyEditDialog } from '@/components/settings/CompanyEditDialog';
import { UserManagement } from '@/components/settings/UserManagement';

export default function Settings() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;
      return data as Company[];
    },
  });

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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Moje firmy
              </CardTitle>
              <CardDescription>
                Firmy pre fakturáciu zákaziek
              </CardDescription>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Cenník charakterov
              </CardTitle>
              <CardDescription>
                Kliknite na cenu pre úpravu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Typ</TableHead>
                    <TableHead className="text-right">Cena/m²</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceList?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {ITEM_TYPE_LABELS[item.item_type]}
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(item)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-accent"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* User Management */}
        <UserManagement />

        {/* Company Edit Dialog */}
        <CompanyEditDialog
          company={editingCompany}
          open={!!editingCompany}
          onOpenChange={(open) => !open && setEditingCompany(null)}
        />
      </div>
    </MainLayout>
  );
}
