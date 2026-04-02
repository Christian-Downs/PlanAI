import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createChatStream } from "@/lib/openai";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    console.log("Chat API called");
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log("No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Session found:", session.user.email);
    const userId = (session.user as any).id;
    const body = await req.json();
    const { messages } = body;

    console.log("Received messages:", messages?.length);

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    // Check if OpenAI API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.error("No OpenAI API key found");
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    console.log("OpenAI API key exists");

    // Get user context
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    console.log("User found:", user?.email);

    // Get upcoming events
    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: { gte: new Date() },
      },
      orderBy: { startTime: "asc" },
      take: 10,
    });

    console.log("Found", upcomingEvents.length, "upcoming events");

    // Get pending tasks
    const pendingTasks = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ["TODO", "IN_PROGRESS"] },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    console.log("Found", pendingTasks.length, "pending tasks");

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

    console.log("Creating chat stream...");

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

    console.log("Chat stream created, returning response");
    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
