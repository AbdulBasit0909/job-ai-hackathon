import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ resumes: [] });
    }

    const resumes = await prisma.userResume.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { applications: true },
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ resumes });
  } catch (error) {
    console.error("Fetch Resumes Error:", error);
    return NextResponse.json({ error: "Failed to fetch resumes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, fileName, content, targetRole, isDefault } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Resume content is required" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: { clerkId: userId, email: "user@example.com" },
    });

    // If this version is set to default, unset other defaults
    if (isDefault) {
      await prisma.userResume.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    // Check if this is user's first resume; if so, make it default automatically
    const existingCount = await prisma.userResume.count({
      where: { userId: user.id },
    });

    const shouldBeDefault = isDefault || existingCount === 0;

    const resume = await prisma.userResume.create({
      data: {
        userId: user.id,
        name: name?.trim() || ("Resume Version " + String.fromCharCode(65 + existingCount)),
        fileName: fileName?.trim() || "resume.txt",
        content: content.trim(),
        targetRole: targetRole?.trim() || null,
        isDefault: shouldBeDefault,
      },
    });

    return NextResponse.json({ success: true, resume }, { status: 201 });
  } catch (error) {
    console.error("Create Resume Error:", error);
    return NextResponse.json({ error: "Failed to create resume version" }, { status: 500 });
  }
}