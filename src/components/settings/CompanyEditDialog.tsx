import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Company } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

const companySchema = z.object({
  name: z.string().min(2, 'Názov musí mať aspoň 2 znaky').max(100),
  address: z.string().max(200).optional().or(z.literal('')),
  ico: z.string().max(20).optional().or(z.literal('')),
  dic: z.string().max(20).optional().or(z.literal('')),
  ic_dph: z.string().max(20).optional().or(z.literal('')),
  bank_account: z.string().max(50).optional().or(z.literal('')),
  is_vat_payer: z.boolean(),
  vat_rate: z.coerce.number().min(0).max(100).optional(),
  paint_coverage_m2_per_kg: z.coerce.number().min(0).max(100).optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyEditDialogProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyEditDialog({ company, open, onOpenChange }: CompanyEditDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      address: '',
      ico: '',
      dic: '',
      ic_dph: '',
      bank_account: '',
      is_vat_payer: false,
      vat_rate: 20,
      paint_coverage_m2_per_kg: 8,
    },
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name || '',
        address: company.address || '',
        ico: company.ico || '',
        dic: company.dic || '',
        ic_dph: company.ic_dph || '',
        bank_account: company.bank_account || '',
        is_vat_payer: company.is_vat_payer || false,
        vat_rate: company.vat_rate || 20,
        paint_coverage_m2_per_kg: company.paint_coverage_m2_per_kg || 8,
      });
    }
  }, [company, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      if (!company) return;
      const { error } = await supabase
        .from('companies')
        .update({
          name: data.name,
          address: data.address || null,
          ico: data.ico || null,
          dic: data.dic || null,
          ic_dph: data.ic_dph || null,
          bank_account: data.bank_account || null,
          is_vat_payer: data.is_vat_payer,
          vat_rate: data.is_vat_payer ? data.vat_rate : null,
          paint_coverage_m2_per_kg: data.paint_coverage_m2_per_kg || null,
        })
        .eq('id', company.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Firma bola aktualizovaná');
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Chyba pri aktualizácii firmy');
    },
  });

  const onSubmit = (data: CompanyFormData) => {
    updateMutation.mutate(data);
  };

  const isVatPayer = form.watch('is_vat_payer');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upraviť firmu</DialogTitle>
          <DialogDescription>
            Upravte údaje firmy pre fakturáciu
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Názov firmy *</FormLabel>
                  <FormControl>
                    <Input placeholder="Názov s.r.o." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresa</FormLabel>
                  <FormControl>
                    <Input placeholder="Ulica 123, 012 34 Mesto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ico"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IČO</FormLabel>
                    <FormControl>
                      <Input placeholder="12345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DIČ</FormLabel>
                    <FormControl>
                      <Input placeholder="2012345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="ic_dph"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IČ DPH</FormLabel>
                  <FormControl>
                    <Input placeholder="SK2012345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bank_account"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bankový účet (IBAN)</FormLabel>
                  <FormControl>
                    <Input placeholder="SK12 1234 5678 9012 3456 7890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="is_vat_payer"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Platca DPH</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {isVatPayer && (
                <FormField
                  control={form.control}
                  name="vat_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sadzba DPH (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" min="0" max="100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="paint_coverage_m2_per_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pokrytie farby (m²/kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Zrušiť
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Uložiť
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
