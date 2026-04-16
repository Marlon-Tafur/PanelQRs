import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { generateQrAssets } from "@/lib/qr/generator";
import { updateAppearanceSchema } from "@/lib/qr/schemas";

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

  const parsed = updateAppearanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.qrCode.findUnique({
    where: { id },
    select: {
      id: true,
      shortUrl: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "QR no encontrado" }, { status: 404 });
  }

  try {
    const generatedAssets = await generateQrAssets({
      qrId: existing.id,
      shortUrl: existing.shortUrl,
      primaryColor: parsed.data.primaryColor,
      backgroundColor: parsed.data.backgroundColor,
      logoFileUrl: parsed.data.logoFileUrl ?? null,
    });

    const updated = await prisma.qrCode.update({
      where: { id },
      data: {
        primaryColor: parsed.data.primaryColor,
        backgroundColor: parsed.data.backgroundColor,
        logoFileUrl: parsed.data.logoFileUrl ?? null,
        qrPngUrl: generatedAssets.qrPngUrl,
        qrSvgUrl: generatedAssets.qrSvgUrl,
      },
    });

    return NextResponse.json({
      qr: updated,
      contrast: {
        ratio: generatedAssets.contrastRatio,
        warning: generatedAssets.contrastWarning,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "INVALID_LOGO_URL") {
        return NextResponse.json({ error: "URL de logo invalida" }, { status: 400 });
      }
      if (err.message === "LOGO_FETCH_FAILED") {
        return NextResponse.json({ error: "No se pudo descargar el logo" }, { status: 400 });
      }
      if (err.message === "STORAGE_OUTSIDE_PUBLIC") {
        return NextResponse.json(
          { error: "STORAGE_PATH debe apuntar a una ruta local dentro de /public" },
          { status: 500 }
        );
      }
    }

    console.error("[PATCH /api/qrs/[id]/appearance]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
