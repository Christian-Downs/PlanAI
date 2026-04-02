import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { syncCalendarSource } from "@/lib/calendar-sync";

// GET /api/calendars - List user's connected calendars
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const sources = await prisma.calendarSource.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        type: true,
        color: true,
        enabled: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        lastSyncError: true,
        accountEmail: true,
        accountId: true,
        _count: { select: { events: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: sources });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/calendars - Connect a new calendar source
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();

    const { type, name, icalUrl, username, password, baseUrl, apiToken, color } = body;

    if (!type || !name) {
      return NextResponse.json(
        { error: "Type and name are required" },
        { status: 400 }
      );
    }

    // Check for duplicate iCal feeds
    if (type === "ICAL" && icalUrl) {
      const existingIcal = await prisma.calendarSource.findFirst({
        where: {
          userId,
          type: "ICAL",
          icalUrl: icalUrl,
        },
      });

      if (existingIcal) {
        return NextResponse.json(
          { success: false, error: "This iCal feed is already connected" },
          { status: 400 }
        );
      }
    }

    // Generate smart name for iCal feeds if no custom name provided
    let feedName = name;
    if (type === "ICAL" && icalUrl && (!name || name === "iCal / ICS Feed")) {
      try {
        const url = new URL(icalUrl);
        const domain = url.hostname.replace(/^www\./, '');

        // Create a readable name from domain
        const domainParts = domain.split('.');
        if (domainParts.length > 1) {
          const mainPart = domainParts[0];
          feedName = `${mainPart.charAt(0).toUpperCase() + mainPart.slice(1)} Calendar`;
        } else {
          feedName = `${domain} Calendar`;
        }
      } catch {
        // If URL parsing fails, use default name with timestamp
        feedName = `iCal Feed ${new Date().toLocaleDateString()}`;
      }
    }

    // Create the calendar source
    const source = await prisma.calendarSource.create({
      data: {
        userId,
        name: feedName,
        type,
        color: color || "#4285F4",
        icalUrl: icalUrl || null,
        username: username || null,
        password: password || null, // TODO: Encrypt
        baseUrl: baseUrl || null,
        apiToken: apiToken || null, // TODO: Encrypt
        // Add account identification for iCal feeds
        accountEmail: type === "ICAL" ? icalUrl : null,
        accountId: type === "ICAL" ? icalUrl : null,
      },
    });

    // Attempt initial sync
    try {
      const accessToken = (session.user as any).accessToken;
      await syncCalendarSource(source.id, accessToken);
    } catch (syncError: any) {
      console.error("Initial sync failed:", syncError.message);
      // Don't fail the connection just because initial sync failed
    }

    return NextResponse.json({ success: true, data: source });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/calendars?id=xxx - Disconnect a calendar
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const sourceId = req.nextUrl.searchParams.get("id");

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

    // Delete associated events and tasks first (cascade should handle this)
    await prisma.calendarSource.delete({
      where: { id: sourceId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
