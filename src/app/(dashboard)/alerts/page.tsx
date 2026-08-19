import { StatTile } from "@/components/stat-tile";
import { AlertsTable } from "@/components/alerts/alerts-table";
import { getAlerts, getAcknowledgements, EXPIRING_SOON_THRESHOLD_DAYS } from "@/lib/alerts/queries";

export default async function AlertsPage() {
  const [alerts, acknowledgements] = await Promise.all([getAlerts(), getAcknowledgements()]);

  const rows = alerts.map((alert) => ({
    alert,
    acknowledgement: acknowledgements.get(alert.id) ?? null,
  }));

  const expiredCount = alerts.filter((a) => a.status === "expired").length;
  const expiringSoonCount = alerts.filter((a) => a.status === "expiring_soon").length;
  const unacknowledgedCount = rows.filter((r) => !r.acknowledgement).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alerts &amp; Notifications</h1>
        <p className="text-muted-foreground">
          Everything expired or due within {EXPIRING_SOON_THRESHOLD_DAYS} days, wing-wide — filter,
          and mark items as acknowledged once someone&apos;s on top of them.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Total Alerts" value={alerts.length} />
        <StatTile label="Expired" value={expiredCount} tone={expiredCount > 0 ? "danger" : "good"} />
        <StatTile
          label="Expiring Soon"
          value={expiringSoonCount}
          tone={expiringSoonCount > 0 ? "warning" : "good"}
        />
        <StatTile
          label="Unacknowledged"
          value={unacknowledgedCount}
          tone={unacknowledgedCount > 0 ? "warning" : "good"}
        />
      </div>

      <AlertsTable rows={rows} />
    </div>
  );
}
