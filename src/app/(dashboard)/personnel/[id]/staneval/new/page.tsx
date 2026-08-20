import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StanevalForm } from "@/components/pilots/staneval-form";
import { getPilotProfile } from "@/lib/pilots/queries";
import { createStanevalRecord } from "@/app/(dashboard)/personnel/[id]/staneval/actions";
import { parsePreservedValues } from "@/lib/forms/error-redirect";

export default async function NewStanevalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; values?: string }>;
}) {
  const { id } = await params;
  const [profile, { error, values }] = await Promise.all([getPilotProfile(id), searchParams]);
  const preserved = parsePreservedValues(values);

  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">New StanEval Record</h1>
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
            action={createStanevalRecord}
            submitLabel="Save record"
            error={error}
            hiddenFields={{ pilot_id: id }}
            defaultValues={preserved}
          />
        </CardContent>
      </Card>
    </div>
  );
}
