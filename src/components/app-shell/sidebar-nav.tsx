"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ScanLine,
  GraduationCap,
  PlaneTakeoff,
  Gauge,
  HeartPulse,
  RefreshCcw,
  BookOpen,
  ClipboardList,
  BarChart3,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Screens not built yet — shown so the sidebar reflects the whole
   * planned system, per the client's reference layout, but not clickable. */
  disabled?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Personnel Directory", href: "/personnel", icon: Users },
  { label: "License Verification", href: "/licenses", icon: ScanLine, disabled: true },
  { label: "Qualifications", href: "/qualifications", icon: GraduationCap, disabled: true },
  { label: "Flying Hours & History", href: "/flying-hours", icon: PlaneTakeoff, disabled: true },
  { label: "Duty & Workload", href: "/duty-workload", icon: Gauge },
  { label: "APE Status", href: "/ape", icon: HeartPulse, disabled: true },
  { label: "Currency Status", href: "/currency", icon: RefreshCcw, disabled: true },
  { label: "Training Records", href: "/training", icon: BookOpen, disabled: true },
  { label: "StanEval & Grading", href: "/staneval", icon: ClipboardList, disabled: true },
  { label: "Reports & Analytics", href: "/reports", icon: BarChart3, disabled: true },
  { label: "Alerts & Notifications", href: "/alerts", icon: Bell, disabled: true },
  { label: "System Management", href: "/system", icon: Settings },
];

/**
 * Just the nav list — no wrapping <aside>, no assumptions about where it's
 * rendered. Used by both the persistent desktop Sidebar and the mobile
 * drawer (MobileNav), so the two never drift apart.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        if (item.disabled) {
          return (
            <span
              key={item.href}
              title="Coming soon"
              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/35"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
