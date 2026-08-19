import { getCurrentProfile } from "@/lib/auth/get-profile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatTile } from "@/components/dashboard/stat-tile";
import { AlertsCard } from "@/components/dashboard/alerts-card";
import { QualificationsCard } from "@/components/dashboard/qualifications-card";
import { CurrencyCard } from "@/components/dashboard/currency-card";
import { WorkloadCard } from "@/components/dashboard/workload-card";
import { getOverviewStats } from "@/lib/mock/dashboard";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const stats = getOverviewStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {profile?.full_name}
        </h1>
        <p className="text-muted-foreground">Wing Safety Dashboard — Overview</p>
      </div>

      <Alert>
        <AlertTitle>Sample data</AlertTitle>
        <AlertDescription>
          This Overview is showing mock data. It switches to live records once Pilot
          Profiles (Phase 3) are built.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Total Pilots" value={stats.totalPilots} />
        <StatTile
          label="Fully Mission-Ready"
          value={stats.fullyMissionReady}
          hint={`of ${stats.totalPilots} pilots`}
          tone="good"
        />
        <StatTile
          label="Active Alerts"
          value={stats.totalAlerts}
          hint={`${stats.expiredAlerts} expired · ${stats.expiringAlerts} expiring soon`}
          tone={stats.expiredAlerts > 0 ? "danger" : stats.expiringAlerts > 0 ? "warning" : "good"}
        />
        <StatTile
          label="Flight Hours"
          value={stats.totalHours30Days.toFixed(1)}
          hint="wing total, last 30 days"
        />
      </div>

      <AlertsCard />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <QualificationsCard />
        <CurrencyCard />
      </div>

      <WorkloadCard />
    </div>
  );
}
