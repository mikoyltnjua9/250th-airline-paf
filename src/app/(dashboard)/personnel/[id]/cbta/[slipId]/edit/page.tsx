import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CbtaForm } from "@/components/pilots/cbta-form";
import { getPilotProfile } from "@/lib/pilots/queries";
import { getCbtaAssessment } from "@/lib/cbta/queries";
import { slipToDefaults } from "@/lib/cbta/defaults";
import { updateCbtaAssessment } from "@/app/(dashboard)/personnel/[id]/cbta/actions";
import { parsePreservedValues } from "@/lib/forms/error-redirect";
import { todayInManila } from "@/lib/dates";

export default async function EditCbtaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; slipId: string }>;
  searchParams: Promise<{ error?: string; values?: string }>;
}) {
  const { id, slipId } = await params;
  const [profile, slip, { error, values }] = await Promise.all([
    getPilotProfile(id),
    getCbtaAssessment(id, slipId),
    searchParams,
  ]);
  if (!profile || !slip) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Edit CBTA Grade Slip</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/personnel/${id}/cbta/${slipId}`}>Cancel</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {profile.rankLabel} {profile.pilot.full_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CbtaForm
            action={updateCbtaAssessment}
            submitLabel="Save changes"
            error={error}
            hiddenFields={{ pilot_id: id, slip_id: slipId }}
            defaultValues={parsePreservedValues(values) ?? slipToDefaults(slip)}
            today={todayInManila()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
