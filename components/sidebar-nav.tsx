"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Briefcase,
  Layers,
  MessageSquare,
  Users,
  FileText,
} from "lucide-react";
import type { ComponentType } from "react";

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Search,
  Briefcase,
  Layers,
  MessageSquare,
  Users,
  FileText,
};

type NavItem = { name: string; href: string; iconName: string };

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 p-4 text-sm font-medium">
      {items.map((item) => {
        const Icon = iconMap[item.iconName];
        const isActive = pathname === item.href;
        return (
          <a
            key={item.name}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
              isActive
                ? "bg-indigo-500/10 text-white border border-indigo-500/20"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
            }`}
          >
            {Icon && (
              <Icon
                className={`h-4 w-4 ${isActive ? "text-indigo-400" : ""}`}
              />
            )}
            {item.name}
          </a>
        );
      })}
    </nav>
  );
}
