import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Placeholder avatar — initials only, no photo upload yet (deferred until
 * Supabase Storage is wired up as its own pass). Swap in a real <img> here
 * once photo_url is populated.
 */
export function PilotAvatar({
  fullName,
  className,
}: {
  fullName: string;
  className?: string;
}) {
  return (
    <Avatar className={cn("h-10 w-10", className)}>
      <AvatarFallback className="bg-primary text-sm text-primary-foreground">
        {initials(fullName)}
      </AvatarFallback>
    </Avatar>
  );
}
