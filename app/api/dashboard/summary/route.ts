import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/qr/analytics";

export async function GET() {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const summary = await getDashboardSummary();
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[GET /api/dashboard/summary]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
