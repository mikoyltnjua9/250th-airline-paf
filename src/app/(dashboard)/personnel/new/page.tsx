import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PilotForm } from "@/components/pilots/pilot-form";
import { getRanks, getUnitSuggestions } from "@/lib/pilots/queries";
import { createPilot } from "@/app/(dashboard)/personnel/actions";
import { parsePreservedValues } from "@/lib/forms/error-redirect";
import { requirePermission } from "@/lib/auth/require-permission";
import { getCurrentProfile } from "@/lib/auth/get-profile";

export default async function NewPilotPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; values?: string }>;
}) {
  await requirePermission("pilots:manage", "/personnel");
  const [ranks, unitSuggestions, { error, values }, me] = await Promise.all([
    getRanks(),
    getUnitSuggestions(),
    searchParams,
    getCurrentProfile(),
  ]);
  const preserved = parsePreservedValues(values);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Add Pilot</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/personnel">Cancel</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New pilot record</CardTitle>
        </CardHeader>
        <CardContent>
          <PilotForm
            ranks={ranks}
            unitSuggestions={unitSuggestions}
            lockedUnit={me?.role_code === "unit_admin" ? me.unit : null}
            action={createPilot}
            submitLabel="Create pilot"
            error={error}
            defaultValues={preserved}
          />
        </CardContent>
      </Card>
    </div>
  );
}
