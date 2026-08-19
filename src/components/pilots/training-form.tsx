import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type TrainingFormDefaults = Partial<{
  training_type: string;
  status: string;
  training_date: string;
}>;

export function TrainingForm({
  action,
  submitLabel,
  defaultValues,
  hiddenFields,
  error,
}: {
  action: (formData: FormData) => void;
  submitLabel: string;
  defaultValues?: TrainingFormDefaults;
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
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="training_type">Training type</Label>
          <Input
            id="training_type"
            name="training_type"
            placeholder="e.g. Recurrent Training, CRM Training, Safety Seminar"
            defaultValue={defaultValues?.training_type}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "scheduled"}
            required
          >
            <option value="completed">Completed</option>
            <option value="scheduled">Scheduled</option>
            <option value="overdue">Overdue</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="training_date">Date</Label>
          <Input
            id="training_date"
            name="training_date"
            type="date"
            defaultValue={defaultValues?.training_date}
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
