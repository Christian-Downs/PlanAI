import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { syncCalendarSource } from "@/lib/calendar-sync";

// POST /api/calendars/sync - Trigger sync for calendar sources
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json().catch(() => ({}));
    const { sourceId } = body;

    const accessToken = (session.user as any).accessToken;

    if (sourceId) {
      // Sync specific source
      const source = await prisma.calendarSource.findFirst({
        where: { id: sourceId, userId },
      });

      if (!source) {
        return NextResponse.json({ error: "Source not found" }, { status: 404 });
      }

      console.log(`Manual sync triggered for source: ${source.name} (${source.type})`);
      const result = await syncCalendarSource(sourceId, accessToken);

      return NextResponse.json({ success: true, data: result });
    } else {
      // Sync all sources for user
      const sources = await prisma.calendarSource.findMany({
        where: { userId, enabled: true },
      });

      const results = [];

      for (const source of sources) {
        try {
          console.log(`Manual sync triggered for source: ${source.name} (${source.type})`);
          const result = await syncCalendarSource(source.id, accessToken);
          results.push({
            sourceId: source.id,
            sourceName: source.name,
            sourceType: source.type,
            success: true,
            ...result,
          });
        } catch (error: any) {
          console.error(`Manual sync failed for source ${source.name}:`, error);
          results.push({
            sourceId: source.id,
            sourceName: source.name,
            sourceType: source.type,
            success: false,
            error: error.message,
          });
        }
      }

      const totalSynced = results.reduce((acc, r) => acc + (r.success && 'syncedCount' in r ? r.syncedCount : 0), 0);
      console.log(`Manual sync completed: ${totalSynced} total events synced across ${sources.length} sources`);

      return NextResponse.json({
        success: true,
        message: `Synced ${totalSynced} events across ${sources.length} calendar sources`,
        results,
      });
    }
  } catch (error: any) {
    console.error("Manual sync error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
