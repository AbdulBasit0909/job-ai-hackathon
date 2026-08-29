import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");
    const { candidateId, candidateName, candidateEmail, recruiterName, recruiterEmail, message } = await req.json();

    // 1. Save the referral to the database
    const newRequest = await prisma.referralRequest.create({
      data: {
        candidateId: candidateId,
        candidateName: candidateName,
        recruiterName: recruiterName,
        recruiterEmail: recruiterEmail,
        message: message,
        status: "Pending",
      }
    });

    // 2. Generate the Accept/Reject URLs using the new request ID
    const baseUrl = req.headers.get("origin") || "http://localhost:3000";
    const acceptUrl = `${baseUrl}/api/referrals/update?id=${newRequest.id}&status=Accepted`;
    const rejectUrl = `${baseUrl}/api/referrals/update?id=${newRequest.id}&status=Rejected`;

    // 3. Send the actual email using Resend with the buttons
    if (candidateEmail) {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; padding: 32px; border-radius: 16px; border: 1px solid #27272a;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0;">JobHunt <span style="color: #6366f1;">AI</span></h1>
            <p style="color: #71717a; font-size: 14px; margin-top: 8px;">Talent Intelligence Pipeline</p>
          </div>
          
          <div style="background-color: #18181b; padding: 24px; border-radius: 12px; border: 1px solid #27272a;">
            <p style="color: #d4d4d8; font-size: 16px; line-height: 1.6; white-space: pre-line;">${message}</p>
          </div>
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #27272a;">
            <p style="color: #a1a1aa; font-size: 14px;">Best regards,</p>
            <p style="color: #ffffff; font-size: 16px; font-weight: bold; margin: 4px 0;">${recruiterName}</p>
            <p style="color: #6366f1; font-size: 14px;">${recruiterEmail}</p>
          </div>

          <!-- HERE ARE THE BUTTONS -->
          <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #27272a;">
            <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 20px;">Please respond to this referral request:</p>
            <a href="${acceptUrl}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px; display: inline-block;">Accept Referral</a>
            <a href="${rejectUrl}" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reject</a>
          </div>

          <div style="text-align: center; margin-top: 40px; color: #52525b; font-size: 12px;">
            <p>You received this email because a recruiter found your profile on JobHunt AI.</p>
            <p>&copy; 2024 JobHunt AI. All rights reserved.</p>
          </div>
        </div>
      `;

      await resend.emails.send({
        from: "JobHunt AI <onboarding@resend.dev>",
        to: candidateEmail,
        subject: `New Referral Opportunity from ${recruiterName}`,
        html: htmlContent, 
      });
    }

    return NextResponse.json({ success: true, request: newRequest });
  } catch (error) {
    console.error("Failed to create referral:", error);
    return NextResponse.json({ error: "Failed to send referral" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const requests = await prisma.referralRequest.findMany({
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ requests });
  } catch {
    return NextResponse.json({ requests: [] });
  }
}