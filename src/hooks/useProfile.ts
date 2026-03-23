import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useProfile() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, pin_code')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      // Cast to include tenant_id which will exist after multi-tenant migration
      return data as typeof data & { tenant_id?: string | null };
    },
  });

  return { profile, isLoading, hasTenant: !!profile?.tenant_id };
}
