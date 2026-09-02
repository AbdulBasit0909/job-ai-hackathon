import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Page() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950">
      <SignUp 
        fallbackRedirectUrl="/dashboard"
        forceRedirectUrl="/dashboard"
        appearance={{ variables: { colorPrimary: '#6366f1' } }} 
      />
    </div>
  );
}