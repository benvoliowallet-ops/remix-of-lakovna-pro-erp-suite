import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Users, Plus, MoreHorizontal, Shield, UserCog, Trash2, Loader2, UserPlus, Copy, Check, Clock } from 'lucide-react';
import { AddUserDialog } from './AddUserDialog';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'worker';
  created_at: string;
}

interface PendingUser {
  id: string;
  full_name: string | null;
}

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserName, setDeleteUserName] = useState<string>('');
  const [assignUserId, setAssignUserId] = useState<string | null>(null);
  const [assignUserName, setAssignUserName] = useState<string>('');

  const registrationLink = `${window.location.origin}/auth`;

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

  // Load users without tenant_id — silently skip if column doesn't exist yet
  const { data: pendingUsers } = useQuery({
    queryKey: ['pending-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .is('tenant_id' as any, null);
      if (error) {
        // Column likely doesn't exist yet — return empty list silently
        return [] as PendingUser[];
      }
      // Exclude current user
      return (data as PendingUser[]).filter(u => u.id !== currentUser?.id);
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

  const assignTenantMutation = useMutation({
    mutationFn: async (userId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tenantId = (profile as any)?.tenant_id;
      if (!tenantId) throw new Error('Nemáte priradený tenant');

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ tenant_id: tenantId } as never)
        .eq('id', userId);
      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'worker' as const }, { onConflict: 'user_id' });
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      toast.success('Prístup bol pridelený');
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setAssignUserId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Chyba pri prideľovaní prístupu');
    },
  });

  const handleRoleChange = (userId: string, newRole: 'admin' | 'worker') => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleDeleteClick = (user: UserData) => {
    setDeleteUserId(user.id);
    setDeleteUserName(user.full_name || user.email);
  };

  const handleAssignClick = (user: PendingUser) => {
    setAssignUserId(user.id);
    setAssignUserName(user.full_name || 'Neznámy používateľ');
  };

  const confirmDelete = () => {
    if (deleteUserId) deleteUserMutation.mutate(deleteUserId);
  };

  const confirmAssign = () => {
    if (assignUserId) assignTenantMutation.mutate(assignUserId);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(registrationLink);
    setLinkCopied(true);
    toast.success('Link skopírovaný do schránky');
    setTimeout(() => setLinkCopied(false), 2000);
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
      {/* Pending users section */}
      {pendingUsers && pendingUsers.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  Čakajúci na pridelenie
                </CardTitle>
                <CardDescription>
                  Títo používatelia sa zaregistrovali, ale ešte nemajú pridelený prístup
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meno</TableHead>
                  <TableHead className="w-[140px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || <span className="text-muted-foreground italic">Bez mena</span>}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssignClick(user)}
                        className="text-xs"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Prideliť prístup
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Main users table */}
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
            <div className="flex gap-2">
              <Button
                onClick={() => setInviteDialogOpen(true)}
                size="sm"
                variant="outline"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Pozvať zamestnanca
              </Button>
              <Button onClick={() => setAddDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Pridať
              </Button>
            </div>
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

      {/* Invite dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Pozvať zamestnanca
            </DialogTitle>
            <DialogDescription>
              Pošlite zamestnancovi registračný link. Po registrácii sa objaví v sekcii "Čakajúci na pridelenie" a môžete mu prideliť prístup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Registračný link:</p>
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
              <span className="flex-1 truncate font-mono text-sm text-foreground">
                {registrationLink}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyLink}
                className="h-7 px-2 shrink-0"
              >
                {linkCopied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Zavrieť
            </Button>
            <Button onClick={handleCopyLink}>
              {linkCopied ? (
                <><Check className="h-4 w-4 mr-2" />Skopírované</>
              ) : (
                <><Copy className="h-4 w-4 mr-2" />Kopírovať link</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
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

      {/* Assign tenant confirmation */}
      <AlertDialog open={!!assignUserId} onOpenChange={(open) => !open && setAssignUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Prideliť prístup?</AlertDialogTitle>
            <AlertDialogDescription>
              Pridelíte používateľovi <strong>{assignUserName}</strong> rolu Worker a prístup do vašej lakovne.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAssign}>
              {assignTenantMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Prideliť prístup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
