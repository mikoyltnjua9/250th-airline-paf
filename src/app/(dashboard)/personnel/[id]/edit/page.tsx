import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PilotForm } from "@/components/pilots/pilot-form";
import { getPilotProfile, getRanks, getUnitSuggestions } from "@/lib/pilots/queries";
import { updatePilot } from "@/app/(dashboard)/personnel/actions";
import { parsePreservedValues } from "@/lib/forms/error-redirect";
import { requirePermission } from "@/lib/auth/require-permission";
import { getCurrentProfile } from "@/lib/auth/get-profile";

export default async function EditPilotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; values?: string }>;
}) {
  const { id } = await params;
  await requirePermission("pilots:manage", `/personnel/${id}`);
  const { error, values } = await searchParams;
  const preserved = parsePreservedValues(values);
  const [profile, ranks, unitSuggestions, me] = await Promise.all([
    getPilotProfile(id),
    getRanks(),
    getUnitSuggestions(),
    getCurrentProfile(),
  ]);

  if (!profile) notFound();

  const { pilot } = profile;

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
            unitSuggestions={unitSuggestions}
            lockedUnit={me?.role_code === "unit_admin" ? me.unit : null}
            action={updatePilot}
            submitLabel="Save changes"
            error={error}
            hiddenFields={{ pilot_id: pilot.id }}
            defaultValues={
              preserved ?? {
                full_name: pilot.full_name,
                rank_code: pilot.rank_code,
                afsn: pilot.afsn,
                position: pilot.position,
                fit_to_fly: String(pilot.fit_to_fly),
                skill_level: pilot.skill_level ?? "",
                contact_phone: pilot.contact_phone ?? "",
                contact_email: pilot.contact_email ?? "",
                designation: pilot.designation ?? "",
                unit_section: pilot.unit_section ?? "",
              }
            }
            currentPhotoUrl={pilot.photo_url}
          />
        </CardContent>
      </Card>
    </div>
  );
}
