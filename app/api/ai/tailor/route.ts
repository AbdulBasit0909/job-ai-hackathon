import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { groq } from "@ai-sdk/groq";

export async function POST(req: Request) {
  try {
    const { resumeText, jobDescription, jobTitle, company } = await req.json();

    // 1. Get the logged-in user
    const { auth } = await import("@clerk/nextjs/server");
    const { prisma } = await import("@/lib/db");
    const { userId } = await auth();
    
    if (userId) {
      const user = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (user) {
        // We will update this later with the AI parsed data, but for now, just ensure they exist
      }
    }

    const { object } = await generateObject({
      model: groq("openai/gpt-oss-20b"), // If this fails due to quota, change to "gemini-1.5-pro"
      schema: z.object({
        coverLetter: z.string().describe("A professional, tailored cover letter between 250 and 400 words."),
        skillGaps: z.array(z.string()).describe("A list of 3 to 5 specific skills missing from the resume."),
        matchedSkills: z.array(z.string()).describe("A list of skills the user already has."),
        parsedData: z.object({
          name: z.string().describe("The candidate's full name. If not found, guess 'John Doe'."),
          email: z.string().describe("The candidate's email. If not found, guess 'candidate@example.com'."),
          experienceYears: z.number().describe("Total years of professional experience."),
          skills: z.array(z.string()).describe("Top 4-5 skills of the candidate.")
        }),
        courseRecommendations: z.array(
          z.object({
            skill: z.string().describe("The missing skill"),
            course: z.string().describe("A specific, real course or certification name"),
            provider: z.string().describe("Platform (e.g., Coursera, Udemy, AWS)"),
            estimatedTime: z.string().describe("Estimated time to complete (e.g., '2 Weeks', '15 Hours')"),
            level: z.enum(["Beginner", "Intermediate", "Advanced"])
          })
        )
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
        Task 4: Extract the user's Name, Email, Years of Experience, and Top Skills.
        Task 5: For EVERY skill gap you found, recommend a specific, real course or certification to close that gap. Include the provider, estimated time, and level.
      `,
    });

    // Save the AI parsed data to the user's profile for the Recruiter Dashboard
    if (userId) {
      await prisma.user.update({
        where: { clerkId: userId },
        data: {
          name: object.parsedData.name,
          role: jobTitle, // Save the role they are tailoring for
          skills: object.parsedData.skills,
        },
      });
    }

    return NextResponse.json(object);
  } catch (error) {
    console.error("AI Tailor Error:", error);
    return NextResponse.json({ error: "Failed to generate AI analysis" }, { status: 500 });
  }
}