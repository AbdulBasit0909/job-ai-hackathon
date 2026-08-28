import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { seedJobs } from "@/data/seedJobs";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) return NextResponse.json({ applications: [] });

    const applications = await prisma.application.findMany({
      where: { userId: user.id },
      include: { job: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { jobId, jobData } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    // Check if user exists in DB, if not, create them
    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: { clerkId: userId, email: "user@example.com" },
    });

    // Ensure Job exists in DB before creating Application
    let existingJob = await prisma.job.findUnique({ where: { id: jobId } });

    if (!existingJob) {
      // Find from seed or fallback to jobData
      const seedMatch = seedJobs.find((s) => s.id === jobId);
      const title = jobData?.title || seedMatch?.title || "Software Engineer";
      const company = jobData?.company || seedMatch?.company || "Tech Company";
      const location = jobData?.location || seedMatch?.location || "Remote";
      const description =
        jobData?.description ||
        seedMatch?.description ||
        "Position saved from job search aggregation.";
      const skills = jobData?.skills || seedMatch?.tags || ["Engineering"];
      const remote = jobData?.remote ?? seedMatch?.isRemote ?? false;

      existingJob = await prisma.job.create({
        data: {
          id: jobId,
          title,
          company,
          location,
          remote,
          salaryMin: 90000,
          salaryMax: 150000,
          description,
          skills,
          postedDate: new Date(),
        },
      });
    }

    // Save or find existing application
    const existingApp = await prisma.application.findFirst({
      where: { userId: user.id, jobId: jobId },
    });

    if (existingApp) {
      return NextResponse.json({ success: true, application: existingApp, alreadySaved: true });
    }

    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobId: jobId,
        status: "Saved",
      },
    });

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error("Save Error:", error);
    return NextResponse.json({ error: "Failed to save application" }, { status: 500 });
  }
}