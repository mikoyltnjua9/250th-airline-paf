import Link from "next/link";
import { Crest } from "@/components/crest";

// Only phases that are actually built get a nav entry — extend this as each
// phase lands (Personnel Directory, License Verification, Qualifications, …).
const NAV_ITEMS = [{ href: "/dashboard", label: "Dashboard" }];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <Crest className="h-9 w-9 shrink-0" />
        <div className="leading-tight">
          <p className="text-[11px] font-medium uppercase tracking-wide text-sidebar-primary">
            250th PAW
          </p>
          <p className="text-sm font-semibold">Safety Dashboard</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
