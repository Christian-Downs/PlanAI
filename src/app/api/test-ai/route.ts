import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const model = openai("gpt-4o-mini");

// Simple test endpoint for OpenAI
export async function GET(req: NextRequest) {
  try {
    console.log("Testing OpenAI API connection...");

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "OPENAI_API_KEY not found in environment"
      });
    }

    console.log("OpenAI API key exists, length:", process.env.OPENAI_API_KEY.length);

    const result = await generateText({
      model,
      prompt: "Say hello world",
    });

    console.log("OpenAI response:", result.text);

    return NextResponse.json({
      success: true,
      response: result.text,
      message: "OpenAI API is working correctly"
    });
  } catch (error: any) {
    console.error("OpenAI test error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.toString()
    });
  }
}