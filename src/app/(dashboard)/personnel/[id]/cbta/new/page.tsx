import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CbtaForm } from "@/components/pilots/cbta-form";
import { getPilotProfile } from "@/lib/pilots/queries";
import { createCbtaAssessment } from "@/app/(dashboard)/personnel/[id]/cbta/actions";
import { parsePreservedValues } from "@/lib/forms/error-redirect";
import { personnelTypeForPosition } from "@/lib/types/pilot";
import { todayInManila } from "@/lib/dates";

export default async function NewCbtaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; values?: string }>;
}) {
  const { id } = await params;
  const [profile, { error, values }] = await Promise.all([getPilotProfile(id), searchParams]);
  if (!profile || personnelTypeForPosition(profile.pilot.position) !== "pilot") notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">New CBTA Grade Slip</h1>
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
          <CbtaForm
            action={createCbtaAssessment}
            submitLabel="Save grade slip"
            error={error}
            hiddenFields={{ pilot_id: id }}
            defaultValues={parsePreservedValues(values)}
            today={todayInManila()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
