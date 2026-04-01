import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { syncGoogleCalendar } from "@/lib/calendar-sync";

// Google Calendar Push Notification Webhook
export async function POST(req: NextRequest) {
  try {
    // Verify the webhook token
    const token = req.headers.get("x-goog-channel-token");
    if (token !== process.env.GOOGLE_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const channelId = req.headers.get("x-goog-channel-id");
    const resourceState = req.headers.get("x-goog-resource-state");

    // Ignore sync messages (initial verification)
    if (resourceState === "sync") {
      return NextResponse.json({ success: true });
    }

    if (!channelId) {
      return NextResponse.json({ error: "Missing channel ID" }, { status: 400 });
    }

    // Find the calendar source by webhook channel ID
    const source = await prisma.calendarSource.findFirst({
      where: { webhookChannelId: channelId },
      include: {
        user: {
          include: {
            accounts: {
              where: { provider: "google" },
            },
          },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Get access token from the user's Google account
    const googleAccount = source.user.accounts[0];
    if (!googleAccount?.access_token) {
      console.error("No Google access token for webhook sync");
      return NextResponse.json({ error: "No access token" }, { status: 500 });
    }

    // Trigger a sync
    await syncGoogleCalendar(source.id, googleAccount.access_token);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Google webhook error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Verification endpoint
export async function GET() {
  return NextResponse.json({ status: "Google webhook endpoint active" });
}
