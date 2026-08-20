import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlightForm } from "@/components/pilots/flight-form";
import { getPilotProfile, getFlight, getAircraftTypes } from "@/lib/pilots/queries";
import { updateFlight } from "@/app/(dashboard)/personnel/[id]/flights/actions";
import { parsePreservedValues } from "@/lib/forms/error-redirect";

export default async function EditFlightPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; flightId: string }>;
  searchParams: Promise<{ error?: string; values?: string }>;
}) {
  const { id, flightId } = await params;
  const [profile, flight, aircraftTypes, { error, values }] = await Promise.all([
    getPilotProfile(id),
    getFlight(id, flightId),
    getAircraftTypes(),
    searchParams,
  ]);
  const preserved = parsePreservedValues(values);

  if (!profile || !flight) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Edit Flight</h1>
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
            action={updateFlight}
            submitLabel="Save changes"
            error={error}
            hiddenFields={{ pilot_id: id, flight_id: flightId }}
            defaultValues={
              preserved ?? {
                flight_date: flight.flight_date,
                aircraft_type_code: flight.aircraft_type_code,
                route: flight.route ?? "",
                duty: flight.duty,
                flying_time_hours: String(flight.flying_time_hours),
                block_time_hours:
                  flight.block_time_hours != null ? String(flight.block_time_hours) : "",
              }
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
