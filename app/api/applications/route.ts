import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch real email from Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress || "unknown@example.com";

    const { jobId } = await req.json();

    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: { email }, // Update with real email
      create: { clerkId: userId, email }, // Create with real email
    });

    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobId: jobId,
        status: "Saved",
      },
    });

    return NextResponse.json({ success: true, application });
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

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