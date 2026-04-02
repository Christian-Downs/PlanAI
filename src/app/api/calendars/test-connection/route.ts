import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST /api/calendars/test-connection - Test connection before saving
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, icalUrl, username, password, baseUrl, apiToken } = body;

    if (!type) {
      return NextResponse.json(
        { error: "Type is required" },
        { status: 400 }
      );
    }

    switch (type) {
      case "BLACKBOARD":
      case "MOODLE":
        // These now use iCal feeds, so test as iCal
        return await testICalConnection(icalUrl || baseUrl);

      case "CANVAS":
        return NextResponse.json(
          { success: false, error: "Canvas integration coming soon - please use iCal export for now" },
          { status: 400 }
        );

      case "ICAL":
        return await testICalConnection(icalUrl);

      default:
        return NextResponse.json(
          { success: false, error: `Connection testing not implemented for ${type}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function testBlackboardConnection(baseUrl: string, username: string, password: string) {
  if (!baseUrl || !username || !password) {
    return NextResponse.json(
      { success: false, error: "Base URL, username, and password are required for Blackboard" },
      { status: 400 }
    );
  }

  try {
    // Test basic connectivity to the Blackboard instance
    const loginUrl = `${baseUrl.replace(/\/+$/, '')}/webapps/login/`;

    const response = await fetch(loginUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'PlanAI/1.0',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Could not connect to Blackboard at ${baseUrl}. Please check the URL.`,
      });
    }

    const html = await response.text();
    const isBlackboard = html.includes('Blackboard') ||
                        html.includes('blackboard') ||
                        html.includes('bb-') ||
                        html.includes('login-page');

    if (!isBlackboard) {
      return NextResponse.json({
        success: false,
        error: "This doesn't appear to be a Blackboard instance. Please check the URL.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Blackboard instance found! Note: Full credential validation requires completing the connection.",
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `Connection failed: ${error.message}. Please check the base URL.`,
    });
  }
}

async function testMoodleConnection(baseUrl: string, username: string, password: string) {
  if (!baseUrl || !username || !password) {
    return NextResponse.json(
      { success: false, error: "Base URL, username, and password are required for Moodle" },
      { status: 400 }
    );
  }

  try {
    const apiUrl = `${baseUrl.replace(/\/+$/, '')}/login/index.php`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'PlanAI/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Could not connect to Moodle at ${baseUrl}. Please check the URL.`,
      });
    }

    const html = await response.text();
    const isMoodle = html.includes('Moodle') ||
                    html.includes('moodle') ||
                    html.includes('mform');

    if (!isMoodle) {
      return NextResponse.json({
        success: false,
        error: "This doesn't appear to be a Moodle instance. Please check the URL.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Moodle instance found! Note: Full credential validation requires completing the connection.",
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `Connection failed: ${error.message}. Please check the base URL.`,
    });
  }
}

async function testCanvasConnection(baseUrl: string, apiToken: string) {
  if (!baseUrl || !apiToken) {
    return NextResponse.json(
      { success: false, error: "Base URL and API token are required for Canvas" },
      { status: 400 }
    );
  }

  try {
    const apiUrl = `${baseUrl.replace(/\/+$/, '')}/api/v1/users/self`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'User-Agent': 'PlanAI/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: "Invalid API token. Please check your Canvas API token.",
      });
    }

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Could not connect to Canvas at ${baseUrl}. Please check the URL and API token.`,
      });
    }

    const userData = await response.json();

    return NextResponse.json({
      success: true,
      message: `Connected to Canvas as ${userData.name || 'user'}!`,
      data: { userName: userData.name },
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `Connection failed: ${error.message}. Please check the base URL and API token.`,
    });
  }
}

async function testICalConnection(icalUrl: string) {
  if (!icalUrl) {
    return NextResponse.json(
      { success: false, error: "iCal URL is required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(icalUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'PlanAI/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Could not fetch iCal feed. Status: ${response.status}`,
      });
    }

    const icalData = await response.text();

    if (!icalData.includes('BEGIN:VCALENDAR')) {
      return NextResponse.json({
        success: false,
        error: "Invalid iCal format. Please check the URL.",
      });
    }

    // Count events in the feed
    const eventCount = (icalData.match(/BEGIN:VEVENT/g) || []).length;

    return NextResponse.json({
      success: true,
      message: `iCal feed is valid and contains ${eventCount} events.`,
      data: { eventCount },
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `Connection failed: ${error.message}. Please check the iCal URL.`,
    });
  }
}