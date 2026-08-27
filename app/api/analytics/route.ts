import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) return NextResponse.json({ metrics: null });

    const applications = await prisma.application.findMany({
      where: { userId: user.id },
      include: { job: true },
    });

    // 1. Total Applications (Applied, Interviewing, Offer, Rejected - not just Saved)
    const totalApplied = applications.filter(app => app.status !== "Saved").length;

    // 2. Response Rate (Moved to Interviewing or Offer / Total Applied)
    const responses = applications.filter(app => app.status === "Interviewing" || app.status === "Offer").length;
    const responseRate = totalApplied > 0 ? Math.round((responses / totalApplied) * 100) : 0;

    // 3. Average Time to Response (Mocking this since we don't have actual response dates yet, but calculating days since applied)
    // For a hackathon, we'll just calculate the average days between createdAt and now for interviewing stages
    const interviewingApps = applications.filter(app => app.status === "Interviewing");
    let avgTimeToResponse = "N/A";
    if (interviewingApps.length > 0) {
      const totalDays = interviewingApps.reduce((sum, app) => {
        const diff = new Date().getTime() - app.createdAt.getTime();
        return sum + Math.floor(diff / (1000 * 60 * 60 * 24));
      }, 0);
      avgTimeToResponse = `${Math.round(totalDays / interviewingApps.length)} days`;
    }

    // 4. Salary Benchmark (Average max salary of jobs user has saved/applied to)
    const salaryBenchmark = applications.length > 0
      ? Math.round(applications.reduce((sum, app) => sum + app.job.salaryMax, 0) / applications.length)
      : 0;

    return NextResponse.json({
      metrics: {
        totalSaved: applications.filter(app => app.status === "Saved").length,
        totalApplied,
        responseRate,
        avgTimeToResponse,
        salaryBenchmark,
        totalApps: applications.length,
      }
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}