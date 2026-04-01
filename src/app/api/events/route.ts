import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/events - Get all events for the user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const searchParams = req.nextUrl.searchParams;
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const sourceId = searchParams.get("sourceId");

    const where: any = { userId };

    if (start) where.startTime = { gte: new Date(start) };
    if (end) {
      where.endTime = where.endTime || {};
      where.endTime.lte = new Date(end);
    }
    if (sourceId) where.sourceId = sourceId;

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        source: {
          select: {
            id: true,
            name: true,
            type: true,
            color: true,
          },
        },
        task: {
          select: {
            id: true,
            status: true,
            estimatedMinutes: true,
            complexityScore: true,
            progress: true,
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    // Transform to unified events
    const unifiedEvents = events.map((e) => ({
      id: e.id,
      sourceId: e.source.id,
      sourceName: e.source.name,
      sourceType: e.source.type,
      sourceColor: e.source.color,
      title: e.title,
      description: e.description,
      location: e.location,
      url: e.url,
      startTime: e.startTime,
      endTime: e.endTime,
      allDay: e.allDay,
      eventType: e.eventType,
      priority: e.priority,
      task: e.task
        ? {
            id: e.task.id,
            status: e.task.status,
            estimatedMinutes: e.task.estimatedMinutes,
            complexityScore: e.task.complexityScore,
            progress: e.task.progress,
          }
        : undefined,
    }));

    return NextResponse.json({ success: true, data: unifiedEvents });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
