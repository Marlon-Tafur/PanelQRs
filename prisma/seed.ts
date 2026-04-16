import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DAY_MS = 24 * 60 * 60 * 1000;

type DemoVersion = {
  destinationUrl: string;
  changeNote: string;
  scanCount: number;
};

type DemoQr = {
  name: string;
  slug: string;
  isActive: boolean;
  description: string;
  primaryColor: string;
  backgroundColor: string;
  versions: DemoVersion[];
};

function buildShortUrl(slug: string): string {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  return `${baseUrl}/r/${slug}`;
}

function randomDateBetween(start: Date, end: Date): Date {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const randomMs = startMs + Math.floor(Math.random() * Math.max(endMs - startMs, 1));
  return new Date(randomMs);
}

async function ensureDemoUsers() {
  const users = [
    { name: "Administrador", email: "admin@panelqrs.com", password: "admin123", isActive: true },
    { name: "Operaciones", email: "ops@panelqrs.com", password: "ops12345", isActive: true },
    { name: "Marketing", email: "marketing@panelqrs.com", password: "market123", isActive: true },
    { name: "Soporte", email: "soporte@panelqrs.com", password: "soporte123", isActive: false },
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        isActive: user.isActive,
        passwordHash,
      },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        isActive: user.isActive,
      },
    });
  }
}

async function ensureDemoQrData(createdBy: string) {
  const demoQrs: DemoQr[] = [
    {
      name: "QR Tienda Principal",
      slug: "tienda2026",
      isActive: true,
      description: "QR impreso en mostrador para llevar trafico al ecommerce.",
      primaryColor: "#111111",
      backgroundColor: "#FFFFFF",
      versions: [
        {
          destinationUrl: "https://example.com/campana-invierno",
          changeNote: "Campana invierno",
          scanCount: 32,
        },
        {
          destinationUrl: "https://example.com/campana-verano",
          changeNote: "Campana verano",
          scanCount: 58,
        },
      ],
    },
    {
      name: "QR Catalogo Expo",
      slug: "expo2026qr",
      isActive: true,
      description: "QR para ferias y eventos con material comercial.",
      primaryColor: "#0057B8",
      backgroundColor: "#FFFFFF",
      versions: [
        {
          destinationUrl: "https://example.com/catalogo/v1",
          changeNote: "Version inicial",
          scanCount: 24,
        },
        {
          destinationUrl: "https://example.com/catalogo/v2",
          changeNote: "Seccion novedades",
          scanCount: 44,
        },
        {
          destinationUrl: "https://example.com/catalogo/v3",
          changeNote: "CTA a WhatsApp",
          scanCount: 61,
        },
      ],
    },
    {
      name: "QR Menu Cafeteria",
      slug: "menu-cafe1",
      isActive: false,
      description: "QR de menu digital para punto fisico.",
      primaryColor: "#3B2F2F",
      backgroundColor: "#F5E9DA",
      versions: [
        {
          destinationUrl: "https://example.com/menu/manana",
          changeNote: "Menu manana",
          scanCount: 16,
        },
        {
          destinationUrl: "https://example.com/menu/tarde",
          changeNote: "Menu tarde",
          scanCount: 22,
        },
      ],
    },
  ];

  for (const demoQr of demoQrs) {
    const existing = await prisma.qrCode.findUnique({
      where: { slug: demoQr.slug },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    const qrCode = await prisma.qrCode.create({
      data: {
        name: demoQr.name,
        slug: demoQr.slug,
        shortUrl: buildShortUrl(demoQr.slug),
        isActive: demoQr.isActive,
        description: demoQr.description,
        primaryColor: demoQr.primaryColor,
        backgroundColor: demoQr.backgroundColor,
        createdBy,
      },
    });

    const now = new Date();
    let cursorStart = new Date(now.getTime() - demoQr.versions.length * 14 * DAY_MS);

    for (let i = 0; i < demoQr.versions.length; i++) {
      const version = demoQr.versions[i];
      const isCurrent = i === demoQr.versions.length - 1;
      const nextStart = new Date(cursorStart.getTime() + 14 * DAY_MS);
      const endedAt = isCurrent ? null : nextStart;

      const createdVersion = await prisma.qrRedirectVersion.create({
        data: {
          qrCodeId: qrCode.id,
          versionNumber: i + 1,
          destinationUrl: version.destinationUrl,
          isCurrent,
          startedAt: cursorStart,
          endedAt,
          createdBy,
          changeNote: version.changeNote,
        },
      });

      const scanStart = cursorStart;
      const scanEnd = endedAt ?? now;
      const scanLogs = Array.from({ length: version.scanCount }).map(() => ({
        qrCodeId: qrCode.id,
        redirectVersionId: createdVersion.id,
        scannedAt: randomDateBetween(scanStart, scanEnd),
        userAgent: "Mozilla/5.0 (Linux; Android 13)",
        referer: "https://google.com",
        ipHash: "demo-seed-hash",
      }));

      if (scanLogs.length > 0) {
        await prisma.qrScanLog.createMany({ data: scanLogs });
      }

      cursorStart = nextStart;
    }
  }
}

async function main() {
  await ensureDemoUsers();

  const admin = await prisma.user.findUnique({
    where: { email: "admin@panelqrs.com" },
    select: { id: true },
  });

  if (!admin) {
    throw new Error("No se pudo preparar usuario administrador para seed.");
  }

  await ensureDemoQrData(admin.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
