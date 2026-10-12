import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CurrencyForm } from "@/components/pilots/currency-form";
import { getPilotProfile, getCurrencyItem } from "@/lib/pilots/queries";
import { upsertCurrencyItem } from "@/app/(dashboard)/personnel/[id]/currency/actions";
import { CURRENCY_ITEM_LABELS, type CurrencyItemType } from "@/lib/types/pilot";
import { parsePreservedValues } from "@/lib/forms/error-redirect";

const VALID_ITEM_TYPES = Object.keys(CURRENCY_ITEM_LABELS) as CurrencyItemType[];

export default async function CurrencyItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; itemType: string }>;
  searchParams: Promise<{ error?: string; values?: string; aircraft?: string }>;
}) {
  const { id, itemType } = await params;
  const { error, values, aircraft } = await searchParams;
  const preserved = parsePreservedValues(values);
  // After a failed save the aircraft comes back with the preserved values.
  const aircraftCode = (aircraft ?? preserved?.aircraft_type_code ?? "") || null;

  if (!VALID_ITEM_TYPES.includes(itemType as CurrencyItemType)) notFound();
  const validItemType = itemType as CurrencyItemType;

  const [profile, item] = await Promise.all([
    getPilotProfile(id),
    getCurrencyItem(id, validItemType, aircraftCode),
  ]);

  if (!profile) notFound();
  const aircraftLabel = aircraftCode
    ? (profile.qualifications.find((q) => q.aircraft_type_code === aircraftCode)?.aircraft_types?.label ??
      aircraftCode)
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {CURRENCY_ITEM_LABELS[validItemType]}
          {aircraftLabel ? ` — ${aircraftLabel}` : ""}
        </h1>
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
          <CurrencyForm
            action={upsertCurrencyItem}
            error={error}
            hiddenFields={{
              pilot_id: id,
              item_type: validItemType,
              aircraft_type_code: aircraftCode ?? "",
            }}
            defaultValues={
              preserved ??
              (item
                ? {
                    last_date: item.last_date,
                    validity_days: String(item.validity_days),
                  }
                : undefined)
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
