import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const { question, userAnswer, jobTitle } = await req.json();

    const { object } = await generateObject({
     model: google("gemini-3.6-flash"),
      schema: z.object({
        score: z.number().min(0).max(100).describe("A score from 0 to 100 representing the quality of the answer."),
        feedback: z.string().describe("Constructive feedback on clarity, structure (STAR method), and relevance to the question. 2-3 sentences."),
      }),
      prompt: `
        You are an AI interview coach. The user is practicing for a ${jobTitle} role.
        Interview Question: "${question}"
        User's Answer: "${userAnswer}"

        Grade the user's answer on a scale of 0-100. Provide constructive, actionable feedback on how they can improve their answer. Focus on clarity, structure, and relevance.
      `,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("Grading API Error:", error);
    return NextResponse.json({ error: "Failed to grade answer" }, { status: 500 });
  }
}