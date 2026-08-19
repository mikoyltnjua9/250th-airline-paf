import { PilotAvatar } from "@/components/pilots/pilot-avatar";
import { Badge } from "@/components/ui/badge";
import { roleLabel } from "@/lib/permissions";
import type { AccountRow } from "@/lib/system/queries";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AccountsList({ accounts }: { accounts: AccountRow[] }) {
  if (accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">No accounts on record.</p>;
  }

  return (
    <div className="divide-y overflow-hidden rounded-xl border">
      {accounts.map((account) => (
        <div key={account.id} className="flex items-center gap-4 p-4">
          <PilotAvatar fullName={account.fullName} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{account.fullName}</p>
            <p className="truncate text-sm text-muted-foreground">
              {account.email ?? "—"} · Added {formatDate(account.createdAt)}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {roleLabel(account.roleCode)}
          </Badge>
        </div>
      ))}
    </div>
  );
}
