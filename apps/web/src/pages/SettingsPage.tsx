import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  User as UserIcon,
  Store,
  Users as UsersIcon,
  Shield,
  Plus,
  ClipboardList,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { api, applyAccessToken } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { useShops, useUpdateShop, type Shop } from '@/hooks/use-shops';
import { useProductCategories } from '@/hooks/use-product-categories';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  type User,
} from '@/hooks/use-users';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/AppLayout';
import {
  ANIMAL_AVATARS,
  animalAvatarByKind,
  animalAvatarForUser,
  getAnimalAvatarPreference,
  setAnimalAvatarPreference,
  type AnimalAvatarKind,
} from '@/lib/profile-avatar';
import { mapUserFormToCreatePayload, mapUserFormToUpdatePayload } from '@/lib/payload-mappers';
import { getApiErrorMessage } from '@/lib/api-error';
import type { AuthUser } from '@/store/authStore';
import { ALL_SHOPS_OPTION, normalizeAllShopsSelection, toAllShopsSelection } from '@/lib/shop-scope';

// --- Schemas ---

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Min 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const userFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().optional(),
  roleId: z.string().min(1, 'Role is required'),
  shopId: z.string().min(1, 'Shop is required'),
  isActive: z.boolean(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type UserFormValues = z.infer<typeof userFormSchema>;

// --- Role definitions (system-defined, read-only) ---

const SYSTEM_ROLES = [
  {
    name: 'ADMIN',
    value: 'ADMIN',
    description: 'Full system access',
    permissions: [
      'products.manage',
      'goods-receipts.manage',
      'goods-issues.manage',
      'purchase-orders.manage',
      'reports.view',
      'reports.export',
      'shops.manage',
      'users.manage',
      'settings.manage',
    ],
  },
  {
    name: 'SHOP_MANAGER',
    value: 'INVENTORY_MANAGER',
    description: 'Shop-level management',
    permissions: [
      'products.view',
      'products.create',
      'products.edit',
      'goods-receipts.manage',
      'goods-issues.manage',
      'purchase-orders.create',
      'reports.view',
      'reports.export',
    ],
  },
  {
    name: 'SHOP_STAFF',
    value: 'SHOP_USER',
    description: 'Basic shop operations',
    permissions: [
      'products.view',
      'goods-receipts.create',
      'goods-issues.create',
      'reports.view',
    ],
  },
  {
    name: 'VIEWER',
    value: 'SHOP_USER',
    description: 'Read-only access',
    permissions: ['products.view', 'reports.view'],
  },
];

const PERMISSION_OPTIONS = [
  'company:read',
  'company:write',
  'shop:read',
  'shop:write',
  'storage_location:read',
  'storage_location:write',
  'product:read',
  'product:write',
  'supplier:read',
  'supplier:write',
  'rfq:read',
  'rfq:write',
  'quote:read',
  'quote:write',
  'contract:read',
  'contract:write',
  'goods_receipt:create',
  'goods_receipt:read',
  'goods_issue:create',
  'goods_issue:read',
  'damage:create',
  'damage:read',
  'purchase_order:create',
  'purchase_order:read',
  'report:view',
  'report:export',
  'user:manage',
  'audit_log:read',
];

// --- Profile Tab ---

function ProfileTab() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showAnimalPicker, setShowAnimalPicker] = useState(false);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  });

  const profileQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data as NonNullable<typeof user>;
    },
    enabled: !!user,
    refetchOnMount: 'always',
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    if (!profileQuery.data) return;
    setUser(profileQuery.data);
  }, [profileQuery.data, setUser]);

  useEffect(() => {
    profileForm.reset({ name: user?.name ?? '' });
  }, [profileForm, user?.name]);

  const saveProfile = useMutation({
    mutationFn: async (values: ProfileForm) => {
      if (avatarFile) {
        const form = new FormData();
        form.append('name', values.name.trim());
        form.append('avatar', avatarFile);
        // Let axios set multipart boundary — manual Content-Type breaks uploads.
        const res = await api.patch<{
          data?: AuthUser;
        }>('/auth/profile', form);
        return (res.data?.data ?? res.data) as AuthUser;
      }
      const res = await api.patch<{ data?: AuthUser }>('/auth/profile', {
        name: values.name.trim(),
      });
      return (res.data?.data ?? res.data) as AuthUser;
    },
    onSuccess: (nextUser) => {
      setUser(nextUser);
      profileForm.reset({ name: nextUser.name });
      setAvatarFile(null);
      toast.success('Profile updated successfully.');
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Failed to update profile.'));
    },
  });

  const changePassword = useMutation({
    mutationFn: async (values: PasswordForm) => {
      await api.patch('/auth/password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
    },
    onSuccess: () => {
      passwordForm.reset();
      toast.success('Password changed. You will be logged out.');
      setTimeout(async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          /* ok */
        }
        applyAccessToken(null);
        clear();
        nav('/login', { replace: true });
      }, 1500);
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Failed to change password.'));
    },
  });

  const avatar = animalAvatarForUser(user);
  const selectedAnimal = getAnimalAvatarPreference(user);

  const handleAnimalSelect = (kind: AnimalAvatarKind) => {
    setAnimalAvatarPreference(user, kind);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (user) {
      setUser({ ...user });
    }
    toast.success('Animal avatar selected.');
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {avatarPreview || user?.avatarUrl ? (
                <img
                  src={avatarPreview ?? user?.avatarUrl ?? ''}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${avatar.bgClass}`}>
                  <span aria-label={`${avatar.kind} avatar`} role="img" className="text-2xl">
                    {avatar.emoji}
                  </span>
                </div>
              )}
            </div>
            <div>
              <div className="font-semibold">{user?.name}</div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs text-primary hover:underline">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    setAvatarFile(e.target.files?.[0] ?? null)
                  }
                />
                Change avatar
              </label>
                <button
                type="button"
                  className="ml-3 mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-500"
                onClick={() => setShowAnimalPicker((v) => !v)}
              >
                {showAnimalPicker ? 'Hide animals' : 'Choose animal avatar'}
              </button>
              {avatarFile && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {avatarFile.name}
                </span>
              )}
              {showAnimalPicker && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {ANIMAL_AVATARS.map((kind) => {
                    const a = animalAvatarByKind(kind);
                    const active = selectedAnimal === kind;
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => handleAnimalSelect(kind)}
                        className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-left transition ${
                          active
                            ? 'border-indigo-300 bg-indigo-50'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                        title={`Use ${kind} avatar`}
                      >
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${a.bgClass}`}>
                          <span role="img" aria-label={`${kind} avatar`}>
                            {a.emoji}
                          </span>
                        </span>
                        <span className="text-xs capitalize text-slate-700">{kind}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <form
            onSubmit={profileForm.handleSubmit((v) => saveProfile.mutate(v))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                {...profileForm.register('name')}
              />
              {profileForm.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ''} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={user?.role ?? ''}
                readOnly
                className="bg-muted capitalize"
              />
            </div>
            <div className="space-y-2">
              <Label>Shop</Label>
              <Input
                value={user?.shop?.shopName ?? 'No shop linked'}
                readOnly
                className="bg-muted"
              />
            </div>
            <Button
              type="submit"
              disabled={saveProfile.isPending}
              className="w-full"
            >
              {saveProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={passwordForm.handleSubmit((v) =>
              changePassword.mutate(v),
            )}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="pw-current">Current Password</Label>
              <div className="relative">
                <Input
                  id="pw-current"
                  type={showCurrentPw ? 'text' : 'password'}
                  {...passwordForm.register('currentPassword')}
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrentPw((v) => !v)}
                >
                  {showCurrentPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-new">New Password</Label>
              <div className="relative">
                <Input
                  id="pw-new"
                  type={showNewPw ? 'text' : 'password'}
                  {...passwordForm.register('newPassword')}
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNewPw((v) => !v)}
                >
                  {showNewPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordForm.formState.errors.newPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-confirm">Confirm New Password</Label>
              <Input
                id="pw-confirm"
                type="password"
                {...passwordForm.register('confirmPassword')}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              variant="destructive"
              disabled={changePassword.isPending}
              className="w-full"
            >
              {changePassword.isPending ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Shop Details Tab ---

function ShopDetailsTab() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';
  const { data: shops, isLoading } = useShops();
  const updateShop = useUpdateShop();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    shopName: '',
    shopNumber: '',
    address: '',
  });

  const startEdit = (shop: Shop) => {
    setEditingId(shop.id);
    setEditForm({
      shopName: shop.shopName,
      shopNumber: shop.shopNumber,
      address: shop.address,
    });
  };

  const saveShop = async () => {
    if (!editingId) return;
    try {
      const updatedShop = await updateShop.mutateAsync({
        id: editingId,
        shopName: editForm.shopName.trim(),
        shopNumber: editForm.shopNumber.trim(),
        address: editForm.address.trim(),
      });
      if (user && user.shopId === updatedShop.id) {
        setUser({
          ...user,
          shop: updatedShop,
        });
      }
      setEditingId(null);
      toast.success('Shop updated successfully.');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message ?? 'Failed to update shop.';
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-5 w-40 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const displayShops = isAdmin
    ? shops ?? []
    : (shops ?? []).filter((s) => s.id === user?.shopId);

  if (displayShops.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Store className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>No shop is linked to your account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {displayShops.map((shop) => (
        <Card key={shop.id}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              {shop.shopName}
            </CardTitle>
            {editingId !== shop.id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startEdit(shop)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editingId === shop.id ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Shop Name</Label>
                  <Input
                    value={editForm.shopName}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, shopName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shop Code</Label>
                  <Input
                    value={editForm.shopNumber}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, shopNumber: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, address: e.target.value }))
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={saveShop}
                    disabled={updateShop.isPending}
                  >
                    {updateShop.isPending ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Code</span>
                  <span className="font-medium">{shop.shopNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-medium">{shop.address || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={shop.isActive ? 'Active' : 'Inactive'} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// --- Users Tab (Admin) ---

function UsersTab() {
  const { data: users, isLoading } = useUsers();
  const { data: shops } = useShops();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      roleId: '',
      shopId: ALL_SHOPS_OPTION,
      isActive: true,
    },
  });

  const openCreate = () => {
    setEditingUser(null);
    form.reset({
      name: '',
      email: '',
      password: '',
      roleId: '',
      shopId: ALL_SHOPS_OPTION,
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    form.reset({
      name: u.name,
      email: u.email,
      password: '',
      roleId: u.role?.name ?? '',
      shopId: toAllShopsSelection(u.shopId),
      isActive: u.isActive,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: UserFormValues) => {
    try {
      const resolvedShopId = normalizeAllShopsSelection(values.shopId);
      if (editingUser) {
        const payload = mapUserFormToUpdatePayload({
          id: editingUser.id,
          values,
          resolvedShopId,
        });
        await updateUser.mutateAsync(payload);
        toast.success('User updated.');
      } else {
        const payload = mapUserFormToCreatePayload({
          values,
          resolvedShopId,
        });
        await createUser.mutateAsync(payload);
        toast.success('User created.');
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        (editingUser ? 'Failed to update user.' : 'Failed to create user.');
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteUser.mutateAsync(deleteConfirm.id);
      toast.success('User deleted.');
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete user.');
    }
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add User
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Shop</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(users ?? []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            (users ?? []).map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {u.role?.name?.toLowerCase().replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell>{u.shop?.shopName ?? 'All Shops'}</TableCell>
                <TableCell>
                  <StatusBadge status={u.isActive ? 'Active' : 'Inactive'} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(u)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(u)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Update the user details below.'
                : 'Fill in the details to create a new user.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                {...form.register('email')}
                readOnly={!!editingUser}
                className={editingUser ? 'bg-muted' : ''}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                Password{editingUser ? ' (leave blank to keep current)' : ''}
              </Label>
              <Input type="password" {...form.register('password')} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.watch('roleId')}
                onValueChange={(v) => form.setValue('roleId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEM_ROLES.map((r) => (
                    <SelectItem key={`${r.name}-${r.value}`} value={r.value}>
                      {r.name.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.roleId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.roleId.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Shop</Label>
              <Select
                value={form.watch('shopId')}
                onValueChange={(v) => form.setValue('shopId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shop" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SHOPS_OPTION}>All Shops</SelectItem>
                  {(shops ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.shopName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.shopId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.shopId.message}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.watch('isActive')}
                onCheckedChange={(v) => form.setValue('isActive', v)}
              />
              <Label>Active</Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUser.isPending || updateUser.isPending}
              >
                {createUser.isPending || updateUser.isPending
                  ? 'Saving...'
                  : editingUser
                    ? 'Update User'
                    : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteConfirm?.name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

// --- Roles & Permissions Tab ---

function RolesTab() {
  const { data: roleRows = [] } = useQuery({
    queryKey: ['roles', 'permissions'],
    queryFn: async () => {
      const res = await api.get('/users/roles/list');
      return (res.data.data ?? []) as Array<{ name: string; permissions: string[] }>;
    },
  });
  const [draftByRole, setDraftByRole] = useState<Record<string, string[]>>({});

  const savePermissions = useMutation({
    mutationFn: async ({ roleName, permissions }: { roleName: string; permissions: string[] }) => {
      const res = await api.patch(`/users/roles/${roleName}/permissions`, { permissions });
      return res.data.data;
    },
    onSuccess: () => toast.success('Role permissions updated'),
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
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Role Permission Matrix</p>
              <p className="text-xs text-muted-foreground">
                Configure access role-wise with grouped permissions.
              </p>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {PERMISSION_OPTIONS.length} permissions
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
      {SYSTEM_ROLES.map((role) => {
        const currentPermissions = draftByRole[role.value] ?? backendByName.get(role.value) ?? role.permissions;
        return (
          <Card key={role.name} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    {role.name.replace(/_/g, ' ')}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  {currentPermissions.length} enabled
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                {Object.entries(permissionGroups).map(([groupName, permissions]) => (
                  <div key={groupName} className="rounded-xl border border-slate-200 bg-white p-2.5">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {groupName.replace(/_/g, ' ')}
                    </p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {permissions.map((perm) => {
                        const checked = currentPermissions.includes(perm);
                        return (
                          <label
                            key={perm}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-xs transition hover:border-blue-200 hover:bg-blue-50/80"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...currentPermissions, perm]
                                  : currentPermissions.filter((p) => p !== perm);
                                setDraftByRole((prev) => ({ ...prev, [role.value]: Array.from(new Set(next)) }));
                              }}
                            />
                            <span className="truncate">{formatPermission(perm)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={() => savePermissions.mutate({ roleName: role.value, permissions: currentPermissions })}
                disabled={savePermissions.isPending}
              >
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Save Permissions
              </Button>
            </CardContent>
          </Card>
        );
      })}
      </div>
    </div>
  );
}

function CategoriesTab() {
  const { categories, saveCategories } = useProductCategories();
  const [form, setForm] = useState({ name: '', code: '', skuPrefix: '', description: '' });

  const onAdd = () => {
    if (!form.name.trim() || !form.code.trim() || !form.skuPrefix.trim()) {
      toast.error('Name, code, and SKU prefix are required');
      return;
    }
    const exists = categories.some(
      (c) => c.name.toLowerCase() === form.name.trim().toLowerCase() || c.code.toLowerCase() === form.code.trim().toLowerCase(),
    );
    if (exists) {
      toast.error('Category name or code already exists');
      return;
    }
    saveCategories([
      ...categories,
      {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        skuPrefix: form.skuPrefix.trim().toUpperCase(),
        description: form.description.trim() || undefined,
      },
    ]);
    setForm({ name: '', code: '', skuPrefix: '', description: '' });
    toast.success('Category added');
  };

  const onDelete = (code: string) => {
    saveCategories(categories.filter((c) => c.code !== code));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Add Product Category</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Category name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Input placeholder="Code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          <Input placeholder="SKU Prefix" value={form.skuPrefix} onChange={(e) => setForm((p) => ({ ...p, skuPrefix: e.target.value }))} />
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <div className="md:col-span-4">
            <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4 mr-1" />Add Category</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Product Categories</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>SKU Prefix</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.code}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.code}</TableCell>
                  <TableCell>{c.skuPrefix}</TableCell>
                  <TableCell>{c.description ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onDelete(c.code)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Main component ---

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';

  return (
    <AppLayout active="Settings">
      <div className="space-y-5">
        <Card>
          <CardContent className="pt-6">
            <PageHeader
              title="Settings"
              description="Manage your account, shop, users, categories, and access controls"
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="h-auto w-full flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-2">
            <TabsTrigger value="profile" className="gap-1.5">
              <UserIcon className="h-3.5 w-3.5" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="shop" className="gap-1.5">
              <Store className="h-3.5 w-3.5" />
              Shop Details
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="gap-1.5">
                <UsersIcon className="h-3.5 w-3.5" />
                Users
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="categories" className="gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
                Categories
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="roles" className="gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Roles & Permissions
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile">
            <ProfileTab />
          </TabsContent>

          <TabsContent value="shop">
            <ShopDetailsTab />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users">
              <Card>
                <CardContent className="pt-6">
                  <UsersTab />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="categories">
              <CategoriesTab />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="roles">
              <RolesTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
