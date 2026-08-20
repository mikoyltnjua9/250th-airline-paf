import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QualificationForm } from "@/components/pilots/qualification-form";
import { getPilotProfile, getQualification, getAircraftTypes } from "@/lib/pilots/queries";
import { updateQualification } from "@/app/(dashboard)/personnel/[id]/qualifications/actions";
import { parsePreservedValues } from "@/lib/forms/error-redirect";

export default async function EditQualificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; qualificationId: string }>;
  searchParams: Promise<{ error?: string; values?: string }>;
}) {
  const { id, qualificationId } = await params;
  const [profile, qualification, aircraftTypes, { error, values }] = await Promise.all([
    getPilotProfile(id),
    getQualification(id, qualificationId),
    getAircraftTypes(),
    searchParams,
  ]);
  const preserved = parsePreservedValues(values);

  if (!profile || !qualification) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Edit Qualification</h1>
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
            action={updateQualification}
            submitLabel="Save changes"
            error={error}
            hiddenFields={{ pilot_id: id, qualification_id: qualificationId }}
            defaultValues={
              preserved ?? {
                aircraft_type_code: qualification.aircraft_type_code,
                status: qualification.status,
                date_earned: qualification.date_earned ?? "",
                expiry_date: qualification.expiry_date ?? "",
              }
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
