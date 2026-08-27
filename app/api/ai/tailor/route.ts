import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const { resumeText, jobDescription, jobTitle, company } = await req.json();

    const { object } = await generateObject({
        model: google("gemini-3.6-flash"),
      schema: z.object({
        coverLetter: z.string().describe("A professional, tailored cover letter between 250 and 400 words."),
        skillGaps: z.array(z.string()).describe("A list of 3 to 5 specific skills or keywords missing from the resume but required in the job description."),
        matchedSkills: z.array(z.string()).describe("A list of skills the user already has that match the job description."),
      }),
      prompt: `
        You are an expert career coach and resume writer.
        The user is applying for the role of "${jobTitle}" at "${company}".
        
        Here is the Job Description:
        ${jobDescription}

        Here is the User's Resume:
        ${resumeText}

        Task 1: Write a highly tailored cover letter (250-400 words) that references specific details from the job description and the user's resume. Do not use generic placeholders like [Your Name].
        Task 2: Identify 3-5 skill gaps (skills required in the JD but missing from the resume).
        Task 3: Identify the matched skills (skills the user has that the JD asks for).
      `,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("AI Tailor Error:", error);
    return NextResponse.json({ error: "Failed to generate AI analysis" }, { status: 500 });
  }
}