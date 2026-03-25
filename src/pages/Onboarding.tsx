import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingForm {
  name: string;
  ico: string;
  dic: string;
  ic_dph: string;
  address: string;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingTenant, setCheckingTenant] = useState(true);

  const [form, setForm] = useState<OnboardingForm>({
    name: '',
    ico: '',
    dic: '',
    ic_dph: '',
    address: '',
  });

  // Check if user already has a tenant — redirect to dashboard if so
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }

    const checkTenant = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // If profile has a tenant_id field and it's set, redirect
        if (data && (data as Record<string, unknown>)['tenant_id']) {
          navigate('/dashboard');
          return;
        }
      } catch {
        // Profile doesn't exist or no tenant_id column — show onboarding form
      } finally {
        setCheckingTenant(false);
      }
    };

    checkTenant();
  }, [user, authLoading, navigate]);

  const handleChange = (field: keyof OnboardingForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Názov lakovne je povinný');
      return;
    }

    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('create_tenant_for_user', {
        p_name: form.name.trim(),
        p_ico: form.ico.trim() || null,
        p_dic: form.dic.trim() || null,
        p_ic_dph: form.ic_dph.trim() || null,
        p_address: form.address.trim() || null,
      });

      if (error) {
        toast.error('Chyba pri vytváraní pracoviska: ' + error.message);
        return;
      }

      toast.success('Pracovisko bolo úspešne vytvorené!');
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['tenant-status'] });
      navigate('/dashboard');
    } catch {
      toast.error('Nastala neočakávaná chyba. Skúste to znova.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checkingTenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent shadow-lg">
          <Factory className="h-8 w-8 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lakovňa PRO</h1>
          <p className="text-muted-foreground">ERP Systém pre práškovú lakovňu</p>
        </div>
      </div>

      <Card className="w-full max-w-[480px]">
        <CardHeader>
          <CardTitle>Vitajte v Lakovňa PRO</CardTitle>
          <CardDescription>
            Nastavte si pracovisko — trvá to 1 minútu
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Názov lakovne <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Napr. Lakovňa Novák s.r.o."
                value={form.name}
                onChange={handleChange('name')}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ico">IČO</Label>
              <Input
                id="ico"
                type="text"
                placeholder="12345678"
                value={form.ico}
                onChange={handleChange('ico')}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dic">DIČ</Label>
              <Input
                id="dic"
                type="text"
                placeholder="2012345678"
                value={form.dic}
                onChange={handleChange('dic')}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ic_dph">IČ DPH</Label>
              <Input
                id="ic_dph"
                type="text"
                placeholder="SK2012345678"
                value={form.ic_dph}
                onChange={handleChange('ic_dph')}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresa</Label>
              <Textarea
                id="address"
                placeholder="Ul. Príkladná 1, 010 01 Žilina"
                value={form.address}
                onChange={handleChange('address')}
                disabled={loading}
                rows={3}
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vytvoriť pracovisko
            </Button>
          </CardFooter>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Systém pre správu práškového lakovania
      </p>
    </div>
  );
}
