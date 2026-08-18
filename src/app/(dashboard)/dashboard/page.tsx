import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {profile?.full_name}
        </h1>
        <p className="text-muted-foreground">You&apos;re signed in with 2FA verified.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Overview</CardTitle>
          <CardDescription>
            Phase 1 placeholder. The real Overview — equipment quals, duty/workload,
            currency status, and alerts — is built in Phase 2.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Auth, mandatory 2FA, session timeout, and the app shell are wired up and
          working end to end.
        </CardContent>
      </Card>
    </div>
  );
}
