"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, UserCog, Trash2, ShieldCheck, Eye, EyeOff, Pencil, Key } from "lucide-react";
import type { AccessPage, UserRole } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/stores";
import { format, parseISO } from "date-fns";

const defaultMemberPermissions: AccessPage[] = ["billing", "inventory"];

const accessOptions = [
  { value: "billing" as const, label: "Billing", isDefault: true as const },
  { value: "inventory" as const, label: "Inventory", isDefault: true as const },
  { value: "dashboard" as const, label: "Dashboard", isDefault: false as const },
  { value: "suppliers" as const, label: "Suppliers", isDefault: false as const },
  { value: "customers" as const, label: "Customers", isDefault: false as const },
  { value: "doctors" as const, label: "Doctors", isDefault: false as const },
  { value: "payments" as const, label: "Payments", isDefault: false as const },
  { value: "reports" as const, label: "Reports", isDefault: false as const },
];

const createUserSchema = z.object({
  name:        z.string().min(1, "Name required"),
  email:       z.string().email("Enter a valid email"),
  password:    z.string().min(6, "Password must be at least 6 characters"),
  role:        z.enum(["admin", "member"]),
  permissions: z.array(z.enum(["billing", "inventory", "dashboard", "suppliers", "customers", "doctors", "payments", "reports"])).optional(),
});

const editUserSchema = z.object({
  role:        z.enum(["admin", "member"]),
  permissions: z.array(z.enum(["billing", "inventory", "dashboard", "suppliers", "customers", "doctors", "payments", "reports"])).optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;
type EditUserFormValues = z.infer<typeof editUserSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface SafeUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  permissions?: AccessPage[];
  createdAt: string;
}

interface UsersListProps {
  tenant: string;
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20">
        <ShieldCheck className="h-3 w-3" /> Admin
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground border border-border">
      <Eye className="h-3 w-3" /> Member
    </span>
  );
}

