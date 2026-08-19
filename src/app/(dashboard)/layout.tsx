import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { roleLabel } from "@/lib/permissions";
import { Header } from "@/components/app-shell/header";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Footer } from "@/components/app-shell/footer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already enforces auth + 2FA (aal2) for everything under this
  // layout; this is defense-in-depth in case the layout is ever reached
  // some other way.
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Header fullName={profile.full_name} roleLabel={roleLabel(profile.role_code)} />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
