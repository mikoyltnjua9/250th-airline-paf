import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type StanevalFormDefaults = Partial<{
  eval_date: string;
  status: string;
  grading: string;
  next_due_date: string;
}>;

export function StanevalForm({
  action,
  submitLabel,
  defaultValues,
  hiddenFields,
  error,
}: {
  action: (formData: FormData) => void;
  submitLabel: string;
  defaultValues?: StanevalFormDefaults;
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
          <Label htmlFor="eval_date">Evaluation date</Label>
          <Input
            id="eval_date"
            name="eval_date"
            type="date"
            defaultValue={defaultValues?.eval_date}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Result</Label>
          <NativeSelect id="status" name="status" defaultValue={defaultValues?.status ?? "pass"} required>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </NativeSelect>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="grading">Grading</Label>
          <Input
            id="grading"
            name="grading"
            placeholder="e.g. Highly Proficient, Qualified, Below Standard"
            defaultValue={defaultValues?.grading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="next_due_date">Next due date</Label>
          <Input
            id="next_due_date"
            name="next_due_date"
            type="date"
            defaultValue={defaultValues?.next_due_date}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
