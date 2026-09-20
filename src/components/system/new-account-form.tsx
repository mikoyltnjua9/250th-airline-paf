"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createAccount, type CreateAccountState } from "@/app/(dashboard)/system/actions";
import type { LinkablePerson, RoleRow } from "@/lib/system/queries";

const initialState: CreateAccountState = {};

export function NewAccountForm({
  roles,
  personnel,
}: {
  roles: RoleRow[];
  personnel: LinkablePerson[];
}) {
  const [state, formAction, pending] = useActionState(createAccount, initialState);
  const [formKey, setFormKey] = useState(0);
  const [role, setRole] = useState(roles[0]?.code ?? "");

  if (state.success) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTitle>Account created</AlertTitle>
          <AlertDescription>
            Share these credentials with the new user through a secure channel — this
            password is shown once and can&apos;t be retrieved again. They&apos;ll be required
            to set up 2FA the first time they sign in.
          </AlertDescription>
        </Alert>
        <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium">{state.success.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Password</p>
            <p className="font-mono font-medium">{state.success.password}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setFormKey((k) => k + 1)}
        >
          Create another account
        </Button>
      </div>
    );
  }

  return (
    <form key={formKey} action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t create account</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role_code">Role</Label>
          <NativeSelect
            id="role_code"
            name="role_code"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            {roles.map((role) => (
              <option key={role.code} value={role.code}>
                {role.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        {role === "examinee" && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="personnel_id">Person</Label>
            <NativeSelect id="personnel_id" name="personnel_id" defaultValue="" required>
              <option value="" disabled>
                {personnel.length === 0 ? "No one available — add them to the Directory first" : "Select the person this login is for"}
              </option>
              {personnel.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">
              This login can only take the exams assigned to this person — it can&apos;t see
              anything else in the system.
            </p>
          </div>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
