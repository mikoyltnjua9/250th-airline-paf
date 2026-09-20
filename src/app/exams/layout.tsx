import { redirect } from "next/navigation";
import { Crest } from "@/components/crest";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { signOut } from "@/lib/actions/auth";

/**
 * Deliberately separate from the wing dashboard shell: an examinee sees no
 * sidebar, no personnel, no safety data -- just their own exams. Only
 * examinee accounts belong here; admins are sent back to the dashboard.
 */
export default async function ExamsLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role_code !== "examinee") redirect("/dashboard");

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Crest className="h-9 w-9 shrink-0 sm:h-11 sm:w-11" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-sidebar-primary sm:text-[11px]">
              250th Presidential Airlift Wing
            </p>
            <h1 className="truncate text-sm font-bold uppercase tracking-tight sm:text-lg">
              Written Exams
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-sm font-medium sm:inline">{profile.full_name}</span>
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
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
