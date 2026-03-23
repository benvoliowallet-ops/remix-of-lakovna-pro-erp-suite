import { useAuth } from '@/contexts/AuthContext';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { WorkerDashboard } from '@/components/dashboard/WorkerDashboard';
import { MainLayout } from '@/components/layout/MainLayout';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {isAdmin ? <AdminDashboard /> : <WorkerDashboard />}
    </MainLayout>
  );
}
