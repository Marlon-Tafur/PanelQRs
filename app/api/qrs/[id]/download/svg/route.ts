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

    const filePath = resolvePublicFilePath(qr.qrSvgUrl ?? "");
    if (!filePath) {
      return NextResponse.json({ error: "No hay SVG disponible" }, { status: 404 });
    }

    const content = await fs.readFile(filePath, "utf-8");
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${toDownloadFileName(qr.name, "svg")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/qrs/[id]/download/svg]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
