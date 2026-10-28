import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApeForm } from "@/components/pilots/ape-form";
import { getPilotProfile } from "@/lib/pilots/queries";
import { createApeRecord } from "@/app/(dashboard)/personnel/[id]/ape/actions";
import { parsePreservedValues } from "@/lib/forms/error-redirect";
import { requirePermission } from "@/lib/auth/require-permission";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { hasPermission } from "@/lib/permissions";

export default async function NewApePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; values?: string }>;
}) {
  const { id } = await params;
  await requirePermission("ape:manage", `/personnel/${id}`);
  const [profile, { error, values }, me] = await Promise.all([
    getPilotProfile(id),
    searchParams,
    getCurrentProfile(),
  ]);
  const preserved = parsePreservedValues(values);

  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">New APE Record</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/personnel/${id}`}>Cancel</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {profile.rankLabel} {profile.pilot.full_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ApeForm
            action={createApeRecord}
            submitLabel="Save record"
            error={error}
            hiddenFields={{ pilot_id: id }}
            defaultValues={preserved}
            allowCertificate={hasPermission(me?.role_code, "ape:certificate")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
