import { UserButton } from "@clerk/nextjs";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { 
  LayoutDashboard, 
  Search, 
  Briefcase, 
  MessageSquare, 
  Sparkles, 
  Layers, 
  Users, 
  Building2 
} from "lucide-react";
import { RoleToggle } from "@/components/role-toggle";
import { ChatWidget } from "@/components/copilot/chat-widget";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) return redirect("/sign-in");

  // Fetch real-time role from Clerk
  let role = "candidate";
  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    role = (clerkUser.publicMetadata.role as string) || "candidate";
  } catch (err) {
    console.warn("Could not fetch user metadata from Clerk:", err);
  }

  const candidateNav = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "AI Job Search", href: "/dashboard/search", icon: Search },
    { name: "Applications", href: "/dashboard/applications", icon: Briefcase },
    { name: "Resume A/B Testing", href: "/dashboard/resumes", icon: Layers },
    { name: "Interview Prep", href: "/dashboard/interview", icon: MessageSquare },
  ];

  const recruiterNav = [
    { name: "Recruiter Dashboard", href: "/dashboard/recruiter", icon: Users },
  ];

  const navItems = role === "recruiter" ? recruiterNav : candidateNav;
  const accentColor = role === "recruiter" ? "text-emerald-400" : "text-indigo-400";
  const brandColor = role === "recruiter" ? "text-emerald-400" : "text-indigo-400";

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-zinc-800/80 bg-zinc-900/30 backdrop-blur-xl">
        <div className="flex h-16 items-center border-b border-zinc-800/80 px-6">
          <Sparkles className={"h-5 w-5 mr-2 " + accentColor} />
          <span className="text-lg font-bold tracking-tight">JobHunt<span className={brandColor}>AI</span></span>
        </div>
        <nav className="flex-1 space-y-1 p-4 text-sm font-medium">
          {navItems.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-400 transition-all hover:bg-zinc-800/50 hover:text-zinc-100"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-zinc-800/80">
          <div className={"rounded-xl p-4 border " + (role === 'recruiter' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-indigo-500/10 border-indigo-500/20')}>
            <p className={"text-xs font-semibold " + (role === 'recruiter' ? 'text-emerald-300' : 'text-indigo-300')}>
              {role === 'recruiter' ? 'B2B Recruiter Mode' : 'Pro Tip'}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {role === 'recruiter' ? "Viewing live candidate talent pipeline from database." : "Compare resume versions in A/B testing to maximize callbacks."}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/50 px-6 backdrop-blur-xl">
          <h1 className="text-sm font-medium text-zinc-400">
            {role === 'recruiter' ? 'Talent Intelligence Center' : 'Welcome to your command center'}
          </h1>
          <div className="flex items-center gap-6">
            <RoleToggle />
            <div className="hidden md:flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-500">
              <span className="bg-green-500 h-2 w-2 rounded-full mr-2 animate-pulse"></span>
              AI Engine Online
            </div>
            <UserButton />
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-zinc-950 to-zinc-900/20 p-8">
          {children}
        </main>
      </div>

      {/* AI Copilot Chat Widget */}
      <ChatWidget />
    </div>
  );
}