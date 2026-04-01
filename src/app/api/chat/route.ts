import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createChatStream } from "@/lib/openai";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    // Get user context
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // Get upcoming events
    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: { gte: new Date() },
      },
      orderBy: { startTime: "asc" },
      take: 10,
    });

    // Get pending tasks
    const pendingTasks = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ["TODO", "IN_PROGRESS"] },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    const eventsStr = upcomingEvents
      .map(
        (e) =>
          `- ${e.title} (${format(e.startTime, "MMM d h:mm a")} - ${format(e.endTime, "h:mm a")})`
      )
      .join("\n");

    const tasksStr = pendingTasks
      .map(
        (t) =>
          `- ${t.title} (due ${format(t.dueDate, "MMM d")}, ~${t.estimatedMinutes}min, complexity: ${Math.round(t.complexityScore * 100)}%)`
      )
      .join("\n");

    // Save user message
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role === "user") {
      await prisma.chatMessage.create({
        data: {
          userId,
          role: "USER",
          content: lastUserMessage.content,
        },
      });
    }

    // Stream response
    const result = createChatStream({
      messages,
      userContext: {
        name: user?.name || "User",
        role: user?.role || "STUDENT",
        timezone: user?.timezone || "America/New_York",
        upcomingEvents: eventsStr || "No upcoming events",
        pendingTasks: tasksStr || "No pending tasks",
      },
    });

    // Save assistant response (non-streaming for DB)
    // The streaming happens via the response below

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
