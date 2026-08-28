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

    if (!user) return NextResponse.json({ applications: [] });

    const applications = await prisma.application.findMany({
      where: { userId: user.id },
      include: { job: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ applications });
  } catch {
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Fetch real email from Clerk (Your code)
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress || "unknown@example.com";

    const { jobId, jobData } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    // 2. Upsert user with real email (Your code)
    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: { email },
      create: { clerkId: userId, email },
    });

    // 3. Ensure Job exists in DB before creating Application (Teammate's code)
    let existingJob = await prisma.job.findUnique({ where: { id: jobId } });

    if (!existingJob) {
      // Find from seed or fallback to jobData
      const seedMatch = seedJobs.find((s) => s.id === jobId);
      const title = jobData?.title || seedMatch?.title || "Software Engineer";
      const company = jobData?.company || seedMatch?.company || "Tech Company";
      const location = jobData?.location || seedMatch?.location || "Remote";
      const description = jobData?.description || seedMatch?.description || "Position saved from job search aggregation.";
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

    // 4. Check if application already exists (Teammate's code)
    const existingApp = await prisma.application.findFirst({
      where: { userId: user.id, jobId: jobId },
    });

    if (existingApp) {
      return NextResponse.json({ success: true, application: existingApp, alreadySaved: true });
    }

    // 5. Create the application
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