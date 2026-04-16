import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { resolveStorageRoot, toPublicUrl } from "@/lib/storage/local";

const MAX_LOGO_SIZE = 500 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/svg+xml"]);

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/svg+xml") return ".svg";
  return "";
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Tipo de archivo invalido. Solo se permite PNG, JPG o SVG." },
      { status: 400 }
    );
  }

  if (file.size > MAX_LOGO_SIZE) {
    return NextResponse.json({ error: "El logo supera el maximo de 500KB." }, { status: 400 });
  }

  try {
    const storageRoot = resolveStorageRoot();
    const logosDir = path.join(storageRoot, "logos");
    await fs.mkdir(logosDir, { recursive: true });

    const extension = extensionFromMimeType(file.type);
    const fileName = `logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;
    const filePath = path.join(logosDir, fileName);

    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));

    const fileUrl = toPublicUrl(filePath);
    if (!fileUrl) {
      return NextResponse.json(
        { error: "STORAGE_PATH debe apuntar a una ruta local dentro de /public" },
        { status: 500 }
      );
    }

    return NextResponse.json({ fileUrl });
  } catch (err) {
    console.error("[POST /api/uploads/logo]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
