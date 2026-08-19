import { Crest } from "@/components/crest";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-sidebar-border bg-sidebar px-6 text-sidebar-foreground">
      <div className="flex items-center gap-3">
        <Crest className="h-11 w-11 shrink-0" />
        <div className="leading-tight">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sidebar-primary">
            250th Presidential Airlift Wing
          </p>
          <h1 className="text-lg font-bold uppercase tracking-tight">
            Wing Safety Dashboard
          </h1>
          <p className="text-xs text-sidebar-foreground/60">
            Wing Safety Licensing and Qualification Program
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
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
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
