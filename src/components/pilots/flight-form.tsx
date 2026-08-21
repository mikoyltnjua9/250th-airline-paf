import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { AircraftType } from "@/lib/types/pilot";

export type FlightFormDefaults = Partial<{
  flight_date: string;
  aircraft_type_code: string;
  route: string;
  duty: string;
  flying_time_hours: string;
}>;

export function FlightForm({
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
  defaultValues?: FlightFormDefaults;
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
          <Label htmlFor="flight_date">Flight date</Label>
          <Input
            id="flight_date"
            name="flight_date"
            type="date"
            defaultValue={defaultValues?.flight_date}
            required
          />
        </div>
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
          <Label htmlFor="route">Route</Label>
          <Input
            id="route"
            name="route"
            placeholder="e.g. MNL–CEB–MNL"
            defaultValue={defaultValues?.route}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duty">Duty</Label>
          <NativeSelect id="duty" name="duty" defaultValue={defaultValues?.duty ?? "PIC"} required>
            <option value="PIC">PIC</option>
            <option value="SIC">SIC</option>
            <option value="IP">IP</option>
            <option value="Student">Student</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="flying_time_hours">Flying time (hours)</Label>
          <Input
            id="flying_time_hours"
            name="flying_time_hours"
            type="number"
            min={0.1}
            step={0.1}
            defaultValue={defaultValues?.flying_time_hours}
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
