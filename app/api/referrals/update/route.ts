import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const status = url.searchParams.get("status");

    if (!id || !status) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    await prisma.referralRequest.update({
      where: { id },
      data: { status },
    });

    // Return a simple HTML page so the candidate knows it worked
    return new NextResponse(`
      <html>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #18181b; color: white;">
          <div style="text-align: center;">
            <h1 style="color: ${status === 'Accepted' ? '#10b981' : '#ef4444'}; font-size: 48px;">${status}!</h1>
            <p>You have successfully ${status.toLowerCase()} the referral request.</p>
            <p style="color: #71717a; margin-top: 20px;">You can close this window now.</p>
          </div>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html" } });

  } catch (error) {
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}