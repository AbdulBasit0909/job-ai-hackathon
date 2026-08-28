import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { seedJobs } from "@/data/seedJobs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 1. Check database
    let job = await prisma.job.findUnique({
      where: { id },
    });

    // 2. If not found in DB, check seed jobs
    if (!job) {
      const seed = seedJobs.find((s) => s.id === id);
      if (seed) {
        return NextResponse.json({
          job: {
            id: seed.id,
            title: seed.title,
            company: seed.company,
            location: seed.location,
            remote: seed.isRemote,
            salaryMin: 100000,
            salaryMax: 160000,
            salaryRange: seed.salaryRange,
            description: seed.description,
            skills: seed.tags,
            source: seed.source,
            sourceUrl: seed.sourceUrl,
          },
        });
      }
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}