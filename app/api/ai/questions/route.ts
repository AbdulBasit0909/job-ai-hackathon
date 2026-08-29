import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { groq } from "@ai-sdk/groq";

const candidateModels = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
];

const questionSchema = z.object({
  questions: z.array(
    z.object({
      id: z.number(),
      question: z.string(),
      context: z.string(),
      tips: z.string(),
    })
  ),
});

export async function POST(req: Request) {
  try {
    const { jobTitle, company, skills } = await req.json();

    const prompt = `
      Generate 5 realistic and role-specific interview preparation questions for:
      Role: ${jobTitle || "Software Engineer"}
      Company: ${company || "Tech Company"}
      Key Skills: ${Array.isArray(skills) ? skills.join(", ") : "General Engineering"}

      Provide practical context for why this question is asked, and a helpful tip for the candidate.
    `;

    let objectResult: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const { object } = await generateObject({
          model: groq(modelName),
          schema: questionSchema,
          prompt,
        });
        objectResult = object;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!objectResult) {
      throw lastError || new Error("Failed to generate questions");
    }

    return NextResponse.json(objectResult);
  } catch (error: any) {
    console.error("AI Questions Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate interview questions" },
      { status: 500 }
    );
  }
}