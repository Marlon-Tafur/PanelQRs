import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { changeRedirectSchema } from "@/lib/qr/schemas";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = changeRedirectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { destinationUrl, changeNote } = parsed.data;

  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

  try {
    const newVersion = await prisma.$transaction(async (tx) => {
      // 1. Verificar que el QR existe
      const qr = await tx.qrCode.findUnique({ where: { id } });
      if (!qr) throw new Error("NOT_FOUND");

      // 2. Buscar versión actual
      const currentVersion = await tx.qrRedirectVersion.findFirst({
        where: { qrCodeId: id, isCurrent: true },
      });
      if (!currentVersion) throw new Error("NO_CURRENT_VERSION");

      // 3. Validar que la nueva URL no apunte al propio endpoint de redirección
      if (destinationUrl.startsWith(`${baseUrl}/r/`)) {
        throw new Error("CIRCULAR_REDIRECT");
      }

      // 4. Cerrar versión actual
      await tx.qrRedirectVersion.update({
        where: { id: currentVersion.id },
        data: { isCurrent: false, endedAt: new Date() },
      });

      // 5. Crear nueva versión
      const created = await tx.qrRedirectVersion.create({
        data: {
          qrCodeId: id,
          versionNumber: currentVersion.versionNumber + 1,
          destinationUrl,
          isCurrent: true,
          createdBy: session.user!.id,
          changeNote: changeNote ?? null,
        },
      });

      return created;
    });

    return NextResponse.json(newVersion, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NOT_FOUND") {
        return NextResponse.json({ error: "QR no encontrado" }, { status: 404 });
      }
      if (err.message === "NO_CURRENT_VERSION") {
        return NextResponse.json(
          { error: "Inconsistencia de datos: no hay versión activa para este QR" },
          { status: 500 }
        );
      }
      if (err.message === "CIRCULAR_REDIRECT") {
        return NextResponse.json(
          { error: "La URL no puede apuntar al propio sistema de redirección" },
          { status: 400 }
        );
      }
    }
    console.error("[POST /api/qrs/[id]/redirect-version]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
