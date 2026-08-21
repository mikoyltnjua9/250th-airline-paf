import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
 * Shows the pilot's real photo when one's on file; falls back to initials
 * otherwise (also the built-in fallback if the image URL 404s). Also used
 * for account rows in System Management, which never have a photo — the
 * fallback path is the normal one there.
 */
export function PilotAvatar({
  fullName,
  photoUrl,
  className,
}: {
  fullName: string;
  photoUrl?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("h-10 w-10", className)}>
      {photoUrl && <AvatarImage src={photoUrl} alt={fullName} />}
      <AvatarFallback className="bg-primary text-sm text-primary-foreground">
        {initials(fullName)}
      </AvatarFallback>
    </Avatar>
  );
}
