import { Crest } from "@/components/crest";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MobileNav } from "@/components/app-shell/mobile-nav";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Header({ fullName, roleLabel }: { fullName: string; roleLabel: string }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border bg-sidebar px-3 text-sidebar-foreground sm:h-20 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <MobileNav />
        <Crest className="h-9 w-9 shrink-0 sm:h-11 sm:w-11" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-sidebar-primary sm:text-[11px]">
            250th Presidential Airlift Wing
          </p>
          <h1 className="truncate text-sm font-bold uppercase tracking-tight sm:text-lg">
            Wing Safety Dashboard
          </h1>
          <p className="hidden truncate text-xs text-sidebar-foreground/60 sm:block">
            Wing Safety Licensing and Qualification Program
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {roleLabel}
        </Badge>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-primary text-xs text-sidebar-primary-foreground">
              {initials(fullName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">{fullName}</span>
        </div>
        <form action={signOut}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
