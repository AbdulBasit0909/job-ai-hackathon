import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const resume = await prisma.userResume.findUnique({
      where: { id },
      include: {
        applications: {
          include: { job: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume version not found" }, { status: 404 });
    }

    return NextResponse.json({ resume });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch resume version" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { name, content, targetRole, isDefault, fileName } = await req.json();

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (isDefault) {
      await prisma.userResume.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.userResume.update({
      where: { id, userId: user.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(content !== undefined && { content: content.trim() }),
        ...(targetRole !== undefined && { targetRole: targetRole ? targetRole.trim() : null }),
        ...(fileName !== undefined && { fileName: fileName.trim() }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json({ success: true, resume: updated });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update resume version" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.userResume.delete({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete resume version" }, { status: 500 });
  }
}