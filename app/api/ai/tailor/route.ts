import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { groq } from "@ai-sdk/groq";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

function sanitizeAndBudget(text: string, maxChars: number = 7000): string {
  if (!text) return "";
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (cleaned.length <= maxChars) return cleaned;
  return cleaned.slice(0, maxChars) + "\n[Content truncated for token limit]";
}

const analysisSchema = z.object({
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
});

const candidateModels = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
];

export async function POST(req: Request) {
  try {
    const { resumeText, jobDescription, jobTitle, company } = await req.json();

    if (!resumeText || typeof resumeText !== "string" || !resumeText.trim()) {
      return NextResponse.json(
        { error: "Please provide valid resume text." },
        { status: 400 }
      );
    }

    const { userId } = await auth();

    const cleanResume = sanitizeAndBudget(resumeText, 7000);
    const cleanJobDesc = sanitizeAndBudget(jobDescription || "", 3500);
    const cleanTitle = (jobTitle || "the position").trim().slice(0, 100);
    const cleanCompany = (company || "the company").trim().slice(0, 100);

    const promptText = `
      You are an expert career coach and resume parser.
      The user is applying for the role of "${cleanTitle}" at "${cleanCompany}".
      
      Here is the Job Description:
      ${cleanJobDesc}

      Here is the User's Resume:
      ${cleanResume}

      Task 1: Write a highly tailored cover letter (250-400 words).
      Task 2: Identify 3-5 skill gaps.
      Task 3: Identify matched skills.
      Task 4: Extract the user's Name, Email, Years of Experience, and Top Skills.
      Task 5: For EVERY skill gap you found, recommend a specific, real course or certification to close that gap. Include the provider, estimated time, and level.
    `;

    let objectResult: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const { object } = await generateObject({
          model: groq(modelName),
          maxOutputTokens: 1500,
          schema: analysisSchema,
          prompt: promptText,
        });
        objectResult = object;
        console.log(`[AI Tailor] Successfully generated analysis using model ${modelName}`);
        break;
      } catch (err: any) {
        console.warn(`[AI Tailor] Model ${modelName} note: ${err?.message || err}. Trying next model...`);
        lastError = err;
      }
    }

    if (!objectResult) {
      throw lastError || new Error("All AI models reached rate limit. Please try again shortly.");
    }

    // Save the AI parsed data to the user's profile for the Recruiter Dashboard
    if (userId) {
      try {
        await prisma.user.update({
          where: { clerkId: userId },
          data: {
            name: objectResult.parsedData.name,
            role: jobTitle,
            skills: objectResult.parsedData.skills,
          },
        });
      } catch (err) {
        console.warn("Could not update user profile with parsed resume data:", err);
      }
    }

    return NextResponse.json(objectResult);
  } catch (error: any) {
    console.error("AI Tailor Error:", error);
    const message = error?.message || "Failed to generate AI analysis";
    return NextResponse.json(
      { error: `AI analysis failed: ${message}` },
      { status: 500 }
    );
  }
}