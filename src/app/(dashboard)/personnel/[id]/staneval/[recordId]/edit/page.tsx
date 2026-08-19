import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StanevalForm } from "@/components/pilots/staneval-form";
import { getPilotProfile, getStanevalRecord } from "@/lib/pilots/queries";
import { updateStanevalRecord } from "@/app/(dashboard)/personnel/[id]/staneval/actions";

export default async function EditStanevalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; recordId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, recordId } = await params;
  const [profile, record, { error }] = await Promise.all([
    getPilotProfile(id),
    getStanevalRecord(id, recordId),
    searchParams,
  ]);

  if (!profile || !record) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Edit StanEval Record</h1>
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
          <StanevalForm
            action={updateStanevalRecord}
            submitLabel="Save changes"
            error={error}
            hiddenFields={{ pilot_id: id, record_id: recordId }}
            defaultValues={{
              eval_date: record.eval_date,
              status: record.status,
              grading: record.grading ?? "",
              next_due_date: record.next_due_date ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
