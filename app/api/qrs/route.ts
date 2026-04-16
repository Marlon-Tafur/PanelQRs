import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createQrSchema } from "@/lib/qr/schemas";
import { generateSlug, buildShortUrl } from "@/lib/qr/helpers";
import { generateQrAssets } from "@/lib/qr/generator";

export async function GET() {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const qrs = await prisma.qrCode.findMany({
    include: {
      redirectVersions: {
        where: { isCurrent: true },
        select: { destinationUrl: true, versionNumber: true },
      },
      _count: { select: { scanLogs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(qrs);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = createQrSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, description, destinationUrl } = parsed.data;

  // Generar slug único — máx 3 intentos
  let slug = "";
  let attempts = 0;
  while (attempts < 3) {
    const candidate = generateSlug();
    const existing = await prisma.qrCode.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) {
      slug = candidate;
      break;
    }
    attempts++;
  }

  if (!slug) {
    return NextResponse.json(
      { error: "No se pudo generar un slug único. Intentá de nuevo." },
      { status: 500 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const qrCode = await tx.qrCode.create({
      data: {
        name,
        slug,
        shortUrl: buildShortUrl(slug),
        description,
        createdBy: session.user!.id,
      },
    });

    await tx.qrRedirectVersion.create({
      data: {
        qrCodeId: qrCode.id,
        versionNumber: 1,
        destinationUrl,
        isCurrent: true,
        createdBy: session.user!.id,
      },
    });

    return qrCode;
  });

  try {
    const generated = await generateQrAssets({
      qrId: result.id,
      shortUrl: result.shortUrl,
      primaryColor: result.primaryColor,
      backgroundColor: result.backgroundColor,
      logoFileUrl: result.logoFileUrl,
    });

    const updated = await prisma.qrCode.update({
      where: { id: result.id },
      data: {
        qrPngUrl: generated.qrPngUrl,
        qrSvgUrl: generated.qrSvgUrl,
      },
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    console.error("[POST /api/qrs] qr-asset-generation", err);
    return NextResponse.json(result, { status: 201 });
  }
}
