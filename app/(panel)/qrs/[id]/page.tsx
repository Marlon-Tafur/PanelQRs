import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { QrDetail } from "@/components/panel/QrDetail";

export default async function QrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session.user) redirect("/login");

  const { id } = await params;

  const qr = await prisma.qrCode.findUnique({
    where: { id },
    include: {
      redirectVersions: {
        orderBy: { versionNumber: "desc" },
      },
      _count: { select: { scanLogs: true } },
    },
  });

  if (!qr) notFound();

  return <QrDetail qr={qr} />;
}
