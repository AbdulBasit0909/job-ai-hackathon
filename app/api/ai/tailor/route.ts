import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { groq } from "@ai-sdk/groq";

export async function POST(req: Request) {
  try {
    const { resumeText, jobDescription, jobTitle, company } = await req.json();

    const { object } = await generateObject({
      model: groq("openai/gpt-oss-20b"),
      schema: z.object({
        coverLetter: z.string().describe("A professional, tailored cover letter between 250 and 400 words."),
        skillGaps: z.array(z.string()).describe("A list of 3 to 5 specific skills or keywords missing from the resume but required in the job description."),
        matchedSkills: z.array(z.string()).describe("A list of skills the user already has that match the job description."),
        parsedData: z.object({
          name: z.string().describe("The candidate's full name extracted from the resume. If not found, guess 'John Doe'."),
          email: z.string().describe("The candidate's email extracted from the resume. If not found, guess 'candidate@example.com'."),
          experienceYears: z.number().describe("Total years of professional experience extracted from the resume."),
          skills: z.array(z.string()).describe("Top 4-5 skills of the candidate extracted from the resume.")
        })
      }),
      prompt: `
        You are an expert career coach and resume parser.
        The user is applying for the role of "${jobTitle}" at "${company}".
        
        Here is the Job Description:
        ${jobDescription}

        Here is the User's Resume:
        ${resumeText}

        Task 1: Write a highly tailored cover letter (250-400 words).
        Task 2: Identify 3-5 skill gaps.
        Task 3: Identify matched skills.
        Task 4: Extract the user's Name, Email, Years of Experience, and Top Skills to auto-populate an application form.
      `,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("AI Tailor Error:", error);
    return NextResponse.json({ error: "Failed to generate AI analysis" }, { status: 500 });
  }
}