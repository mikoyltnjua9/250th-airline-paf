import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApeForm } from "@/components/pilots/ape-form";
import { getPilotProfile, getApeRecord } from "@/lib/pilots/queries";
import { updateApeRecord } from "@/app/(dashboard)/personnel/[id]/ape/actions";
import { parsePreservedValues } from "@/lib/forms/error-redirect";

export default async function EditApePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; recordId: string }>;
  searchParams: Promise<{ error?: string; values?: string }>;
}) {
  const { id, recordId } = await params;
  const [profile, record, { error, values }] = await Promise.all([
    getPilotProfile(id),
    getApeRecord(id, recordId),
    searchParams,
  ]);
  const preserved = parsePreservedValues(values);

  if (!profile || !record) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Edit APE Record</h1>
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
            action={updateApeRecord}
            submitLabel="Save changes"
            error={error}
            hiddenFields={{ pilot_id: id, record_id: recordId }}
            defaultValues={
              preserved ?? {
                last_ape_date: record.last_ape_date,
                next_due_date: record.next_due_date,
                fit_to_fly: String(record.fit_to_fly),
                classification: record.classification ?? "",
              }
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
