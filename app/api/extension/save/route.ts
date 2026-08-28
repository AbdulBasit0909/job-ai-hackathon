import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { groq } from "@ai-sdk/groq";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Please log in to JobHunt AI first." }, { status: 401 });
    }

    let user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: { clerkId: userId, email: "user@example.com" }
      });
    }

    // 1. Use AI to extract Job Details from the highlighted text
    const { object } = await generateObject({
      // Using flash here, if it fails due to quota, change to "gemini-1.5-pro"
     model: groq("openai/gpt-oss-20b"),
      schema: z.object({
        title: z.string().describe("The job title, e.g., Senior Frontend Engineer. If not found, use 'Unknown Role'"),
        company: z.string().describe("The company name. If not found, use 'Unknown Company'"),
        location: z.string().describe("The job location. If not found, use 'Unknown Location'"),
      }),
      prompt: `Analyze this text highlighted from a webpage and extract the job title, company name, and location. Text: ${text}`
    });

    // 2. Create the new Job with the extracted AI data
    const newJob = await prisma.job.create({
      data: {
        title: object.title,
        company: object.company,
        location: object.location,
        remote: object.location.toLowerCase().includes("remote"),
        salaryMin: 0,
        salaryMax: 0,
        description: text,
        skills: ["To be parsed"],
      }
    });

    // 3. Save it to YOUR applications list
    await prisma.application.create({
      data: {
        userId: user.id,
        jobId: newJob.id,
        status: "Saved",
      }
    });

    const response = NextResponse.json({ success: true, message: "Job saved to tracker!" });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  } catch (error) {
    console.error("Extension Save Error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}