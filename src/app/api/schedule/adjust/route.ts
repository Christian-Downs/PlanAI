import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { EventType } from "@prisma/client";
import { addMinutes, format, parse } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { type, data } = body;

    console.log("Schedule adjustment:", type, data);

    switch (type) {
      case "adjust_time":
        return await adjustBlockTime(userId, data);
      case "add_block":
        return await addScheduleBlock(userId, data);
      case "remove_block":
        return await removeScheduleBlock(userId, data);
      case "regenerate":
        return await regenerateSchedule(userId, data);
      default:
        return NextResponse.json({ error: "Unknown schedule action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Schedule adjustment error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function adjustBlockTime(userId: string, data: any) {
  const { blockTitle, newStartTime, newEndTime } = data;

  // Find the AI-generated calendar event by title
  const event = await prisma.calendarEvent.findFirst({
    where: {
      userId,
      title: { contains: blockTitle, mode: 'insensitive' },
      source: {
        name: "AI Schedule"
      }
    }
  });

  if (!event) {
    return NextResponse.json({ error: "Schedule block not found" }, { status: 404 });
  }

  // Parse new times (assume same date as original)
  const eventDate = format(event.startTime, "yyyy-MM-dd");
  const newStart = new Date(`${eventDate} ${newStartTime}`);
  const newEnd = new Date(`${eventDate} ${newEndTime}`);

  // Update the calendar event
  await prisma.calendarEvent.update({
    where: { id: event.id },
    data: {
      startTime: newStart,
      endTime: newEnd,
    }
  });

  return NextResponse.json({
    success: true,
    message: `Updated "${blockTitle}" to ${newStartTime}-${newEndTime}`
  });
}

async function addScheduleBlock(userId: string, data: any) {
  const { title, type, startTime, duration } = data;

  // Parse start time and calculate end time
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

  // Create calendar event
  const event = await prisma.calendarEvent.create({
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

  return NextResponse.json({
    success: true,
    message: `Added "${title}" from ${startTime} for ${duration} minutes`,
    event
  });
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

  if (!aiSource) {
    return NextResponse.json({
      success: false,
      message: "No AI schedule found",
    });
  }

  // Find and delete the AI-generated calendar event
  const deleted = await prisma.calendarEvent.deleteMany({
    where: {
      userId,
      sourceId: aiSource.id,
      title: { contains: blockTitle, mode: 'insensitive' }
    }
  });

  return NextResponse.json({
    success: true,
    message: `Removed "${blockTitle}" from your schedule`,
    deletedCount: deleted.count
  });
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
    // Clear existing AI-generated events
    await prisma.calendarEvent.deleteMany({
      where: {
        userId,
        sourceId: aiSource.id
      }
    });
  }

  return NextResponse.json({
    success: true,
    message: "Cleared existing schedule. Please generate a new one from the Calendar page."
  });
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