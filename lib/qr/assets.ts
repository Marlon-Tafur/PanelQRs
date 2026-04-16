import fs from "fs/promises";
import { prisma } from "@/lib/db/prisma";
import { resolvePublicFilePath } from "@/lib/storage/local";
import { generateQrAssets } from "@/lib/qr/generator";

type QrAssetRecord = {
  id: string;
  name: string;
  shortUrl: string;
  primaryColor: string;
  backgroundColor: string;
  logoFileUrl: string | null;
  qrPngUrl: string | null;
  qrSvgUrl: string | null;
};

async function fileExistsFromPublicUrl(publicUrl: string | null): Promise<boolean> {
  if (!publicUrl) return false;
  if (!publicUrl.startsWith("/")) return false;

  const filePath = resolvePublicFilePath(publicUrl);
  if (!filePath) return false;

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getQrWithAssets(qrId: string): Promise<QrAssetRecord | null> {
  const qr = await prisma.qrCode.findUnique({
    where: { id: qrId },
    select: {
      id: true,
      name: true,
      shortUrl: true,
      primaryColor: true,
      backgroundColor: true,
      logoFileUrl: true,
      qrPngUrl: true,
      qrSvgUrl: true,
    },
  });

  if (!qr) return null;

  const hasPng = await fileExistsFromPublicUrl(qr.qrPngUrl);
  const hasSvg = await fileExistsFromPublicUrl(qr.qrSvgUrl);
  if (hasPng && hasSvg) return qr;

  const generated = await generateQrAssets({
    qrId: qr.id,
    shortUrl: qr.shortUrl,
    primaryColor: qr.primaryColor,
    backgroundColor: qr.backgroundColor,
    logoFileUrl: qr.logoFileUrl,
  });

  const updated = await prisma.qrCode.update({
    where: { id: qr.id },
    data: {
      qrPngUrl: generated.qrPngUrl,
      qrSvgUrl: generated.qrSvgUrl,
    },
    select: {
      id: true,
      name: true,
      shortUrl: true,
      primaryColor: true,
      backgroundColor: true,
      logoFileUrl: true,
      qrPngUrl: true,
      qrSvgUrl: true,
    },
  });

  return updated;
}
