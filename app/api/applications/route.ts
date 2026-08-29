import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { seedJobs } from "@/data/seedJobs";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ applications: [] });
    }

    const applications = await prisma.application.findMany({
      where: { userId: user.id },
      include: {
        job: true,
        resumeVersion: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("GET /api/applications error:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Fetch real email from Clerk
    let email = "unknown@example.com";
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      email = clerkUser.emailAddresses[0]?.emailAddress || "user@example.com";
    } catch (err) {
      console.warn("Could not fetch user from Clerk:", err);
    }

    const { jobId, jobData, resumeVersionId, status } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    // 2. Upsert user with real email
    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: { email },
      create: { clerkId: userId, email },
    });

    // 3. Ensure Job exists in DB before creating Application
    let existingJob = await prisma.job.findUnique({ where: { id: jobId } });

    if (!existingJob) {
      const seedMatch = seedJobs.find((j: any) => j.id === jobId);
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
          description,
          skills,
          remote,
          salaryMin: jobData?.salaryMin || 100000,
          salaryMax: jobData?.salaryMax || 150000,
        },
      });
    }

    // 4. Determine Resume Version to link (use provided, or user's default version)
    let versionId = resumeVersionId || null;
    if (!versionId) {
      const defaultResume = await prisma.userResume.findFirst({
        where: { userId: user.id, isDefault: true },
      });
      if (defaultResume) {
        versionId = defaultResume.id;
      }
    }

    // 5. Check if application already exists
    const existingApp = await prisma.application.findFirst({
      where: { userId: user.id, jobId: jobId },
      include: { job: true, resumeVersion: true },
    });

    const appStatus = status || "Saved";
    const appliedDate = appStatus !== "Saved" ? new Date() : null;

    if (existingApp) {
      const updatedApp = await prisma.application.update({
        where: { id: existingApp.id },
        data: {
          status: status || existingApp.status,
          resumeVersionId: versionId || existingApp.resumeVersionId,
          appliedAt: appliedDate || existingApp.appliedAt,
        },
        include: { job: true, resumeVersion: true },
      });
      return NextResponse.json({ success: true, application: updatedApp, alreadySaved: true });
    }

    // 6. Create the application
    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobId: jobId,
        resumeVersionId: versionId,
        status: appStatus,
        appliedAt: appliedDate,
      },
      include: {
        job: true,
        resumeVersion: true,
      },
    });

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error("POST /api/applications error:", error);
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }
}