import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { EventType } from "@prisma/client";
import { createChatStream } from "@/lib/openai";
import { format, addMinutes } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    console.log("Enhanced Chat API called");
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

    // Get user context (same as regular chat)
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Get upcoming events including AI-generated ones
    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: { gte: new Date() },
      },
      include: {
        source: true, // Include source information
      },
      orderBy: { startTime: "asc" },
      take: 15,
    });

    const pendingTasks = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ["TODO", "IN_PROGRESS"] },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    // Include AI schedule blocks in context
    const aiScheduleBlocks = upcomingEvents
      .filter(e => e.source.name === "AI Schedule")
      .map(e => `- "${e.title}" (${format(e.startTime, "h:mm a")} - ${format(e.endTime, "h:mm a")})`)
      .join("\n");

    const eventsStr = upcomingEvents
      .map(e => `- ${e.title} (${format(e.startTime, "MMM d h:mm a")} - ${format(e.endTime, "h:mm a")})`)
      .join("\n");

    const tasksStr = pendingTasks
      .map(t => `- ${t.title} (due ${format(t.dueDate, "MMM d")}, ~${t.estimatedMinutes}min)`)
      .join("\n");

    const enhancedContext = {
      name: user?.name || "User",
      role: user?.role || "STUDENT",
      timezone: user?.timezone || "America/New_York",
      upcomingEvents: eventsStr || "No upcoming events",
      pendingTasks: tasksStr || "No pending tasks",
      aiScheduleBlocks: aiScheduleBlocks || "No AI-generated schedule blocks",
    };

    // Create enhanced system message for schedule-aware chat
    const enhancedMessages = [
      {
        role: "system" as const,
        content: `Current AI Schedule Blocks:
${aiScheduleBlocks || "No AI schedule blocks found"}

When users want to adjust these blocks, use SCHEDULE_ACTION commands.`
      },
      ...messages
    ];

    console.log("Creating enhanced chat stream with schedule context...");

    const result = createChatStream({
      messages: enhancedMessages,
      userContext: enhancedContext,
    });

    // Return streaming response with action processing capability
    return new Response(
      new ReadableStream({
        async start(controller) {
          const reader = result.toTextStreamResponse().body?.getReader();
          if (!reader) return;

          let fullResponse = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = new TextDecoder().decode(value);
              fullResponse += chunk;

              // Forward the chunk to the client
              controller.enqueue(value);
            }

            // Process any actions in the complete response
            await processScheduleActions(userId, fullResponse);

          } catch (error) {
            console.error("Enhanced chat error:", error);
          } finally {
            controller.close();
          }
        }
      }),
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      }
    );

  } catch (error: any) {
    console.error("Enhanced chat error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function processScheduleActions(userId: string, response: string) {
  // Look for SCHEDULE_ACTION commands in the response
  const scheduleActionRegex = /\[SCHEDULE_ACTION:\s*type="([^"]+)",\s*data=({[^}]+})\]/g;
  let match;

  while ((match = scheduleActionRegex.exec(response)) !== null) {
    const [, type, dataStr] = match;

    try {
      const data = JSON.parse(dataStr);
      console.log("Processing schedule action:", type, data);

      // Process actions directly
      switch (type) {
        case "adjust_time":
          await adjustBlockTime(userId, data);
          break;
        case "add_block":
          await addScheduleBlock(userId, data);
          break;
        case "remove_block":
          await removeScheduleBlock(userId, data);
          break;
        case "regenerate":
          await regenerateSchedule(userId, data);
          break;
      }

    } catch (error) {
      console.error("Error processing schedule action:", error);
    }
  }
}

// Schedule adjustment functions (copied from adjust/route.ts)
async function adjustBlockTime(userId: string, data: any) {
  const { blockTitle, newStartTime, newEndTime } = data;

  const event = await prisma.calendarEvent.findFirst({
    where: {
      userId,
      title: { contains: blockTitle, mode: 'insensitive' },
      source: {
        name: "AI Schedule"
      }
    }
  });

  if (event) {
    const eventDate = format(event.startTime, "yyyy-MM-dd");
    const newStart = new Date(`${eventDate} ${newStartTime}`);
    const newEnd = new Date(`${eventDate} ${newEndTime}`);

    await prisma.calendarEvent.update({
      where: { id: event.id },
      data: { startTime: newStart, endTime: newEnd }
    });

    console.log(`Updated "${blockTitle}" to ${newStartTime}-${newEndTime}`);
  }
}

async function addScheduleBlock(userId: string, data: any) {
  const { title, type, startTime, duration } = data;

  const today = format(new Date(), "yyyy-MM-dd");
  const start = new Date(`${today} ${startTime}`);
  const end = addMinutes(start, duration);

  // Ensure we have an AI Schedule source
  let aiSource = await prisma.calendarSource.findFirst({
    where: {
      userId: userId,
      name: "AI Schedule"
    }
  });

  if (!aiSource) {
    aiSource = await prisma.calendarSource.create({
      data: {
        userId: userId,
        name: "AI Schedule",
        type: "MANUAL", // Use MANUAL type for AI-generated content
        color: "#3b82f6",
        enabled: true,
      }
    });
  }

  await prisma.calendarEvent.create({
    data: {
      userId,
      sourceId: aiSource.id,
      title,
      description: "Added via AI chat",
      startTime: start,
      endTime: end,
      allDay: false,
      eventType: mapBlockTypeToEventType(type),
      priority: "MEDIUM",
      color: getBlockTypeColor(type),
    }
  });

  console.log(`Added "${title}" from ${startTime} for ${duration} minutes`);
}

async function removeScheduleBlock(userId: string, data: any) {
  const { blockTitle } = data;

  // Find the AI schedule source
  const aiSource = await prisma.calendarSource.findFirst({
    where: {
      userId,
      name: "AI Schedule"
    }
  });

  if (aiSource) {
    const deleted = await prisma.calendarEvent.deleteMany({
      where: {
        userId,
        sourceId: aiSource.id,
        title: { contains: blockTitle, mode: 'insensitive' }
      }
    });

    console.log(`Removed "${blockTitle}" from schedule (${deleted.count} events)`);
  }
}

async function regenerateSchedule(userId: string, data: any) {
  // Find the AI schedule source
  const aiSource = await prisma.calendarSource.findFirst({
    where: {
      userId,
      name: "AI Schedule"
    }
  });

  if (aiSource) {
    await prisma.calendarEvent.deleteMany({
      where: {
        userId,
        sourceId: aiSource.id
      }
    });
  }

  console.log("Cleared existing AI schedule");
}

// Helper functions
function getBlockTypeColor(type: string): string {
  const colors: Record<string, string> = {
    STUDY: "#3b82f6",
    HOMEWORK: "#8b5cf6",
    EXAM_PREP: "#ef4444",
    BREAK: "#22c55e",
    BUFFER: "#6b7280",
  };
  return colors[type] || "#6b7280";
}

function mapBlockTypeToEventType(type: string): EventType {
  const mapping: Record<string, EventType> = {
    STUDY: EventType.STUDY_SESSION,
    HOMEWORK: EventType.ASSIGNMENT,
    EXAM_PREP: EventType.EXAM,
    BREAK: EventType.BREAK,
    BUFFER: EventType.OTHER,
  };
  return mapping[type] || EventType.OTHER;
}