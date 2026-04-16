import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getQrWithAssets } from "@/lib/qr/assets";
import { resolvePublicFilePath } from "@/lib/storage/local";

type RouteContext = { params: Promise<{ id: string }> };

function toDownloadFileName(name: string, ext: "png" | "svg"): string {
  const safe = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${safe || "qr"}-code.${ext}`;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const qr = await getQrWithAssets(id);
    if (!qr) {
      return NextResponse.json({ error: "QR no encontrado" }, { status: 404 });
    }

    const filePath = resolvePublicFilePath(qr.qrPngUrl ?? "");
    if (!filePath) {
      return NextResponse.json({ error: "No hay PNG disponible" }, { status: 404 });
    }

    const content = await fs.readFile(filePath);
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${toDownloadFileName(qr.name, "png")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/qrs/[id]/download/png]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
