import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LayoutDashboard, Search, Briefcase, MessageSquare, Sparkles } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) return redirect("/sign-in");

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "AI Job Search", href: "/dashboard/search", icon: Search },
    { name: "Applications", href: "/dashboard/applications", icon: Briefcase },
    { name: "Interview Prep", href: "/dashboard/interview", icon: MessageSquare },
  ];

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100">
      {/* Premium Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-zinc-800/80 bg-zinc-900/30 backdrop-blur-xl">
        <div className="flex h-16 items-center border-b border-zinc-800/80 px-6">
          <Sparkles className="h-5 w-5 text-indigo-400 mr-2" />
          <span className="text-lg font-bold tracking-tight">JobHunt<span className="text-indigo-400">AI</span></span>
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
          <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-4 border border-indigo-500/20">
            <p className="text-xs font-semibold text-indigo-300">Pro Tip</p>
            <p className="mt-1 text-xs text-zinc-400">Use the AI Search to find jobs that match your exact resume context.</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/50 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-medium text-zinc-400">Welcome to your command center</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-500">
              <span className="bg-green-500 h-2 w-2 rounded-full mr-2 animate-pulse"></span>
              AI Engine Online
            </div>
            <UserButton />
          </div>
        </header>

        {/* Page Content with Gradient Background */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-zinc-950 to-zinc-900/20 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}