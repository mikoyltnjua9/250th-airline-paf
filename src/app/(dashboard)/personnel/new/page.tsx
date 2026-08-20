import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PilotForm } from "@/components/pilots/pilot-form";
import { getRanks } from "@/lib/pilots/queries";
import { createPilot } from "@/app/(dashboard)/personnel/actions";
import { parsePreservedValues } from "@/lib/forms/error-redirect";

export default async function NewPilotPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; values?: string }>;
}) {
  const [ranks, { error, values }] = await Promise.all([getRanks(), searchParams]);
  const preserved = parsePreservedValues(values);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Add Pilot</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/personnel">Cancel</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New pilot record</CardTitle>
        </CardHeader>
        <CardContent>
          <PilotForm
            ranks={ranks}
            action={createPilot}
            submitLabel="Create pilot"
            error={error}
            defaultValues={preserved}
          />
        </CardContent>
      </Card>
    </div>
  );
}
