import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Microsoft Graph webhook for Outlook Calendar
export async function POST(req: NextRequest) {
  try {
    // Handle validation request from Microsoft
    const validationToken = req.nextUrl.searchParams.get("validationToken");
    if (validationToken) {
      return new NextResponse(validationToken, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const body = await req.json();
    const notifications = body.value || [];

    for (const notification of notifications) {
      const subscriptionId = notification.subscriptionId;
      const changeType = notification.changeType;

      // Find the calendar source by webhook ID
      const source = await prisma.calendarSource.findFirst({
        where: { webhookId: subscriptionId },
      });

      if (!source) {
        console.error("Outlook webhook: source not found for", subscriptionId);
        continue;
      }

      // Mark source for re-sync
      await prisma.calendarSource.update({
        where: { id: source.id },
        data: { lastSyncStatus: "NEVER" }, // Will trigger re-sync
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Outlook webhook error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "Outlook webhook endpoint active" });
}
