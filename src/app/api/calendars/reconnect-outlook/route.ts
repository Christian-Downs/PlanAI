import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CalendarType, SyncStatus } from "@prisma/client";

// POST /api/calendars/reconnect-outlook - Reconnect Outlook Calendar for already-authenticated users
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

    // Check if Outlook Calendar source already exists for this specific account
    const existingSource = await prisma.calendarSource.findFirst({
      where: {
        userId,
        type: CalendarType.OUTLOOK,
        accountEmail: userEmail,
      },
    });

    if (existingSource) {
      // Update existing source with new access token
      await prisma.calendarSource.update({
        where: { id: existingSource.id },
        data: {
          apiToken: accessToken,
          enabled: true,
        },
      });

      // Note: Outlook sync not implemented yet, so we'll just mark it as connected
      console.log("Outlook Calendar reconnected (sync not implemented yet)");

      return NextResponse.json({
        success: true,
        message: "Outlook Calendar reconnected (sync will be implemented soon)",
        data: existingSource,
      });
    }

    // Create new Outlook Calendar source
    const calendarSource = await prisma.calendarSource.create({
      data: {
        userId,
        name: userEmail ? `Outlook Calendar (${userEmail})` : "Outlook Calendar",
        type: CalendarType.OUTLOOK,
        color: "#0078D4",
        enabled: true,
        lastSyncStatus: SyncStatus.NEVER,
        syncIntervalMin: 30,
        apiToken: accessToken,
        accountEmail: userEmail,
        accountId: userId, // Using userId as fallback account ID
      },
    });

    console.log("Outlook Calendar connected (sync not implemented yet)");

    return NextResponse.json({
      success: true,
      message: "Outlook Calendar connected (sync will be implemented soon)",
      data: calendarSource,
    });
  } catch (error: any) {
    console.error("Error reconnecting Outlook Calendar:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}