import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch real users who have completed their profile (have a name and skills)
    const candidates = await prisma.user.findMany({
      where: { 
        name: { not: null },
        skills: { isEmpty: false }
      },
      take: 10,
    });

    // Format them for the frontend
    const formattedCandidates = candidates.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      role: c.role || "Open to Work",
      location: c.location || "Remote",
      skills: c.skills,
    }));

    return NextResponse.json({ candidates: formattedCandidates });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch talent" }, { status: 500 });
  }
}