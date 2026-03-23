import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Users, Plus, MoreHorizontal, Shield, UserCog, Trash2, Loader2 } from 'lucide-react';
import { AddUserDialog } from './AddUserDialog';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'worker';
  created_at: string;
}

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserName, setDeleteUserName] = useState<string>('');

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Neprihlásený');

      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' },
      });

      if (error) throw error;
      return data.users as UserData[];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'worker' }) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'update-role', user_id: userId, role },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Rola bola zmenená');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Chyba pri zmene roly');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'delete', user_id: userId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Používateľ bol vymazaný');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteUserId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Chyba pri mazaní používateľa');
    },
  });

  const handleRoleChange = (userId: string, newRole: 'admin' | 'worker') => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleDeleteClick = (user: UserData) => {
    setDeleteUserId(user.id);
    setDeleteUserName(user.full_name || user.email);
  };

  const confirmDelete = () => {
    if (deleteUserId) {
      deleteUserMutation.mutate(deleteUserId);
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Users className="h-5 w-5" />
            Chyba
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Používatelia
              </CardTitle>
              <CardDescription>
                Správa prístupov do systému
              </CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Pridať
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meno</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rola</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      {user.role === 'admin' ? (
                        <Badge className="bg-success text-success-foreground">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <UserCog className="h-3 w-3 mr-1" />
                          Worker
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={user.id === currentUser?.id}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user.role === 'worker' ? (
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(user.id, 'admin')}
                              disabled={updateRoleMutation.isPending}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Povýšiť na Admina
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(user.id, 'worker')}
                              disabled={updateRoleMutation.isPending}
                            >
                              <UserCog className="h-4 w-4 mr-2" />
                              Zmeniť na Workera
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteClick(user)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Vymazať
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddUserDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vymazať používateľa?</AlertDialogTitle>
            <AlertDialogDescription>
              Naozaj chcete vymazať používateľa <strong>{deleteUserName}</strong>? Táto akcia je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Vymazať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
