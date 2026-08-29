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

    if (!user) {
      return NextResponse.json({
        metrics: [],
        bestVersion: null,
        overTime: [],
        totalApplications: 0,
      });
    }

    // Fetch all user resumes and applications
    const [resumes, applications] = await Promise.all([
      prisma.userResume.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      }),
      prisma.application.findMany({
        where: { userId: user.id },
        include: { job: true, resumeVersion: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Calculate metrics per resume version
    const metrics = resumes.map((resume) => {
      const resumeApps = applications.filter((app) => app.resumeVersionId === resume.id);
      const totalSaved = resumeApps.filter((a) => a.status === "Saved").length;
      
      // Total applied = any status past Saved (Applied, Interviewing, Offer, Rejected)
      const appliedApps = resumeApps.filter((a) => a.status !== "Saved");
      const totalApplied = appliedApps.length;

      // Responses = Interviewing or Offer
      const interviewing = resumeApps.filter((a) => a.status === "Interviewing").length;
      const offers = resumeApps.filter((a) => a.status === "Offer").length;
      const rejections = resumeApps.filter((a) => a.status === "Rejected").length;
      const totalResponses = interviewing + offers;

      const responseRate = totalApplied > 0 ? Math.round((totalResponses / totalApplied) * 100) : 0;
      const interviewRate = totalApplied > 0 ? Math.round((interviewing / totalApplied) * 100) : 0;
      const offerRate = totalApplied > 0 ? Math.round((offers / totalApplied) * 100) : 0;

      // Calculate avg response time in days for interviewing / offers
      const respondedApps = resumeApps.filter((a) => a.status === "Interviewing" || a.status === "Offer");
      let avgDaysToResponse: number | null = null;
      if (respondedApps.length > 0) {
        const totalDays = respondedApps.reduce((sum, app) => {
          const start = app.appliedAt || app.createdAt;
          const end = app.respondedAt || new Date();
          const diff = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
          return sum + diff;
        }, 0);
        avgDaysToResponse = Math.round(totalDays / respondedApps.length);
      }

      // Statistical confidence calculation
      let sampleStatus = "No data yet";
      let confidence = "None";
      if (totalApplied === 0) {
        sampleStatus = "No applications yet";
        confidence = "None";
      } else if (totalApplied < 5) {
        sampleStatus = "Limited sample (Needs 5+ apps)";
        confidence = "Low";
      } else if (totalApplied < 15) {
        sampleStatus = "Moderate sample";
        confidence = "Moderate";
      } else {
        sampleStatus = "Statistically significant sample";
        confidence = "High";
      }

      return {
        id: resume.id,
        name: resume.name,
        targetRole: resume.targetRole || "General",
        fileName: resume.fileName,
        isDefault: resume.isDefault,
        createdAt: resume.createdAt,
        totalTracked: resumeApps.length,
        totalSaved,
        totalApplied,
        totalResponses,
        responseRate,
        interviews: interviewing,
        interviewRate,
        offers,
        offerRate,
        rejections,
        avgDaysToResponse,
        sampleStatus,
        confidence,
      };
    });

    // Unassigned applications bucket (if any exist)
    const unassignedApps = applications.filter((app) => !app.resumeVersionId);
    if (unassignedApps.length > 0) {
      const applied = unassignedApps.filter((a) => a.status !== "Saved");
      const interviewing = unassignedApps.filter((a) => a.status === "Interviewing").length;
      const offers = unassignedApps.filter((a) => a.status === "Offer").length;
      const responses = interviewing + offers;
      const rate = applied.length > 0 ? Math.round((responses / applied.length) * 100) : 0;

      metrics.push({
        id: "unassigned",
        name: "Unassigned / Direct Uploads",
        targetRole: "Unspecified",
        fileName: "various",
        isDefault: false,
        createdAt: new Date(),
        totalTracked: unassignedApps.length,
        totalSaved: unassignedApps.filter((a) => a.status === "Saved").length,
        totalApplied: applied.length,
        totalResponses: responses,
        responseRate: rate,
        interviews: interviewing,
        interviewRate: applied.length > 0 ? Math.round((interviewing / applied.length) * 100) : 0,
        offers,
        offerRate: applied.length > 0 ? Math.round((offers / applied.length) * 100) : 0,
        rejections: unassignedApps.filter((a) => a.status === "Rejected").length,
        avgDaysToResponse: null,
        sampleStatus: applied.length < 5 ? "Limited sample" : "Moderate sample",
        confidence: applied.length < 5 ? "Low" : "Moderate",
      });
    }

    // Determine the best performing resume
    const candidates = metrics.filter((m) => m.id !== "unassigned" && m.totalApplied >= 1);
    let bestVersion = null;
    if (candidates.length > 0) {
      // Sort by response rate desc, then total responses desc, then offers desc
      const sorted = [...candidates].sort((a, b) => {
        if (b.responseRate !== a.responseRate) return b.responseRate - a.responseRate;
        if (b.totalResponses !== a.totalResponses) return b.totalResponses - a.totalResponses;
        return b.offers - a.offers;
      });
      bestVersion = sorted[0];
    }

    // Performance Over Time Chart Data (Bucket by weeks)
    // Create 4-week window timeline
    const now = new Date();
    const weeksCount = 4;
    const overTime = [];

    for (let i = weeksCount - 1; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const label = `Week ${weeksCount - i}`;

      const point: Record<string, any> = {
        name: label,
        date: weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };

      // For each resume version, calculate response rate up to this week
      resumes.forEach((r) => {
        const appsUpToWeek = applications.filter(
          (a) => a.resumeVersionId === r.id && new Date(a.createdAt) <= weekEnd
        );
        const applied = appsUpToWeek.filter((a) => a.status !== "Saved").length;
        const responses = appsUpToWeek.filter((a) => a.status === "Interviewing" || a.status === "Offer").length;
        const rate = applied > 0 ? Math.round((responses / applied) * 100) : 0;
        
        point[r.name] = rate;
        point[`${r.name}_applied`] = applied;
        point[`${r.name}_responses`] = responses;
      });

      overTime.push(point);
    }

    return NextResponse.json({
      metrics,
      bestVersion,
      overTime,
      totalApplications: applications.length,
    });
  } catch (error) {
    console.error("A/B Testing Analytics Error:", error);
    return NextResponse.json({ error: "Failed to fetch A/B testing analytics" }, { status: 500 });
  }
}