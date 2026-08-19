import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QualificationForm } from "@/components/pilots/qualification-form";
import { getPilotProfile, getAircraftTypes } from "@/lib/pilots/queries";
import { createQualification } from "@/app/(dashboard)/personnel/[id]/qualifications/actions";

export default async function NewQualificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const [profile, aircraftTypes, { error }] = await Promise.all([
    getPilotProfile(id),
    getAircraftTypes(),
    searchParams,
  ]);

  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">New Qualification</h1>
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
          <QualificationForm
            aircraftTypes={aircraftTypes}
            action={createQualification}
            submitLabel="Save qualification"
            error={error}
            hiddenFields={{ pilot_id: id }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
