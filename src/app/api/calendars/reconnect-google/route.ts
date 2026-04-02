import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CalendarType, SyncStatus } from "@prisma/client";
import { syncGoogleCalendar, setupGoogleWebhook } from "@/lib/calendar-sync";

// POST /api/calendars/reconnect-google - Reconnect Google Calendar for already-authenticated users
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const accessToken = (session.user as any).accessToken;
    const userEmail = session.user?.email;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "No access token available. Please sign out and sign in again." },
        { status: 400 }
      );
    }

    // Check if Google Calendar source already exists for this specific account
    const existingSource = await prisma.calendarSource.findFirst({
      where: {
        userId,
        type: CalendarType.GOOGLE,
        accountEmail: userEmail,
      },
    });

    if (existingSource) {
      // Update existing source with new access token and trigger sync
      await prisma.calendarSource.update({
        where: { id: existingSource.id },
        data: {
          apiToken: accessToken,
          enabled: true,
        },
      });

      // Trigger sync in background
      syncGoogleCalendar(existingSource.id, accessToken).catch(console.error);

      return NextResponse.json({
        success: true,
        message: "Google Calendar reconnected and syncing",
        data: existingSource,
      });
    }

    // Create new Google Calendar source
    const calendarSource = await prisma.calendarSource.create({
      data: {
        userId,
        name: userEmail ? `Google Calendar (${userEmail})` : "Google Calendar",
        type: CalendarType.GOOGLE,
        color: "#4285F4",
        enabled: true,
        lastSyncStatus: SyncStatus.NEVER,
        syncIntervalMin: 30,
        apiToken: accessToken,
        accountEmail: userEmail,
        accountId: userId, // Using userId as fallback account ID
      },
    });

    // Trigger initial sync and webhook setup in background
    syncGoogleCalendar(calendarSource.id, accessToken).catch(console.error);
    setupGoogleWebhook(calendarSource.id, accessToken).catch(console.error);

    return NextResponse.json({
      success: true,
      message: "Google Calendar connected and syncing",
      data: calendarSource,
    });
  } catch (error: any) {
    console.error("Error reconnecting Google Calendar:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
