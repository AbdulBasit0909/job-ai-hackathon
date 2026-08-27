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

    const { jobId } = await req.json();

    // Check if user exists in our DB, if not, create them
    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: { clerkId: userId, email: "user@example.com" }, // Mock email for hackathon
    });

    // Save the job to their applications
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
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}