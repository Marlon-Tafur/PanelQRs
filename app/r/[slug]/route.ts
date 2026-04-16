import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // 1. Buscar QrCode por slug
  const qr = await prisma.qrCode.findUnique({
    where: { slug },
  });

  // 2. Si no existe → 404
  if (!qr) {
    return new NextResponse(html404(), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 3. Si está pausado → 200 con página informativa
  if (!qr.isActive) {
    return new NextResponse(htmlPaused(qr.name), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 4. Buscar versión actual
  const currentVersion = await prisma.qrRedirectVersion.findFirst({
    where: { qrCodeId: qr.id, isCurrent: true },
  });

  if (!currentVersion) {
    return new NextResponse(html500(), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 5. Validar URL destino
  const url = currentVersion.destinationUrl;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return new NextResponse(html500(), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 6. Registrar scan log (fire-and-forget — no bloquea el redirect)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");

  // No await — registramos en background para no agregar latencia al redirect
  prisma.qrScanLog
    .create({
      data: {
        qrCodeId: qr.id,
        redirectVersionId: currentVersion.id,
        userAgent: request.headers.get("user-agent") ?? null,
        referer: request.headers.get("referer") ?? null,
        ipHash,
      },
    })
    .catch((err) => console.error("[scan-log]", err));

  // 7. Redirect 302
  return NextResponse.redirect(url, { status: 302 });
}

function htmlPaused(name: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QR pausado</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; }
    .card { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 400px; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; color: #111827; margin: 0 0 0.5rem; }
    p { color: #6b7280; font-size: 0.9rem; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#9646;&#9646;</div>
    <h1>QR temporalmente deshabilitado</h1>
    <p>El código QR <strong>${escapeHtml(name)}</strong> no está disponible en este momento.</p>
  </div>
</body>
</html>`;
}

function html404(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QR no encontrado</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; }
    .card { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 400px; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; color: #111827; margin: 0 0 0.5rem; }
    p { color: #6b7280; font-size: 0.9rem; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#128269;</div>
    <h1>QR no encontrado</h1>
    <p>El código QR que escaneaste no existe o fue eliminado.</p>
  </div>
</body>
</html>`;
}

function html500(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Error</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; }
    .card { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 400px; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; color: #111827; margin: 0 0 0.5rem; }
    p { color: #6b7280; font-size: 0.9rem; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#9888;&#65039;</div>
    <h1>Error de configuración</h1>
    <p>No se pudo procesar este QR. Contactá al administrador.</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
