import { getCurrentProfile } from "@/lib/auth/get-profile";
import { StatTile } from "@/components/stat-tile";
import { AlertsCard } from "@/components/dashboard/alerts-card";
import { QualificationsCard } from "@/components/dashboard/qualifications-card";
import { CurrencyCard } from "@/components/dashboard/currency-card";
import { WorkloadCard } from "@/components/dashboard/workload-card";
import { getDashboardOverview } from "@/lib/dashboard/queries";
import { getDutyWorkload } from "@/lib/pilots/queries";

export default async function DashboardPage() {
  const [profile, overview, workload] = await Promise.all([
    getCurrentProfile(),
    getDashboardOverview(),
    getDutyWorkload(30),
  ]);

  const expiredAlerts = overview.alerts.filter((a) => a.status === "expired").length;
  const expiringAlerts = overview.alerts.filter((a) => a.status === "expiring_soon").length;
  const totalHours30Days = workload.reduce((sum, w) => sum + w.hours, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {profile?.full_name}
        </h1>
        <p className="text-muted-foreground">Wing Safety Dashboard — Overview</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Total Pilots" value={overview.totalPilots} />
        <StatTile
          label="Fully Mission-Ready"
          value={overview.fullyMissionReady}
          hint={`of ${overview.totalPilots} pilots`}
          tone="good"
        />
        <StatTile
          label="Active Alerts"
          value={overview.alerts.length}
          hint={`${expiredAlerts} expired · ${expiringAlerts} expiring soon`}
          tone={expiredAlerts > 0 ? "danger" : expiringAlerts > 0 ? "warning" : "good"}
        />
        <StatTile
          label="Flight Hours"
          value={totalHours30Days.toFixed(1)}
          hint="wing total, last 30 days"
        />
      </div>

      <AlertsCard alerts={overview.alerts} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <QualificationsCard rows={overview.qualificationSummary} />
        <CurrencyCard rows={overview.currencySummary} />
      </div>

      <WorkloadCard rows={workload.slice(0, 10)} totalHours={totalHours30Days} />
    </div>
  );
}
