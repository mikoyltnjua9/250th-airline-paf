import { SidebarNav } from "@/components/app-shell/sidebar-nav";

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto bg-sidebar text-sidebar-foreground md:flex">
      <SidebarNav />
    </aside>
  );
}
