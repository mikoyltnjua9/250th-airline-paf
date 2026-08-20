import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PilotForm } from "@/components/pilots/pilot-form";
import { getPilotProfile, getRanks } from "@/lib/pilots/queries";
import { updatePilot } from "@/app/(dashboard)/personnel/actions";
import { parsePreservedValues } from "@/lib/forms/error-redirect";

export default async function EditPilotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; values?: string }>;
}) {
  const { id } = await params;
  const { error, values } = await searchParams;
  const preserved = parsePreservedValues(values);
  const [profile, ranks] = await Promise.all([getPilotProfile(id), getRanks()]);

  if (!profile) notFound();

  const { pilot, license } = profile;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Edit Pilot</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/personnel/${id}`}>Cancel</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{pilot.full_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <PilotForm
            ranks={ranks}
            action={updatePilot}
            submitLabel="Save changes"
            error={error}
            hiddenFields={{
              pilot_id: pilot.id,
              license_id: license?.id ?? "",
            }}
            defaultValues={
              preserved ?? {
                full_name: pilot.full_name,
                rank_code: pilot.rank_code,
                afsn: pilot.afsn,
                position: pilot.position,
                license_no: license?.license_no ?? "",
                date_issued: license?.date_issued ?? "",
                date_expires: license?.date_expires ?? "",
                status: license?.status ?? "valid",
              }
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
