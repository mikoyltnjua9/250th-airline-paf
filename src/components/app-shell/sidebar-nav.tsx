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
  /** Built as a section on the per-pilot Profile page rather than its own
   * standalone wing-wide list — links into Personnel Directory instead of
   * a dedicated route. Suppresses the "active" highlight (it shares its
   * href with the real Personnel Directory item) and shows a hint instead. */
  perPilot?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Personnel Directory", href: "/personnel", icon: Users },
  { label: "Personnel Verification", href: "/personnel", icon: ScanLine, perPilot: true },
  { label: "Qualifications", href: "/personnel", icon: GraduationCap, perPilot: true },
  { label: "Flying Hours & History", href: "/personnel", icon: PlaneTakeoff, perPilot: true },
  { label: "Duty & Workload", href: "/duty-workload", icon: Gauge },
  { label: "APE Status", href: "/personnel", icon: HeartPulse, perPilot: true },
  { label: "Currency Status", href: "/personnel", icon: RefreshCcw, perPilot: true },
  { label: "Training Records", href: "/personnel", icon: BookOpen, perPilot: true },
  { label: "StanEval & Grading", href: "/personnel", icon: ClipboardList, perPilot: true },
  { label: "Reports & Analytics", href: "/reports", icon: BarChart3 },
  { label: "Alerts & Notifications", href: "/alerts", icon: Bell },
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
        const isActive =
          !item.perPilot && (pathname === item.href || pathname.startsWith(`${item.href}/`));

        if (item.disabled) {
          return (
            <span
              key={item.label}
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
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            title={item.perPilot ? "Open a pilot's profile to use this" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.perPilot && (
              <span className="text-[10px] font-normal text-sidebar-foreground/45">
                via profile
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
