import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateUserSchedule, applyScheduleBlocks, analyzeUserTasks } from "@/lib/schedule-optimizer";

// GET /api/schedule - Generate a schedule suggestion
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const days = parseInt(req.nextUrl.searchParams.get("days") || "7");

    const schedule = await generateUserSchedule(userId, days);
    return NextResponse.json({ success: true, data: schedule });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/schedule - Apply schedule blocks
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { blocks } = body;

    if (!blocks || !Array.isArray(blocks)) {
      return NextResponse.json({ error: "Blocks required" }, { status: 400 });
    }

    const created = await applyScheduleBlocks(userId, blocks);
    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/schedule - Analyze task complexity
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const analyses = await analyzeUserTasks(userId);

    return NextResponse.json({ success: true, data: analyses });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
