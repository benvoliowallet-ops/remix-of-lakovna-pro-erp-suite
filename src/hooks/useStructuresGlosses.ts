import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TenantOption {
  id: string;
  value: string;
  label: string;
  sort_order: number;
}

export function useStructuresGlosses() {
  const { data: structures = [], isLoading: loadingStructures } = useQuery({
    queryKey: ['tenant-structures'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('tenant_structures') as any)
        .select('id, value, label, sort_order')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as TenantOption[];
    },
  });

  const { data: glosses = [], isLoading: loadingGlosses } = useQuery({
    queryKey: ['tenant-glosses'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('tenant_glosses') as any)
        .select('id, value, label, sort_order')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as TenantOption[];
    },
  });

  const getLabelForStructure = (value: string) =>
    structures.find((s) => s.value === value)?.label ?? value;

  const getLabelForGloss = (value: string) =>
    glosses.find((g) => g.value === value)?.label ?? value;

  return {
    structures,
    glosses,
    loading: loadingStructures || loadingGlosses,
    getLabelForStructure,
    getLabelForGloss,
  };
}
