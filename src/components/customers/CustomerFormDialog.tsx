import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import type { Customer } from '@/lib/types';

interface CustomerFormDialogProps {
  onCustomerCreated?: (customerId: string) => void;
  trigger?: React.ReactNode;
  customer?: Customer | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const emptyForm = {
  name: '',
  company_name: '',
  city: '',
  postal_code: '',
  street: '',
  house_number: '',
  ico: '',
  dic: '',
  ic_dph: '',
  contact_person: '',
  phone: '',
  email: '',
};

export function CustomerFormDialog({ 
  onCustomerCreated, 
  trigger, 
  customer,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange 
}: CustomerFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
  
  const isEditing = !!customer;
  
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        company_name: customer.company_name || '',
        city: customer.city || '',
        postal_code: customer.postal_code || '',
        street: customer.street || '',
        house_number: customer.house_number || '',
        ico: customer.ico || '',
        dic: customer.dic || '',
        ic_dph: customer.ic_dph || '',
        contact_person: customer.contact_person || '',
        phone: customer.phone || '',
        email: customer.email || '',
      });
    } else {
      setFormData(emptyForm);
    }
  }, [customer, open]);

  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      const displayName = formData.company_name || formData.contact_person || formData.name;
      
      if (!displayName.trim()) {
        throw new Error('Vyplňte aspoň názov spoločnosti alebo kontaktnú osobu');
      }

      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: displayName,
          company_name: formData.company_name || null,
          city: formData.city || null,
          postal_code: formData.postal_code || null,
          street: formData.street || null,
          house_number: formData.house_number || null,
          ico: formData.ico || null,
          dic: formData.dic || null,
          ic_dph: formData.ic_dph || null,
          contact_person: formData.contact_person || null,
          phone: formData.phone || null,
          email: formData.email || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Zákazník vytvorený');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setOpen(false);
      setFormData(emptyForm);
      onCustomerCreated?.(data.id);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!customer) throw new Error('Žiadny zákazník na úpravu');
      
      const displayName = formData.company_name || formData.contact_person || formData.name;
      
      if (!displayName.trim()) {
        throw new Error('Vyplňte aspoň názov spoločnosti alebo kontaktnú osobu');
      }

      const { error } = await supabase
        .from('customers')
        .update({
          name: displayName,
          company_name: formData.company_name || null,
          city: formData.city || null,
          postal_code: formData.postal_code || null,
          street: formData.street || null,
          house_number: formData.house_number || null,
          ico: formData.ico || null,
          dic: formData.dic || null,
          ic_dph: formData.ic_dph || null,
          contact_person: formData.contact_person || null,
          phone: formData.phone || null,
          email: formData.email || null,
        })
        .eq('id', customer.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Zákazník aktualizovaný');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (isEditing) {
      updateCustomerMutation.mutate();
    } else {
      createCustomerMutation.mutate();
    }
  };

  const isPending = createCustomerMutation.isPending || updateCustomerMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nový zákazník
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Upraviť zákazníka' : 'Nový zákazník'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Upravte údaje zákazníka' : 'Vyplňte údaje nového zákazníka'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Základné údaje */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">Firemné údaje</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Názov spoločnosti *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  placeholder="Firma s.r.o."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Kontaktná osoba</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => handleChange('contact_person', e.target.value)}
                  placeholder="Ján Novák"
                />
              </div>
            </div>
          </div>

          {/* Adresa */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">Sídlo</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="street">Ulica</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => handleChange('street', e.target.value)}
                  placeholder="Hlavná"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="house_number">Popisné číslo</Label>
                <Input
                  id="house_number"
                  value={formData.house_number}
                  onChange={(e) => handleChange('house_number', e.target.value)}
                  placeholder="123/45"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">Mesto</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Bratislava"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">PSČ</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => handleChange('postal_code', e.target.value)}
                  placeholder="811 01"
                />
              </div>
            </div>
          </div>

          {/* IČO, DIČ, IČ DPH */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">Fakturačné údaje</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ico">IČO</Label>
                <Input
                  id="ico"
                  value={formData.ico}
                  onChange={(e) => handleChange('ico', e.target.value)}
                  placeholder="12345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dic">DIČ</Label>
                <Input
                  id="dic"
                  value={formData.dic}
                  onChange={(e) => handleChange('dic', e.target.value)}
                  placeholder="1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ic_dph">IČ DPH</Label>
                <Input
                  id="ic_dph"
                  value={formData.ic_dph}
                  onChange={(e) => handleChange('ic_dph', e.target.value)}
                  placeholder="SK1234567890"
                />
              </div>
            </div>
          </div>

          {/* Kontakt */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">Kontaktné údaje</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefón</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+421 900 123 456"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="firma@email.sk"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Zrušiť
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            {isEditing ? 'Uložiť zmeny' : 'Vytvoriť zákazníka'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
