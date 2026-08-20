import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrainingForm } from "@/components/pilots/training-form";
import { getPilotProfile, getTrainingRecord } from "@/lib/pilots/queries";
import { updateTrainingRecord } from "@/app/(dashboard)/personnel/[id]/training/actions";
import { parsePreservedValues } from "@/lib/forms/error-redirect";

export default async function EditTrainingRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; recordId: string }>;
  searchParams: Promise<{ error?: string; values?: string }>;
}) {
  const { id, recordId } = await params;
  const [profile, record, { error, values }] = await Promise.all([
    getPilotProfile(id),
    getTrainingRecord(id, recordId),
    searchParams,
  ]);
  const preserved = parsePreservedValues(values);

  if (!profile || !record) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Edit Training Record</h1>
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
          <TrainingForm
            action={updateTrainingRecord}
            submitLabel="Save changes"
            error={error}
            hiddenFields={{ pilot_id: id, record_id: recordId }}
            defaultValues={
              preserved ?? {
                training_type: record.training_type,
                status: record.status,
                training_date: record.training_date,
              }
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
