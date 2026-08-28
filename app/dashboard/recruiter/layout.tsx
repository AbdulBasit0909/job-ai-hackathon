import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) return redirect("/sign-in");

  // Fetch the user directly from Clerk to bypass session token caching
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = user.publicMetadata.role as string | undefined;

  // If they are not a recruiter, bounce them to the Access Gate
  if (role !== "recruiter") {
    redirect("/dashboard/recruiter-access");
  }

  return <>{children}</>;
}