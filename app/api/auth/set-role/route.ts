import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { role } = await req.json();
    if (role !== "candidate" && role !== "recruiter") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Use updateUserMetadata instead of updateUser (fixes deprecation warning)
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Role update failed:", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}