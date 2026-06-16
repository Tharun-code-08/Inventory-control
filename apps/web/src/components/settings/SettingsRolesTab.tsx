import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/store/authStore';
import { refreshCurrentUser } from '@/lib/session';
import { isOrgAdminUser } from '@/lib/roles';
import { cn } from '@/lib/cn';
import {
  SYSTEM_ROLES,
  SYSTEM_ROLE_ORDER,
  PERMISSION_MATRIX,
  PERMISSION_OPTIONS,
  type AccessLevel,
  type SystemRoleName,
} from '@/lib/system-roles';

function CapabilityIndicator({ level }: { level: AccessLevel }) {
  if (level === 'full') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Full access" />;
  }
  if (level === 'partial') {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800">
        P
      </span>
    );
  }
  return <span className="inline-block h-1.5 w-4 rounded bg-slate-300" aria-label="No access" />;
}

function MatrixCell({ level }: { level: AccessLevel }) {
  return (
    <div className="flex justify-center">
      {level === 'full' ? (
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" title="Full" />
      ) : level === 'partial' ? (
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" title="Partial" />
      ) : (
        <span className="h-2.5 w-2.5 rounded-full bg-slate-200" title="None" />
      )}
    </div>
  );
}

const matrixRoleLabels: Record<SystemRoleName, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  INVENTORY_MANAGER: 'Inv. mgr',
  PURCHASE_MANAGER: 'Purch.',
  SALES: 'Sales',
  EMPLOYEE: 'Employee',
  WAREHOUSE_STAFF: 'Staff',
  VIEWER: 'Viewer',
  VENDOR: 'Vendor',
};

export function SettingsRolesTab() {
  const actor = useAuthStore((s) => s.user);
  const canEditPermissions = isOrgAdminUser(actor);
  const queryClient = useQueryClient();
  const { data: roleRows = [] } = useQuery({
    queryKey: ['roles', 'permissions'],
    queryFn: async () => {
      const res = await api.get('/users/roles/list');
      return (res.data.data ?? []) as Array<{ name: string; permissions: string[] }>;
    },
  });
  const [draftByRole, setDraftByRole] = useState<Record<string, string[]>>({});
  const [editingRole, setEditingRole] = useState<SystemRoleName | null>(null);

  const savePermissions = useMutation({
    mutationFn: async ({ roleName, permissions }: { roleName: string; permissions: string[] }) => {
      const res = await api.patch(`/users/roles/${roleName}/permissions`, { permissions });
      return res.data.data;
    },
    onSuccess: async (_data, variables) => {
      // Sync: drop the local draft and re-read the saved permissions from the server.
      setDraftByRole((prev) => {
        const next = { ...prev };
        delete next[variables.roleName];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ['roles', 'permissions'] });
      // If the signed-in user's own role changed, refresh their session so the
      // sidebar nav and feature gates update live (no re-login required).
      if (actor?.role && variables.roleName === actor.role) {
        await refreshCurrentUser();
      }
      toast.success('Role permissions updated');
      setEditingRole(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Failed to update permissions';
      toast.error(msg);
    },
  });

  const backendByName = new Map(roleRows.map((r) => [r.name, r.permissions]));
  const permissionGroups = PERMISSION_OPTIONS.reduce<Record<string, string[]>>((acc, perm) => {
    const [group] = perm.split(':');
    if (!acc[group]) acc[group] = [];
    acc[group].push(perm);
    return acc;
  }, {});
  const formatPermission = (perm: string) => perm.replace(':', ' · ').replace(/_/g, ' ');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System roles</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Predefined access tiers for your organisation. The account creator is assigned Owner.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SYSTEM_ROLES.map((role) => {
          const Icon = role.icon;
          return (
            <Card
              key={role.name}
              className={cn(
                'overflow-hidden border-slate-200/80',
                role.name === 'OWNER' && 'ring-2 ring-emerald-200',
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                        role.iconClass,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{role.title}</CardTitle>
                      <p className="mt-0.5 text-sm text-muted-foreground">{role.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn('shrink-0 border', role.accessBadgeClass)}>
                    {role.accessTier}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                {role.capabilities.map((cap) => (
                  <div key={cap.label} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{cap.label}</span>
                    <CapabilityIndicator level={cap.level} />
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Permission matrix</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            Green = full access, amber = partial, grey = none.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Permission</TableHead>
                {SYSTEM_ROLE_ORDER.map((roleName) => (
                  <TableHead key={roleName} className="text-center text-xs">
                    {matrixRoleLabels[roleName]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSION_MATRIX.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm">{row.label}</TableCell>
                  {SYSTEM_ROLE_ORDER.map((roleName) => (
                    <TableCell key={roleName} className="text-center">
                      <MatrixCell level={row.levels[roleName]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canEditPermissions && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Advanced permission editor</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Fine-tune API permission strings per role (optional).
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {SYSTEM_ROLE_ORDER.map((roleName) => {
                const def = SYSTEM_ROLES.find((r) => r.name === roleName);
                return (
                  <Button
                    key={roleName}
                    size="sm"
                    variant={editingRole === roleName ? 'default' : 'outline'}
                    onClick={() => setEditingRole(roleName)}
                  >
                    {def?.title ?? roleName}
                  </Button>
                );
              })}
            </div>
            {editingRole && (
              <div className="space-y-3">
                {Object.entries(permissionGroups).map(([groupName, permissions]) => {
                  const currentPermissions =
                    draftByRole[editingRole] ?? backendByName.get(editingRole) ?? [];
                  return (
                    <div key={groupName} className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {groupName.replace(/_/g, ' ')}
                      </p>
                      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                        {permissions.map((perm) => {
                          const checked = currentPermissions.includes(perm);
                          return (
                            <label
                              key={perm}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted/50"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...currentPermissions, perm]
                                    : currentPermissions.filter((p) => p !== perm);
                                  setDraftByRole((prev) => ({
                                    ...prev,
                                    [editingRole]: Array.from(new Set(next)),
                                  }));
                                }}
                              />
                              <span className="truncate">{formatPermission(perm)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <Button
                  size="sm"
                  onClick={() => {
                    const perms =
                      draftByRole[editingRole] ?? backendByName.get(editingRole) ?? [];
                    savePermissions.mutate({ roleName: editingRole, permissions: perms });
                  }}
                  disabled={savePermissions.isPending}
                >
                  Save {SYSTEM_ROLES.find((r) => r.name === editingRole)?.title} permissions
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
