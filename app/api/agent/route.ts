import { NextResponse } from "next/server"
import { runText2SqlAgent } from "@/lib/graph"

export async function POST(request: Request) {
  let question = ""
  try {
    const body = await request.json()
    question = typeof body?.question === "string" ? body.question : ""
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    )
  }

  if (!question.trim()) {
    return NextResponse.json(
      { error: "Please provide a question." },
      { status: 400 }
    )
  }

  // Note: You can probably remove this simulated latency now. 
  // The real LLM agent will naturally take a few seconds to run!
  // await new Promise((resolve) => setTimeout(resolve, 900))

  try {
    // FIX: Await the response
    const response = await runText2SqlAgent(question)
    console.log("API Route response:", response)

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in API Route:", error)
    return NextResponse.json(
      { error: "An internal error occurred while processing your request." },
      { status: 500 }
    )
  }
}