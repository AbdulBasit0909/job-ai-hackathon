import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("================================================================================");
  console.log("🌱 SEEDING REALISTIC A/B TESTING DATA (Resume A vs Resume B)");
  console.log("================================================================================");

  // 1. Locate or create active target user
  let user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    console.log("No user found in database. Creating default test user...");
    user = await prisma.user.create({
      data: {
        clerkId: "test_user_ab_testing",
        email: "alex.mercer.test@example.com",
      },
    });
  }

  console.log(`Targeting User: ${user.email} (ID: ${user.id}, ClerkID: ${user.clerkId})`);

  // 2. Read resume contents from data/resumes/
  const resumeAPath = path.join(process.cwd(), "data", "resumes", "resume-a-baseline.txt");
  const resumeBPath = path.join(process.cwd(), "data", "resumes", "resume-b-optimized.txt");
  const testDataPath = path.join(process.cwd(), "data", "test-applications.json");

  const resumeAContent = fs.readFileSync(resumeAPath, "utf8");
  const resumeBContent = fs.readFileSync(resumeBPath, "utf8");
  const testData = JSON.parse(fs.readFileSync(testDataPath, "utf8"));

  // 3. Upsert / Create Resume Version A
  let resumeA = await prisma.userResume.findFirst({
    where: { userId: user.id, name: { contains: "Resume Version A" } },
  });

  if (!resumeA) {
    resumeA = await prisma.userResume.create({
      data: {
        userId: user.id,
        name: "Resume Version A — Baseline (Control)",
        fileName: "resume-a-baseline.txt",
        content: resumeAContent,
        targetRole: "Frontend Developer",
        isDefault: true,
      },
    });
    console.log(`✅ Created Resume Version A (ID: ${resumeA.id})`);
  } else {
    console.log(`ℹ️  Found existing Resume Version A (ID: ${resumeA.id})`);
  }

  // 4. Upsert / Create Resume Version B
  let resumeB = await prisma.userResume.findFirst({
    where: { userId: user.id, name: { contains: "Resume Version B" } },
  });

  if (!resumeB) {
    resumeB = await prisma.userResume.create({
      data: {
        userId: user.id,
        name: "Resume Version B — AI Optimized (Variant)",
        fileName: "resume-b-optimized.txt",
        content: resumeBContent,
        targetRole: "Senior Frontend Engineer",
        isDefault: false,
      },
    });
    console.log(`✅ Created Resume Version B (ID: ${resumeB.id})`);
  } else {
    console.log(`ℹ️  Found existing Resume Version B (ID: ${resumeB.id})`);
  }

  // 5. Clean up previous test applications for these resumes to ensure fresh seed
  await prisma.application.deleteMany({
    where: {
      userId: user.id,
      resumeVersionId: { in: [resumeA.id, resumeB.id] },
    },
  });

  console.log("🧹 Cleared old test applications for Resume A & B.");

  // 6. Insert 50 applications for Resume A
  console.log("📥 Inserting 50 applications for Resume Version A...");
  for (const item of testData.versionA.applications) {
    let job = await prisma.job.findFirst({
      where: { company: item.job.company, title: item.job.title },
    });

    if (!job) {
      job = await prisma.job.create({
        data: {
          title: item.job.title,
          company: item.job.company,
          location: item.job.location,
          remote: item.job.remote,
          salaryMin: item.job.salaryMin,
          salaryMax: item.job.salaryMax,
          description: item.job.description,
          skills: item.job.skills,
          postedDate: new Date(item.appliedAt),
        },
      });
    }

    await prisma.application.create({
      data: {
        userId: user.id,
        jobId: job.id,
        resumeVersionId: resumeA.id,
        status: item.status,
        appliedAt: new Date(item.appliedAt),
        respondedAt: item.respondedAt ? new Date(item.respondedAt) : null,
        createdAt: new Date(item.createdAt),
      },
    });
  }

  // 7. Insert 50 applications for Resume B
  console.log("📥 Inserting 50 applications for Resume Version B...");
  for (const item of testData.versionB.applications) {
    let job = await prisma.job.findFirst({
      where: { company: item.job.company, title: item.job.title },
    });

    if (!job) {
      job = await prisma.job.create({
        data: {
          title: item.job.title,
          company: item.job.company,
          location: item.job.location,
          remote: item.job.remote,
          salaryMin: item.job.salaryMin,
          salaryMax: item.job.salaryMax,
          description: item.job.description,
          skills: item.job.skills,
          postedDate: new Date(item.appliedAt),
        },
      });
    }

    await prisma.application.create({
      data: {
        userId: user.id,
        jobId: job.id,
        resumeVersionId: resumeB.id,
        status: item.status,
        appliedAt: new Date(item.appliedAt),
        respondedAt: item.respondedAt ? new Date(item.respondedAt) : null,
        createdAt: new Date(item.createdAt),
      },
    });
  }

  console.log("================================================================================");
  console.log("🎉 SEEDING COMPLETE!");
  console.log("================================================================================");
  console.log("Resume Version A Stats:");
  console.log("  • Total Applications: 50");
  console.log("  • Responses: 8 (6 Interviews, 2 Offers) -> Response Rate: 16%");
  console.log("  • Rejections: 25 | Pending Applied: 17");
  console.log("  • Sample Confidence: High (Statistically significant sample)");
  console.log("--------------------------------------------------------------------------------");
  console.log("Resume Version B Stats:");
  console.log("  • Total Applications: 50");
  console.log("  • Responses: 20 (15 Interviews, 5 Offers) -> Response Rate: 40%");
  console.log("  • Rejections: 15 | Pending Applied: 15");
  console.log("  • Sample Confidence: High (Statistically significant sample)");
  console.log("================================================================================");
  console.log("👉 Open http://localhost:3000/dashboard/resumes to see the live A/B comparison!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });