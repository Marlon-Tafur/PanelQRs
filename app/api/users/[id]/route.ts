import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { updateUserSchema } from "@/lib/users/schemas";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.isActive === false && session.user.id === id) {
    return NextResponse.json(
      { error: "No puedes desactivar tu propio usuario mientras estas logueado" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const updateData: {
    name?: string;
    email?: string;
    isActive?: boolean;
    passwordHash?: string;
  } = {};

  if (parsed.data.name !== undefined) {
    updateData.name = parsed.data.name.trim();
  }

  if (parsed.data.email !== undefined) {
    const normalized = parsed.data.email.trim().toLowerCase();
    const emailOwner = await prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true },
    });
    if (emailOwner && emailOwner.id !== id) {
      return NextResponse.json(
        { error: "Ya existe otro usuario con ese email" },
        { status: 409 }
      );
    }
    updateData.email = normalized;
  }

  if (parsed.data.isActive !== undefined) {
    updateData.isActive = parsed.data.isActive;
  }

  if (parsed.data.newPassword !== undefined) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(updated);
}
