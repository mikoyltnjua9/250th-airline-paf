import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getPilotProfile } from "@/lib/pilots/queries";
import { authorizeEquipment } from "@/app/(dashboard)/personnel/[id]/equipment/actions";
import { parsePreservedValues } from "@/lib/forms/error-redirect";
import { requirePermission } from "@/lib/auth/require-permission";
import { formatIsoDate } from "@/lib/dates";

export default async function AuthorizeEquipmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; values?: string }>;
}) {
  const { id } = await params;
  await requirePermission("qualifications:manage", `/personnel/${id}`);
  const [profile, { error, values }] = await Promise.all([getPilotProfile(id), searchParams]);
  if (!profile) notFound();
  const preserved = parsePreservedValues(values);

  const authorized = new Map(profile.equipmentAuthorizations.map((a) => [a.equipment_code, a]));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Authorize Equipment</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/personnel/${id}`}>Cancel</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {profile.rankLabel} {profile.pilot.full_name}
          </CardTitle>
          <CardDescription>
            Tick the ground equipment this person is authorized to operate and enter the date of the seminar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={authorizeEquipment} className="space-y-6">
            <input type="hidden" name="pilot_id" value={id} />

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Couldn&apos;t save</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="max-w-xs space-y-2">
              <Label htmlFor="seminar_date">Date of seminar</Label>
              <Input
                id="seminar_date"
                name="seminar_date"
                type="date"
                defaultValue={preserved?.seminar_date}
                required
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">Authorized to operate</legend>
              {profile.equipmentTypes.length === 0 && (
                <p className="text-sm text-muted-foreground">No equipment list is set up yet.</p>
              )}
              {profile.equipmentTypes.map((type) => {
                const have = authorized.get(type.code);
                return (
                  <label
                    key={type.code}
                    className="flex items-center gap-3 rounded-lg border p-3 text-sm has-[:disabled]:bg-muted/40 has-[:disabled]:text-muted-foreground"
                  >
                    <input
                      type="checkbox"
                      name="equipment_code"
                      value={type.code}
                      defaultChecked={!!have}
                      disabled={!!have}
                    />
                    <span className="min-w-0 flex-1">{type.label}</span>
                    {have && (
                      <span className="shrink-0 text-xs">
                        Already authorized{have.seminar_date ? ` · ${formatIsoDate(have.seminar_date, { month: "short", day: "numeric", year: "numeric" })}` : ""}
                      </span>
                    )}
                  </label>
                );
              })}
            </fieldset>

            <div className="flex justify-end gap-3 border-t pt-6">
              <Button type="submit">Save authorization</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
