import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Search, Plus, Mail, Phone, MapPin, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog';
import type { Customer } from '@/lib/types';

export default function Customers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Customer[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Zákazník vymazaný');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDeletingCustomer(null);
    },
    onError: (error: Error) => {
      toast.error('Chyba pri mazaní: ' + error.message);
    },
  });

  const filteredCustomers = customers?.filter(customer =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.email?.toLowerCase().includes(search.toLowerCase()) ||
    customer.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatAddress = (customer: Customer) => {
    const parts = [];
    if (customer.street) {
      parts.push(customer.street + (customer.house_number ? ' ' + customer.house_number : ''));
    }
    if (customer.city) {
      parts.push((customer.postal_code ? customer.postal_code + ' ' : '') + customer.city);
    }
    return parts.length > 0 ? parts.join(', ') : customer.billing_address || null;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Zákazníci</h1>
            <p className="text-muted-foreground">Správa zákazníkov</p>
          </div>
          <CustomerFormDialog
            trigger={
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="mr-2 h-4 w-4" />
                Nový zákazník
              </Button>
            }
          />
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hľadať zákazníka..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Zoznam zákazníkov ({filteredCustomers?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Názov</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>IČO</TableHead>
                  <TableHead>Adresa</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers?.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.company_name || customer.name}</div>
                        {customer.contact_person && (
                          <div className="text-sm text-muted-foreground">{customer.contact_person}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {customer.phone}
                          </div>
                        )}
                        {!customer.email && !customer.phone && '—'}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {customer.ico || '—'}
                    </TableCell>
                    <TableCell>
                      {formatAddress(customer) ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="max-w-[200px] truncate">{formatAddress(customer)}</span>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingCustomer(customer)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Upraviť
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingCustomer(customer)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Vymazať
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Načítavam...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && (!filteredCustomers || filteredCustomers.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Žiadni zákazníci
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <CustomerFormDialog
        customer={editingCustomer}
        open={!!editingCustomer}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vymazať zákazníka?</AlertDialogTitle>
            <AlertDialogDescription>
              Naozaj chcete vymazať zákazníka "{deletingCustomer?.company_name || deletingCustomer?.name}"?
              Táto akcia sa nedá vrátiť späť.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCustomer && deleteMutation.mutate(deletingCustomer.id)}
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
