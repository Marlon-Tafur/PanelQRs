import path from "path";
import QRCode from "qrcode";
import sharp from "sharp";
import { readBinaryFileByStoredUrl, uploadBinaryFile } from "@/lib/storage";

const QR_PNG_SIZE = 1024;
const LOGO_SIDE_RATIO = 0.45; // 20.25% area of QR
const CONTRAST_WARNING_THRESHOLD = 2.5;

type GenerateQrAssetsInput = {
  qrId: string;
  shortUrl: string;
  primaryColor: string;
  backgroundColor: string;
  logoFileUrl?: string | null;
};

type GenerateQrAssetsResult = {
  qrPngUrl: string;
  qrSvgUrl: string;
  contrastRatio: number;
  contrastWarning: boolean;
};

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hexColor: string): Rgb {
  const clean = hexColor.replace("#", "");
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : clean;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error("INVALID_HEX_COLOR");
  }

  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function channelToLinear(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: Rgb): number {
  return (
    0.2126 * channelToLinear(color.r) +
    0.7152 * channelToLinear(color.g) +
    0.0722 * channelToLinear(color.b)
  );
}

export function getContrastRatio(primaryColor: string, backgroundColor: string): number {
  const lumA = relativeLuminance(hexToRgb(primaryColor));
  const lumB = relativeLuminance(hexToRgb(backgroundColor));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function hasLowContrast(primaryColor: string, backgroundColor: string): boolean {
  return getContrastRatio(primaryColor, backgroundColor) < CONTRAST_WARNING_THRESHOLD;
}

function extractSvgSize(svg: string): { width: number; height: number } {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3])) {
      return { width: parts[2], height: parts[3] };
    }
  }

  const widthMatch = svg.match(/width="([\d.]+)"/i);
  const heightMatch = svg.match(/height="([\d.]+)"/i);
  if (widthMatch && heightMatch) {
    const width = Number.parseFloat(widthMatch[1]);
    const height = Number.parseFloat(heightMatch[1]);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      return { width, height };
    }
  }

  return { width: 256, height: 256 };
}

function buildLogoOverlaySvg(options: {
  canvasWidth: number;
  canvasHeight: number;
  logoDataUri: string;
}): string {
  const side = Math.floor(Math.min(options.canvasWidth, options.canvasHeight) * LOGO_SIDE_RATIO);
  const padding = Math.max(Math.floor(side * 0.12), 8);
  const innerSide = side - padding * 2;
  const left = Math.floor((options.canvasWidth - side) / 2);
  const top = Math.floor((options.canvasHeight - side) / 2);
  const radius = Math.floor(side * 0.12);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${options.canvasWidth}" height="${options.canvasHeight}" viewBox="0 0 ${options.canvasWidth} ${options.canvasHeight}">
  <rect x="${left}" y="${top}" width="${side}" height="${side}" rx="${radius}" ry="${radius}" fill="#ffffff"/>
  <image href="${options.logoDataUri}" x="${left + padding}" y="${top + padding}" width="${innerSide}" height="${innerSide}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
}

function withSvgLogo(baseSvg: string, logoDataUri: string): string {
  const size = extractSvgSize(baseSvg);
  const side = Math.floor(Math.min(size.width, size.height) * LOGO_SIDE_RATIO);
  const padding = Math.max(Math.floor(side * 0.12), 2);
  const innerSide = side - padding * 2;
  const left = (size.width - side) / 2;
  const top = (size.height - side) / 2;
  const radius = Math.max(side * 0.12, 2);

  const overlay = `
  <rect x="${left}" y="${top}" width="${side}" height="${side}" rx="${radius}" ry="${radius}" fill="#ffffff"/>
  <image href="${logoDataUri}" x="${left + padding}" y="${top + padding}" width="${innerSide}" height="${innerSide}" preserveAspectRatio="xMidYMid meet"/>`;

  return baseSvg.replace("</svg>", `${overlay}\n</svg>`);
}

async function loadLogoBuffer(logoFileUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!/^https?:\/\//i.test(logoFileUrl) && !logoFileUrl.startsWith("/")) {
    throw new Error("INVALID_LOGO_URL");
  }

  try {
    return await readBinaryFileByStoredUrl(logoFileUrl);
  } catch {
    throw new Error("LOGO_FETCH_FAILED");
  }
}

export async function generateQrAssets(input: GenerateQrAssetsInput): Promise<GenerateQrAssetsResult> {
  const contrastRatio = getContrastRatio(input.primaryColor, input.backgroundColor);
  const contrastWarning = contrastRatio < CONTRAST_WARNING_THRESHOLD;

  const qrSvgBase = await QRCode.toString(input.shortUrl, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 1,
    color: {
      dark: input.primaryColor,
      light: input.backgroundColor,
    },
  });

  let qrSvgFinal = qrSvgBase;
  let qrPngBuffer = await QRCode.toBuffer(input.shortUrl, {
    type: "png",
    width: QR_PNG_SIZE,
    errorCorrectionLevel: "H",
    margin: 1,
    color: {
      dark: input.primaryColor,
      light: input.backgroundColor,
    },
  });

  if (input.logoFileUrl) {
    const logo = await loadLogoBuffer(input.logoFileUrl);
    const logoDataUri = `data:${logo.mimeType};base64,${logo.buffer.toString("base64")}`;

    qrSvgFinal = withSvgLogo(qrSvgBase, logoDataUri);

    const overlay = buildLogoOverlaySvg({
      canvasWidth: QR_PNG_SIZE,
      canvasHeight: QR_PNG_SIZE,
      logoDataUri,
    });

    qrPngBuffer = await sharp(qrPngBuffer)
      .composite([{ input: Buffer.from(overlay) }])
      .png()
      .toBuffer();
  }

  const timestamp = Date.now();
  const pngObjectPath = path.posix.join("qrs", input.qrId, `qr-${timestamp}.png`);
  const svgObjectPath = path.posix.join("qrs", input.qrId, `qr-${timestamp}.svg`);

  const [qrPngUrl, qrSvgUrl] = await Promise.all([
    uploadBinaryFile({
      objectPath: pngObjectPath,
      content: qrPngBuffer,
      contentType: "image/png",
    }),
    uploadBinaryFile({
      objectPath: svgObjectPath,
      content: Buffer.from(qrSvgFinal, "utf-8"),
      contentType: "image/svg+xml",
    }),
  ]);

  return {
    qrPngUrl,
    qrSvgUrl,
    contrastRatio,
    contrastWarning,
  };
}
