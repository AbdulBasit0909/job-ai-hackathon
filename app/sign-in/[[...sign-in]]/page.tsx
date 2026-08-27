import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950">
      <SignIn appearance={{ variables: { colorPrimary: '#6366f1' } }} />
    </div>
  );
}