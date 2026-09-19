import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { APE_CLASSIFICATIONS } from "@/lib/types/pilot";

export type ApeFormDefaults = Partial<{
  last_ape_date: string;
  next_due_date: string;
  fit_to_fly: string;
  classification: string;
}>;

export function ApeForm({
  action,
  submitLabel,
  defaultValues,
  hiddenFields,
  error,
}: {
  action: (formData: FormData) => void;
  submitLabel: string;
  defaultValues?: ApeFormDefaults;
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
          <Label htmlFor="last_ape_date">Last APE date</Label>
          <Input
            id="last_ape_date"
            name="last_ape_date"
            type="date"
            defaultValue={defaultValues?.last_ape_date}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="next_due_date">Next due date</Label>
          <Input
            id="next_due_date"
            name="next_due_date"
            type="date"
            defaultValue={defaultValues?.next_due_date}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fit_to_fly">Result</Label>
          <NativeSelect
            id="fit_to_fly"
            name="fit_to_fly"
            defaultValue={defaultValues?.fit_to_fly ?? "true"}
            required
          >
            <option value="true">Fit to Fly</option>
            <option value="false">Not Fit to Fly</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="classification">Classification</Label>
          <NativeSelect
            id="classification"
            name="classification"
            defaultValue={defaultValues?.classification ?? ""}
          >
            <option value="">Not specified</option>
            {/* A stored value outside P1-P3 (older free-text entries) is
                shown rather than silently dropped on the next save. */}
            {defaultValues?.classification &&
              !(APE_CLASSIFICATIONS as readonly string[]).includes(defaultValues.classification) && (
                <option value={defaultValues.classification}>
                  {defaultValues.classification} (unrecognized — please update)
                </option>
              )}
            {APE_CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
