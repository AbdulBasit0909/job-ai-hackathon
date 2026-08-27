import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const { jobDescription, jobTitle, company } = await req.json();

    const { object } = await generateObject({
      // Use the exact model name that worked for you in the tailor route
     model: google("gemini-3.6-flash"),
      schema: z.object({
        questions: z.array(
          z.object({
            category: z.enum(["Behavioral", "Technical", "Company/Culture"]),
            question: z.string(),
            modelAnswer: z.string().describe("A brief outline or checklist of what a strong answer should cover (e.g., STAR method cues for behavioral)."),
          })
        ),
      }),
      prompt: `
        You are an expert hiring manager at ${company}.
        The candidate is applying for: ${jobTitle}.
        Here is the job description: ${jobDescription}

        Generate exactly 8 interview questions tailored to this specific role.
        Split them across 3 categories: Behavioral (3), Technical (3), and Company/Culture (2).
        For each question, provide a concise "modelAnswer" outline of what a top candidate would say.
      `,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("Questions API Error:", error);
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 });
  }
}