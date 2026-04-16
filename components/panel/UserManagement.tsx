"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type UserItem = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type Props = {
  initialUsers: UserItem[];
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UserManagement({ initialUsers }: Props) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editUserId, setEditUserId] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editNewPassword, setEditNewPassword] = useState("");

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  async function refreshUsers() {
    const res = await fetch("/api/users");
    if (!res.ok) return;
    const data = (await res.json()) as UserItem[];
    setUsers(data);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    const name = createName.trim();
    const email = createEmail.trim().toLowerCase();

    if (name.length < 2) {
      setCreateError("El nombre debe tener al menos 2 caracteres");
      return;
    }
    if (!isValidEmail(email)) {
      setCreateError("Ingresa un email valido");
      return;
    }
    if (createPassword.length < 8) {
      setCreateError("La contrasena debe tener al menos 8 caracteres");
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password: createPassword,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "No se pudo crear el usuario");
        return;
      }

      setCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      await refreshUsers();
    } catch {
      setCreateError("Error de red. Intenta de nuevo.");
    } finally {
      setCreateLoading(false);
    }
  }

  function openEditUser(user: UserItem) {
    setEditError(null);
    setEditUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditIsActive(user.isActive);
    setEditNewPassword("");
    setEditOpen(true);
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);

    const name = editName.trim();
    const email = editEmail.trim().toLowerCase();

    if (name.length < 2) {
      setEditError("El nombre debe tener al menos 2 caracteres");
      return;
    }
    if (!isValidEmail(email)) {
      setEditError("Ingresa un email valido");
      return;
    }
    if (editNewPassword && editNewPassword.length < 8) {
      setEditError("La nueva contrasena debe tener al menos 8 caracteres");
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetch(`/api/users/${editUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          isActive: editIsActive,
          newPassword: editNewPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "No se pudo actualizar el usuario");
        return;
      }

      setEditOpen(false);
      await refreshUsers();
    } catch {
      setEditError("Error de red. Intenta de nuevo.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleToggleStatus(user: UserItem) {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) return;
      await refreshUsers();
    } catch {
      // silencioso
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">Gestion de cuentas de acceso al panel</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger className={buttonVariants({ variant: "default" })}>
            Nuevo usuario
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-user-name">Nombre</Label>
                <Input
                  id="create-user-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-user-email">Email</Label>
                <Input
                  id="create-user-email"
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-user-password">Contrasena</Label>
                <Input
                  id="create-user-password"
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  required
                />
              </div>
              {createError && <p className="text-sm text-destructive">{createError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? "Creando..." : "Crear usuario"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />

          {filteredUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay usuarios para mostrar.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditUser(user)}>
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.isActive ? "Desactivar" : "Activar"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-name">Nombre</Label>
              <Input
                id="edit-user-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input
                id="edit-user-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-password">Nueva contrasena (opcional)</Label>
              <Input
                id="edit-user-password"
                type="password"
                value={editNewPassword}
                onChange={(e) => setEditNewPassword(e.target.value)}
                placeholder="Dejar vacio para mantener la actual"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={editIsActive ? "default" : "secondary"}
                className={cn("min-w-[120px]")}
                onClick={() => setEditIsActive((prev) => !prev)}
              >
                {editIsActive ? "Activo" : "Inactivo"}
              </Button>
              <span className="text-xs text-muted-foreground">Click para cambiar estado</span>
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
