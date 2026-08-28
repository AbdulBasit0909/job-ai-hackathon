import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { messages } = await req.json();

    // 1. Fetch all user data upfront
    const apps = await prisma.application.findMany({
      where: { userId: user.id },
      include: { job: true },
    });

    const totalApplied = apps.filter(a => a.status !== "Saved").length;
    const responses = apps.filter(a => a.status === "Interviewing" || a.status === "Offer").length;
    const responseRate = totalApplied > 0 ? Math.round((responses / totalApplied) * 100) : 0;

    const dashboardData = {
      totalSaved: apps.filter(a => a.status === "Saved").length,
      totalApplied: totalApplied,
      responseRate: `${responseRate}%`,
      upcomingDeadlines: apps.filter(a => a.followUpDate).map(a => `${a.job.title} at ${a.job.company} on ${new Date(a.followUpDate!).toLocaleDateString()}`),
      recentJobs: apps.slice(0, 5).map(a => `${a.job.title} at ${a.job.company} (Status: ${a.status})`),
    };

    // 2. Pass the data directly to the AI
    const result = await generateText({
   model: groq("openai/gpt-oss-20b"),
      messages,
      system: `You are JobHunt AI, an expert career assistant. Here is the user's current dashboard data: ${JSON.stringify(dashboardData)}. Use this data to answer their questions. Be concise and encouraging.`,
    });

    return NextResponse.json({ text: result.text });

  } catch (error) {
    console.error("Copilot API Error:", error);
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}