export function UsersList({ tenant }: UsersListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [editUser, setEditUser] = useState<SafeUser | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState<SafeUser | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isLoadingEditUser, setIsLoadingEditUser] = useState(false);
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === "admin";
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, refetch } = useQuery<SafeUser[]>({
    queryKey: ["users", tenant],
    queryFn: async () => {
      const response = await fetch(`/api/${tenant}/users`, { cache: "no-store" });
      const data = await response.json();
      return data;
    },
  });

  const createForm = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "member", permissions: [] },
  });

  const {
    control: createControl,
    register: createRegister,
    handleSubmit: handleCreateSubmit,
    setValue: createSetValue,
    watch: createWatch,
    reset: createReset,
    formState: { errors: createErrors },
  } = createForm;

  const createRoleValue = createWatch("role");
  const createPermissionsValue = createWatch("permissions") as AccessPage[] | undefined;

  // Update permissions when role changes
  useEffect(() => {
    if (createRoleValue === "member") {
      // Set default member permissions
      createSetValue("permissions", defaultMemberPermissions);
    } else if (createRoleValue === "admin") {
      // Clear permissions for admin (they have full access)
      createSetValue("permissions", undefined);
    }
  }, [createRoleValue, createSetValue]);

  const editForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { role: "member", permissions: [] },
  });

  const {
    control: editControl,
    register: editRegister,
    handleSubmit: handleEditSubmit,
    setValue: editSetValue,
    watch: editWatch,
    reset: editReset,
    formState: { errors: editErrors },
  } = editForm;

  const editRoleValue = editWatch("role");
  const editPermissionsValue = editWatch("permissions") as AccessPage[] | undefined;

  // Update permissions when edit role changes (but not when loading user data)
  useEffect(() => {
    if (isLoadingEditUser) return; // Skip while loading user data
    
    if (editRoleValue === "member") {
      // Set default member permissions only if none are set
      if (!editPermissionsValue || editPermissionsValue.length === 0) {
        editSetValue("permissions", defaultMemberPermissions);
      }
    } else if (editRoleValue === "admin") {
      // Clear permissions for admin (they have full access)
      editSetValue("permissions", undefined);
    }
  }, [editRoleValue, editSetValue, editPermissionsValue, isLoadingEditUser]);

  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "" },
  });

  const {
    register: resetRegister,
    handleSubmit: handleResetSubmit,
    reset: resetReset,
    formState: { errors: resetErrors },
  } = resetForm;

  const addMutation = useMutation({
    mutationFn: async (data: CreateUserFormValues) => {
      const response = await fetch(`/api/${tenant}/users`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create user: ${response.status} - ${error}`);
      }
      const result = await response.json();
      return result;
    },
    onSuccess: async (result) => {
      queryClient.setQueryData<SafeUser[] | undefined>(["users", tenant], (current) => {
        const updated = current ? [...current, result] : [result];
        return updated;
      });
      
      await queryClient.invalidateQueries({ queryKey: ["users", tenant] });
      await refetch();
      
      setDialogOpen(false);
      createReset();
    },
    onError: (error) => {
      console.error("[UsersList] Mutation error:", error);
      alert(`Failed to create user: ${error instanceof Error ? error.message : String(error)}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; role: UserRole; permissions?: AccessPage[] }) => {
      const response = await fetch(`/api/${tenant}/users/${data.id}`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: data.role, permissions: data.permissions }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to update user: ${response.status} - ${error}`);
      }
      const result = await response.json();
      return result;
    },
    onSuccess: async (_result, variables) => {
      queryClient.setQueryData<SafeUser[] | undefined>(["users", tenant], (current) =>
        current?.map((user) =>
          user.id === variables.id
            ? { ...user, role: variables.role, permissions: variables.permissions }
            : user
        )
      );
      await queryClient.invalidateQueries({ queryKey: ["users", tenant] });
      await refetch();
      setEditDialogOpen(false);
      setEditUser(null);
      editReset();
    },
    onError: (error) => {
      console.error("[UsersList] Update error:", error);
      alert(`Failed to update user: ${error instanceof Error ? error.message : String(error)}`);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { id: string; password: string }) => {
      const response = await fetch(`/api/${tenant}/users/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.password }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to reset password: ${response.status} - ${error}`);
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users", tenant] });
      await refetch();
      setResetDialogOpen(false);
      setPasswordResetUser(null);
      resetReset();
      setShowResetPassword(false);
    },
    onError: (error) => {
      console.error("[UsersList] Password reset error:", error);
      alert(`Failed to reset password: ${error instanceof Error ? error.message : String(error)}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/${tenant}/users/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users", tenant] }),
  });

  function onCreateSubmit(values: CreateUserFormValues) {
    addMutation.mutate(values);
  }

  function onEditSubmit(values: EditUserFormValues) {
    if (!editUser) return;
    updateMutation.mutate({ id: editUser.id, role: values.role, permissions: values.permissions });
  }

  function onResetSubmit(values: ResetPasswordFormValues) {
    if (!passwordResetUser) return;
    resetPasswordMutation.mutate({ id: passwordResetUser.id, password: values.password });
  }

  function openEditDialog(user: SafeUser) {
    setEditUser(user);
    setIsLoadingEditUser(true);
    editReset({ role: user.role, permissions: user.permissions ?? [] });
    // Allow form to initialize before useEffect runs
    setTimeout(() => setIsLoadingEditUser(false), 0);
    setEditDialogOpen(true);
  }

  function openResetDialog(user: SafeUser) {
    setPasswordResetUser(user);
    resetReset({ password: "" });
    setShowResetPassword(false);
    setResetDialogOpen(true);
  }

  return (
    <>
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-sm">Team Members</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {users.length} user{users.length !== 1 ? "s" : ""} in this workspace
            </p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add User
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Name</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Email</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Role</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Joined</TableHead>
              <TableHead className="h-auto" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <UserCog className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No users found</p>
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-sm">
                    {u.name}
                    <p className="text-xs text-muted-foreground sm:hidden mt-0.5">{u.email}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{u.email}</TableCell>
                  <TableCell><RoleBadge role={u.role} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                    {format(parseISO(u.createdAt), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right space-y-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(u)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openResetDialog(u)}
                          >
                            <Key className="h-3.5 w-3.5" />
                            <span className="sr-only">Reset password</span>
                          </Button>
                        </>
                      )}
                      {u.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteMutation.mutate(u.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { createReset(); setShowCreatePassword(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Create a new team member account and assign roles.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit(onCreateSubmit)} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Full name" {...createRegister("name")} />
              {createErrors.name && <p className="text-xs text-red-500">{createErrors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="user@example.com" {...createRegister("email")} />
              {createErrors.email && <p className="text-xs text-red-500">{createErrors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showCreatePassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  {...createRegister("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword((value) => !value)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                >
                  {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {createErrors.password && <p className="text-xs text-red-500">{createErrors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={createRoleValue} onValueChange={(v) => createSetValue("role", v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {createRoleValue === "admin" && (
                <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-3 py-2 mt-2">
                  ℹ️ Admins have full access to all modules and features.
                </p>
              )}
            </div>

            {createRoleValue === "member" && (
                <Controller
                  control={createControl}
                  name="permissions"
                  defaultValue={defaultMemberPermissions}
                  render={({ field }) => (
                    <div className="space-y-2 rounded-lg border border-border p-4 bg-muted/50">
                      <p className="text-sm font-medium">Module access</p>
                      <p className="text-xs text-muted-foreground">Members have Billing and Inventory by default. Select additional modules.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {accessOptions.map(({ value, label, isDefault }) => {
                          const checked = field.value?.includes(value) ?? (isDefault ?? false);
                          return (
                            <label
                              key={value}
                              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${checked ? "border-primary bg-primary/10" : "border-border bg-background"}`}
                            >
                              <input
                                type="checkbox"
                                value={value}
                                checked={checked}
                                onChange={() => {
                                  const current = field.value ?? defaultMemberPermissions;
                                  const next = current.includes(value)
                                    ? current.filter((p) => p !== value)
                                    : [...current, value];
                                  field.onChange(next);
                                }}
                                className={`h-4 w-4 rounded border border-border text-primary focus:ring-primary ${isDefault ? "cursor-not-allowed opacity-70" : ""}`}
                                disabled={isDefault}
                              />
                              <span>{label}{isDefault ? " (default)" : ""}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                />
              )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Creating…" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditUser(null);
            editReset();
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>Change the role and custom page permissions.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editUser?.name ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editRoleValue} onValueChange={(v) => editSetValue("role", v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {editRoleValue === "admin" && (
                <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-3 py-2 mt-2">
                  ℹ️ Admins have full access to all modules and features.
                </p>
              )}
            </div>

            {editRoleValue === "member" && (
              <Controller
                control={editControl}
                name="permissions"
                defaultValue={editUser?.permissions ?? defaultMemberPermissions}
                render={({ field }) => (
                  <div className="space-y-2 rounded-lg border border-border p-4 bg-muted/50">
                    <p className="text-sm font-medium">Module access</p>
                    <p className="text-xs text-muted-foreground">Members have Billing and Inventory by default. Select additional modules.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {accessOptions.map(({ value, label, isDefault }) => {
                        const checked = field.value?.includes(value) ?? (isDefault ?? false);
                        return (
                          <label
                            key={value}
                            className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${checked ? "border-primary bg-primary/10" : "border-border bg-background"}`}
                          >
                            <input
                              type="checkbox"
                              value={value}
                              checked={checked}
                              onChange={() => {
                                const current = field.value ?? defaultMemberPermissions;
                                const next = current.includes(value)
                                  ? current.filter((p) => p !== value)
                                  : [...current, value];
                                field.onChange(next);
                              }}
                              className="h-4 w-4 rounded border border-border text-primary focus:ring-primary"
                              disabled={isDefault}
                            />
                            <span>{label}{isDefault ? " (default)" : ""}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              />
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetDialogOpen}
        onOpenChange={(open) => {
          setResetDialogOpen(open);
          if (!open) {
            setPasswordResetUser(null);
            resetReset();
            setShowResetPassword(false);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for {passwordResetUser?.name ?? "the user"}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showResetPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  {...resetRegister("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword((value) => !value)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                >
                  {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {resetErrors.password && <p className="text-xs text-red-500">{resetErrors.password.message}</p>}
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setResetDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending ? "Saving…" : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
