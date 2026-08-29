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

    const [applications, resumes] = await Promise.all([
      prisma.application.findMany({
        where: { userId: user.id },
        include: { job: true, resumeVersion: true },
      }),
      prisma.userResume.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    // 1. Total Applications (Applied, Interviewing, Offer, Rejected - not just Saved)
    const totalApplied = applications.filter(app => app.status !== "Saved").length;

    // 2. Response Rate (Moved to Interviewing or Offer / Total Applied)
    const responses = applications.filter(app => app.status === "Interviewing" || app.status === "Offer").length;
    const responseRate = totalApplied > 0 ? Math.round((responses / totalApplied) * 100) : 0;

    // 3. Average Time to Response
    const interviewingApps = applications.filter(app => app.status === "Interviewing" || app.status === "Offer");
    let avgTimeToResponse = "N/A";
    if (interviewingApps.length > 0) {
      const totalDays = interviewingApps.reduce((sum, app) => {
        const start = app.appliedAt || app.createdAt;
        const end = app.respondedAt || new Date();
        const diff = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        return sum + diff;
      }, 0);
      avgTimeToResponse = `${Math.round(totalDays / interviewingApps.length)} days`;
    }

    // 4. Salary Benchmark (Average max salary of jobs user has saved/applied to)
    const salaryBenchmark = applications.length > 0
      ? Math.round(applications.reduce((sum, app) => sum + app.job.salaryMax, 0) / applications.length)
      : 0;

    // 5. Resume Version Performance Breakdown
    const resumeBreakdown = resumes.map(r => {
      const rApps = applications.filter(a => a.resumeVersionId === r.id);
      const rApplied = rApps.filter(a => a.status !== "Saved").length;
      const rResponses = rApps.filter(a => a.status === "Interviewing" || a.status === "Offer").length;
      const rRate = rApplied > 0 ? Math.round((rResponses / rApplied) * 100) : 0;
      return {
        id: r.id,
        name: r.name,
        targetRole: r.targetRole,
        isDefault: r.isDefault,
        totalApplied: rApplied,
        totalResponses: rResponses,
        responseRate: rRate,
        interviews: rApps.filter(a => a.status === "Interviewing").length,
        offers: rApps.filter(a => a.status === "Offer").length,
      };
    });

    const bestResume = resumeBreakdown
      .filter(r => r.totalApplied >= 1)
      .sort((a, b) => b.responseRate - a.responseRate)[0] || null;

    return NextResponse.json({
      metrics: {
        totalSaved: applications.filter(app => app.status === "Saved").length,
        totalApplied,
        responseRate,
        avgTimeToResponse,
        salaryBenchmark,
        totalApps: applications.length,
        totalResumes: resumes.length,
        resumeBreakdown,
        bestResume,
      }
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}