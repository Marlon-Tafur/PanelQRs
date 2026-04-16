import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { QrList } from "@/components/panel/QrList";

export default async function QrsPage() {
  const session = await getSession();
  if (!session.user) redirect("/login");

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

  return <QrList initialQrs={qrs} />;
}
