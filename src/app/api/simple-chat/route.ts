import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const model = openai("gpt-4o");

// Simple non-streaming chat for testing
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    console.log("Simple chat - generating text...");

    const result = await generateText({
      model,
      system: "You are PlanAI, a helpful scheduling assistant. Keep responses brief and friendly.",
      messages,
    });

    console.log("Generated response:", result.text);

    return NextResponse.json({
      content: result.text,
      success: true
    });
  } catch (error: any) {
    console.error("Simple chat error:", error);
    return NextResponse.json({
      error: error.message,
      content: "I encountered an error processing your request."
    }, { status: 500 });
  }
}