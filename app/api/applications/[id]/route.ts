import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { status, followUpDate, resumeVersionId } = await req.json();

    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const isApplied = status && status !== "Saved";
    const isResponse = status === "Interviewing" || status === "Offer" || status === "Rejected";

    const updatedApp = await prisma.application.update({
      where: { id },
      data: { 
        ...(status !== undefined && { status }),
        ...(followUpDate !== undefined && { followUpDate: followUpDate ? new Date(followUpDate) : null }),
        ...(resumeVersionId !== undefined && { resumeVersionId: resumeVersionId || null }),
        ...(isApplied && !existing.appliedAt && { appliedAt: new Date() }),
        ...(isResponse && !existing.respondedAt && { respondedAt: new Date() }),
      },
      include: {
        job: true,
        resumeVersion: { select: { id: true, name: true, targetRole: true } }
      }
    });

    return NextResponse.json({ success: true, application: updatedApp });
  } catch (error) {
    console.error("Update Application Error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}