import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateAndExecuteScrape } from "@/lib/scraper";
import prisma from "@/lib/prisma";

// POST /api/scrape - LLM-guided scraping
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

    const source = await prisma.calendarSource.findFirst({
      where: { id: sourceId, userId },
    });

    if (!source || !source.baseUrl) {
      return NextResponse.json(
        { error: "Source not found or missing base URL" },
        { status: 400 }
      );
    }

    // Execute LLM-guided scraping
    const events = await generateAndExecuteScrape({
      platform: source.type,
      baseUrl: source.baseUrl,
      credentials: source.username && source.password
        ? { username: source.username, password: source.password }
        : undefined,
    });

    // Save scraped events
    let importedCount = 0;
    for (const event of events) {
      if (!event.title) continue;

      await prisma.calendarEvent.create({
        data: {
          userId,
          sourceId: source.id,
          externalId: `scrape-${Date.now()}-${importedCount}`,
          title: event.title,
          description: event.description || null,
          startTime: event.startTime ? new Date(event.startTime) : new Date(),
          endTime: event.endTime ? new Date(event.endTime) : new Date(),
          eventType: (event.eventType as any) || "ASSIGNMENT",
          priority: "MEDIUM",
          color: source.color,
        },
      });
      importedCount++;
    }

    // Update sync status
    await prisma.calendarSource.update({
      where: { id: source.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: importedCount > 0 ? "SUCCESS" : "PARTIAL",
      },
    });

    return NextResponse.json({
      success: true,
      data: { importedCount, totalFound: events.length },
    });
  } catch (error: any) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
