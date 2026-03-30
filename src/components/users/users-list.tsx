"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, UserCog, Trash2, ShieldCheck, Eye } from "lucide-react";
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

const userSchema = z.object({
  name:     z.string().min(1, "Name required"),
  email:    z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role:     z.enum(["admin", "viewer"]),
});

type UserFormValues = z.infer<typeof userSchema>;

interface SafeUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface UsersListProps {
  tenant: string;
}

function RoleBadge({ role }: { role: string }) {
  return role === "admin" ? (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20">
      <ShieldCheck className="h-3 w-3" /> Admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground border border-border">
      <Eye className="h-3 w-3" /> Viewer
    </span>
  );
}

export function UsersList({ tenant }: UsersListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<SafeUser[]>({
    queryKey: ["users", tenant],
    queryFn: () => fetch(`/api/${tenant}/users`).then((r) => r.json()),
  });

  const addMutation = useMutation({
    mutationFn: (data: UserFormValues) =>
      fetch(`/api/${tenant}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", tenant] });
      setDialogOpen(false);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/${tenant}/users/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users", tenant] }),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({ resolver: zodResolver(userSchema), defaultValues: { role: "viewer" } });

  const roleValue = watch("role");

  function onSubmit(values: UserFormValues) {
    addMutation.mutate(values);
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
                  <TableCell className="text-right">
                    {/* Cannot delete yourself */}
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Full name" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="user@example.com" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" placeholder="Min. 6 characters" {...register("password")} />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={roleValue} onValueChange={(v) => setValue("role", v as "admin" | "viewer")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer — read only</SelectItem>
                  <SelectItem value="admin">Admin — full access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Creating…" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
