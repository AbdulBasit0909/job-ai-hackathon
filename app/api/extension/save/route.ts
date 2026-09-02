import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { generateObject } from "ai";
import { z } from "zod";
import { groq } from "@ai-sdk/groq";

function setCorsHeaders(response: NextResponse, req: Request) {
  const origin = req.headers.get("origin") || "*";
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
  return response;
}

export async function OPTIONS(req: Request) {
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response, req);
}

export async function POST(req: Request) {
  try {
    // 1. Receive text and sourceUrl from extension
    const { text, sourceUrl } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      const res = NextResponse.json({ error: "Highlighted text is required" }, { status: 400 });
      return setCorsHeaders(res, req);
    }

    const { userId } = await auth();

      const targetUserId = userId;
    let user = null;

    if (targetUserId) {
      user = await prisma.user.findUnique({ where: { clerkId: targetUserId } });
    }

    if (!user) {
      user = await prisma.user.findFirst();
    }

    if (!user) {
      const res = NextResponse.json({ error: "Please log in to JobHunt AI first." }, { status: 401 });
      return setCorsHeaders(res, req);
    }

    // 2. Use AI to extract Job Details
    let extractedObject = {
      title: "Saved Position",
      company: "Saved Company",
      location: "Remote",
    };

    const cleanText = text.slice(0, 3000);

    const candidateModels = [
      "openai/gpt-oss-120b",
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-20b",
    ];

    for (const modelName of candidateModels) {
      try {
        const { object } = await generateObject({
          model: groq(modelName),
          maxOutputTokens: 500,
          schema: z.object({
            title: z.string().describe("The job title, e.g., Senior Frontend Engineer. If not found, use 'Unknown Role'"),
            company: z.string().describe("The company name. If not found, use 'Unknown Company'"),
            location: z.string().describe("The job location. If not found, use 'Unknown Location'"),
          }),
          prompt: `Analyze this text highlighted from a job posting webpage and extract the job title, company name, and location.\n\nText:\n${cleanText}`,
        });
        extractedObject = object;
        break;
      } catch (aiErr) {
        console.warn(`[Extension Save AI] Model ${modelName} note:`, aiErr);
      }
    }

    // 3. Create the new Job with extracted AI data AND the original URL
    const newJob = await prisma.job.create({
      data: {
        title: extractedObject.title || "Saved Role",
        company: extractedObject.company || "Company",
        location: extractedObject.location || "Remote",
        remote: (extractedObject.location || "").toLowerCase().includes("remote"),
        salaryMin: 90000,
        salaryMax: 150000,
        description: text,
        skills: ["Saved from Extension"],
        source: "extension",
        sourceUrl: sourceUrl || null, // SAVE THE URL HERE!
      },
    });

    // 4. Save it to user's applications tracker
    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobId: newJob.id,
        status: "Saved",
      },
    });

    const response = NextResponse.json({ 
      success: true, 
      message: "Job saved to tracker!",
      job: newJob,
      application
    });
    return setCorsHeaders(response, req);
  } catch (error: unknown) {
    console.error("Extension Save Error:", error);
    const message = error instanceof Error ? error.message : "Failed to save job";
    const res = NextResponse.json({ error: message }, { status: 500 });
    return setCorsHeaders(res, req);
  }
}