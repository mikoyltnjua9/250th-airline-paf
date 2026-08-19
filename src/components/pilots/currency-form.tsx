import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function CurrencyForm({
  action,
  error,
  hiddenFields,
  defaultValues,
}: {
  action: (formData: FormData) => void;
  error?: string;
  hiddenFields: Record<string, string>;
  defaultValues?: Partial<{ last_date: string; validity_days: string }>;
}) {
  return (
    <form action={action} className="space-y-6">
      {Object.entries(hiddenFields).map(([name, value]) => (
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
          <Label htmlFor="last_date">Last date</Label>
          <Input
            id="last_date"
            name="last_date"
            type="date"
            defaultValue={defaultValues?.last_date}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="validity_days">Validity window (days)</Label>
          <Input
            id="validity_days"
            name="validity_days"
            type="number"
            min={1}
            step={1}
            defaultValue={defaultValues?.validity_days}
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
