import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const qr = await prisma.qrCode.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!qr) {
    return NextResponse.json({ error: "QR no encontrado" }, { status: 404 });
  }

  const versions = await prisma.qrRedirectVersion.findMany({
    where: { qrCodeId: id },
    orderBy: { versionNumber: "desc" },
    include: {
      _count: { select: { scanLogs: true } },
    },
  });

  return NextResponse.json(versions);
}
