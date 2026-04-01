import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { syncCalendarSource } from "@/lib/calendar-sync";

// POST /api/calendars/sync - Trigger sync for a calendar source
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { sourceId } = body;

    if (!sourceId) {
      return NextResponse.json({ error: "Source ID required" }, { status: 400 });
    }

    // Verify ownership
    const source = await prisma.calendarSource.findFirst({
      where: { id: sourceId, userId },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const accessToken = (session.user as any).accessToken;
    const result = await syncCalendarSource(sourceId, accessToken);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
