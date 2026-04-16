import { prisma } from "@/lib/db/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS_RANGE = 30;
const MAX_DAYS_RANGE = 90;

type RangeInput = {
  startDate?: string | null;
  endDate?: string | null;
};

export type ResolvedDateRange = {
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
  days: number;
};

export type QrStatsResult = {
  qrId: string;
  range: {
    startDate: string;
    endDate: string;
    days: number;
  };
  totalScansAllTime: number;
  totalScansInRange: number;
  scansByVersion: Array<{
    redirectVersionId: string;
    versionNumber: number;
    destinationUrl: string;
    isCurrent: boolean;
    startedAt: Date;
    endedAt: Date | null;
    scanCount: number;
  }>;
  scansByDate: Array<{
    date: string;
    scanCount: number;
  }>;
};

export type DashboardSummaryResult = {
  totalQrs: number;
  activeQrs: number;
  pausedQrs: number;
  totalScans: number;
  scansLast7Days: number;
  topQrs: Array<{
    qrId: string;
    name: string;
    slug: string;
    isActive: boolean;
    scanCount: number;
    currentDestinationUrl: string | null;
  }>;
};

function parseDay(dateString: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
  const parsed = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function resolveDateRange(input: RangeInput): ResolvedDateRange {
  const today = new Date();
  const todayStart = startOfUtcDay(today);

  const parsedStart = input.startDate ? parseDay(input.startDate) : null;
  const parsedEnd = input.endDate ? parseDay(input.endDate) : null;

  let start = parsedStart;
  let end = parsedEnd;

  if (!start && !end) {
    end = todayStart;
    start = addUtcDays(end, -(DEFAULT_DAYS_RANGE - 1));
  } else if (start && !end) {
    end = todayStart;
  } else if (!start && end) {
    start = addUtcDays(end, -(DEFAULT_DAYS_RANGE - 1));
  }

  if (!start || !end) {
    throw new Error("INVALID_RANGE");
  }

  if (start.getTime() > end.getTime()) {
    throw new Error("INVALID_RANGE");
  }

  const days = Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
  if (days > MAX_DAYS_RANGE) {
    throw new Error("RANGE_TOO_LARGE");
  }

  return {
    start: startOfUtcDay(start),
    end: endOfUtcDay(end),
    startDate: toDateKey(start),
    endDate: toDateKey(end),
    days,
  };
}

export async function getQrStats(qrId: string, input: RangeInput): Promise<QrStatsResult | null> {
  const range = resolveDateRange(input);

  const qr = await prisma.qrCode.findUnique({
    where: { id: qrId },
    select: {
      id: true,
      redirectVersions: {
        select: {
          id: true,
          versionNumber: true,
          destinationUrl: true,
          isCurrent: true,
          startedAt: true,
          endedAt: true,
        },
        orderBy: { versionNumber: "desc" },
      },
    },
  });

  if (!qr) return null;

  const rangeWhere = {
    qrCodeId: qrId,
    scannedAt: {
      gte: range.start,
      lte: range.end,
    },
  };

  const [totalScansAllTime, totalScansInRange, groupedByVersion, scansInRange] = await Promise.all([
    prisma.qrScanLog.count({ where: { qrCodeId: qrId } }),
    prisma.qrScanLog.count({ where: rangeWhere }),
    prisma.qrScanLog.groupBy({
      by: ["redirectVersionId"],
      where: rangeWhere,
      _count: { _all: true },
    }),
    prisma.qrScanLog.findMany({
      where: rangeWhere,
      select: { scannedAt: true },
    }),
  ]);

  const versionCountMap = new Map(groupedByVersion.map((row) => [row.redirectVersionId, row._count._all]));

  const scansByVersion = qr.redirectVersions.map((version) => ({
    redirectVersionId: version.id,
    versionNumber: version.versionNumber,
    destinationUrl: version.destinationUrl,
    isCurrent: version.isCurrent,
    startedAt: version.startedAt,
    endedAt: version.endedAt,
    scanCount: versionCountMap.get(version.id) ?? 0,
  }));

  const dateCountMap = new Map<string, number>();
  for (const row of scansInRange) {
    const key = toDateKey(row.scannedAt);
    dateCountMap.set(key, (dateCountMap.get(key) ?? 0) + 1);
  }

  const scansByDate: Array<{ date: string; scanCount: number }> = [];
  for (let i = 0; i < range.days; i++) {
    const date = addUtcDays(startOfUtcDay(range.start), i);
    const key = toDateKey(date);
    scansByDate.push({
      date: key,
      scanCount: dateCountMap.get(key) ?? 0,
    });
  }

  return {
    qrId: qr.id,
    range: {
      startDate: range.startDate,
      endDate: range.endDate,
      days: range.days,
    },
    totalScansAllTime,
    totalScansInRange,
    scansByVersion,
    scansByDate,
  };
}

export async function getDashboardSummary(): Promise<DashboardSummaryResult> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);

  const [totalQrs, activeQrs, totalScans, scansLast7Days, groupedTop] = await Promise.all([
    prisma.qrCode.count(),
    prisma.qrCode.count({ where: { isActive: true } }),
    prisma.qrScanLog.count(),
    prisma.qrScanLog.count({
      where: {
        scannedAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.qrScanLog.groupBy({
      by: ["qrCodeId"],
      _count: { _all: true },
      orderBy: {
        _count: { qrCodeId: "desc" },
      },
      take: 5,
    }),
  ]);

  const qrIds = groupedTop.map((row) => row.qrCodeId);
  const qrs = qrIds.length
    ? await prisma.qrCode.findMany({
        where: { id: { in: qrIds } },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          redirectVersions: {
            where: { isCurrent: true },
            select: { destinationUrl: true },
            take: 1,
          },
        },
      })
    : [];

  const qrMap = new Map(qrs.map((qr) => [qr.id, qr]));
  const topQrs = groupedTop
    .map((row) => {
      const qr = qrMap.get(row.qrCodeId);
      if (!qr) return null;
      return {
        qrId: qr.id,
        name: qr.name,
        slug: qr.slug,
        isActive: qr.isActive,
        scanCount: row._count._all,
        currentDestinationUrl: qr.redirectVersions[0]?.destinationUrl ?? null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return {
    totalQrs,
    activeQrs,
    pausedQrs: totalQrs - activeQrs,
    totalScans,
    scansLast7Days,
    topQrs,
  };
}
