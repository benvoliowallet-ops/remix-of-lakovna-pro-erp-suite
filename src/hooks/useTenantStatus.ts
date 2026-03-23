import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';

export function useTenantStatus() {
  const { hasTenant } = useProfile();

  const { data: status } = useQuery({
    queryKey: ['tenant-status'],
    enabled: hasTenant,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_tenant_status');
      if (error) throw error;
      return data?.[0] ?? null;
    },
    refetchInterval: 1000 * 60 * 60, // každú hodinu
  });

  return {
    isTrial: status?.is_trial ?? false,
    isExpired: status?.is_expired ?? false,
    daysLeft: status?.days_left ?? 0,
  };
}
