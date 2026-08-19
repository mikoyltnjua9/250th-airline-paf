import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlightForm } from "@/components/pilots/flight-form";
import { getPilotProfile, getAircraftTypes } from "@/lib/pilots/queries";
import { createFlight } from "@/app/(dashboard)/personnel/[id]/flights/actions";

export default async function NewFlightPage({
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
        <h1 className="text-2xl font-semibold tracking-tight">New Flight</h1>
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
          <FlightForm
            aircraftTypes={aircraftTypes}
            action={createFlight}
            submitLabel="Save flight"
            error={error}
            hiddenFields={{ pilot_id: id }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
