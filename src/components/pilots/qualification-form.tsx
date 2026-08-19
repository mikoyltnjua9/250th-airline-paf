import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { AircraftType } from "@/lib/types/pilot";

export type QualificationFormDefaults = Partial<{
  aircraft_type_code: string;
  status: string;
  date_earned: string;
  expiry_date: string;
}>;

export function QualificationForm({
  aircraftTypes,
  action,
  submitLabel,
  defaultValues,
  hiddenFields,
  error,
}: {
  aircraftTypes: AircraftType[];
  action: (formData: FormData) => void;
  submitLabel: string;
  defaultValues?: QualificationFormDefaults;
  hiddenFields?: Record<string, string>;
  error?: string;
}) {
  return (
    <form action={action} className="space-y-6">
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="aircraft_type_code">Aircraft type</Label>
          <NativeSelect
            id="aircraft_type_code"
            name="aircraft_type_code"
            defaultValue={defaultValues?.aircraft_type_code ?? ""}
            required
          >
            <option value="" disabled>
              Select aircraft type
            </option>
            {aircraftTypes.map((type) => (
              <option key={type.code} value={type.code}>
                {type.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "in_training"}
            required
          >
            <option value="current">Current</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="in_training">In Training</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_earned">Date earned</Label>
          <Input
            id="date_earned"
            name="date_earned"
            type="date"
            defaultValue={defaultValues?.date_earned}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiry_date">Expiry date</Label>
          <Input
            id="expiry_date"
            name="expiry_date"
            type="date"
            defaultValue={defaultValues?.expiry_date}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
