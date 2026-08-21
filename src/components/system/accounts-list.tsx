import { PilotAvatar } from "@/components/pilots/pilot-avatar";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { roleLabel } from "@/lib/permissions";
import { deleteAccount } from "@/app/(dashboard)/system/actions";
import type { AccountRow } from "@/lib/system/queries";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AccountsList({
  accounts,
  currentUserId,
}: {
  accounts: AccountRow[];
  currentUserId: string;
}) {
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
          {account.id !== currentUserId && (
            <ConfirmActionButton
              onConfirm={deleteAccount.bind(null, account.id)}
              triggerLabel="Delete"
              title={`Delete ${account.fullName}'s account?`}
              description="They'll immediately lose access. This can't be undone."
              confirmLabel="Delete"
            />
          )}
        </div>
      ))}
    </div>
  );
}
