import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';

export interface TenantSettings {
  disk_price_per_piece: number;
  zaklad_price_per_m2: number;
  gun_cleaning_kg: number;
  consumption_tolerance_pct: number;
}

const DEFAULTS: TenantSettings = {
  disk_price_per_piece: 50,
  zaklad_price_per_m2: 4,
  gun_cleaning_kg: 0.3,
  consumption_tolerance_pct: 15,
};

export function useTenantSettings() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['tenant-settings'],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tenants')
        .select('disk_price_per_piece, zaklad_price_per_m2, gun_cleaning_kg, consumption_tolerance_pct')
        .eq('id', profile!.tenant_id)
        .single();
      if (error) return DEFAULTS;
      return {
        disk_price_per_piece: data.disk_price_per_piece ?? DEFAULTS.disk_price_per_piece,
        zaklad_price_per_m2: data.zaklad_price_per_m2 ?? DEFAULTS.zaklad_price_per_m2,
        gun_cleaning_kg: data.gun_cleaning_kg ?? DEFAULTS.gun_cleaning_kg,
        consumption_tolerance_pct: data.consumption_tolerance_pct ?? DEFAULTS.consumption_tolerance_pct,
      } as TenantSettings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<TenantSettings>) => {
      const { error } = await (supabase as any)
        .from('tenants')
        .update(updates)
        .eq('id', profile!.tenant_id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant-settings'] }),
  });

  return {
    settings: settings ?? DEFAULTS,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
