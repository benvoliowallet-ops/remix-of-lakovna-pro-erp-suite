import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, UserCog } from 'lucide-react';

const userSchema = z.object({
  full_name: z.string().min(2, 'Meno musí mať aspoň 2 znaky').max(100),
  email: z.string().email('Neplatný email'),
  password: z.string().min(6, 'Heslo musí mať aspoň 6 znakov'),
  role: z.enum(['admin', 'worker']),
});

type UserFormData = z.infer<typeof userSchema>;

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      role: 'worker',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const { data: result, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          role: data.role,
        },
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success('Používateľ bol vytvorený');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Chyba pri vytváraní používateľa');
    },
  });

  const onSubmit = (data: UserFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nový používateľ</DialogTitle>
          <DialogDescription>
            Vytvorte nový účet pre prístup do systému
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meno *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ján Novák" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jan.novak@firma.sk" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heslo *</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Minimálne 6 znakov" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rola *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte rolu" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="worker">
                        <div className="flex items-center gap-2">
                          <UserCog className="h-4 w-4" />
                          Worker - práca na zákazkách
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin - plný prístup
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Vytvoriť
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
