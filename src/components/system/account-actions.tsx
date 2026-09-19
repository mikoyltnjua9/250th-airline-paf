"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import {
  renameAccount,
  resetAccountPassword,
  resetAccountTwoFactor,
} from "@/app/(dashboard)/system/actions";

function RenameAccountButton({ accountId, currentName }: { accountId: string; currentName: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setName(currentName);
      setError(null);
    }
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(true)}>
        Rename
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename account</DialogTitle>
            <DialogDescription>
              Changes the name shown in the header, account list and audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`rename-${accountId}`}>Full name</Label>
            <Input
              id={`rename-${accountId}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await renameAccount(accountId, name);
                  if (res.error) setError(res.error);
                  else setOpen(false);
                })
              }
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResetPasswordButton({ accountId, accountName }: { accountId: string; accountName: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Drop the password from memory as soon as the dialog closes -- it's
    // shown once and can't be retrieved again.
    if (!next) {
      setPassword(null);
      setError(null);
    }
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(true)}>
        Reset password
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {password ? "New password" : `Reset ${accountName}'s password?`}
            </DialogTitle>
            <DialogDescription>
              {password
                ? "Share this with them through a secure channel. It's shown once and can't be retrieved again."
                : "Their current password stops working immediately and a new one is generated. Their 2FA isn't affected."}
            </DialogDescription>
          </DialogHeader>

          {password && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Password</p>
              <p className="font-mono font-medium break-all select-all">{password}</p>
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Couldn&apos;t reset password</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            {password ? (
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await resetAccountPassword(accountId);
                      if (res.error) setError(res.error);
                      else setPassword(res.password ?? null);
                    })
                  }
                >
                  {pending ? "Working…" : "Reset password"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Per-account admin actions in System Management (delete stays in the
 * server-rendered list, bound to its id like every other delete). */
export function AccountActions({
  accountId,
  accountName,
  isSelf,
}: {
  accountId: string;
  accountName: string;
  isSelf: boolean;
}) {
  return (
    <>
      <RenameAccountButton accountId={accountId} currentName={accountName} />
      <ResetPasswordButton accountId={accountId} accountName={accountName} />
      {!isSelf && (
        <ConfirmActionButton
          onConfirm={() => resetAccountTwoFactor(accountId)}
          triggerLabel="Reset 2FA"
          title={`Reset ${accountName}'s 2FA?`}
          description="Removes their authenticator. Next time they sign in they'll set up 2FA again with a new device. Use this for a lost or replaced phone."
          confirmLabel="Reset 2FA"
          confirmVariant="default"
        />
      )}
    </>
  );
}
