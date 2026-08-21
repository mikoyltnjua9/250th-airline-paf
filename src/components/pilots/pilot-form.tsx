import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { POSITIONS, type Rank } from "@/lib/types/pilot";

export type PilotFormDefaults = Partial<{
  full_name: string;
  rank_code: string;
  afsn: string;
  position: string;
  fit_to_fly: string;
}>;

export function PilotForm({
  ranks,
  action,
  submitLabel,
  defaultValues,
  hiddenFields,
  error,
}: {
  ranks: Rank[];
  action: (formData: FormData) => void;
  submitLabel: string;
  defaultValues?: PilotFormDefaults;
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

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Personal Info</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" defaultValue={defaultValues?.full_name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rank_code">Rank</Label>
            <NativeSelect id="rank_code" name="rank_code" defaultValue={defaultValues?.rank_code ?? ""} required>
              <option value="" disabled>
                Select rank
              </option>
              {ranks.map((rank) => (
                <option key={rank.code} value={rank.code}>
                  {rank.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="afsn">AFSN</Label>
            <Input id="afsn" name="afsn" defaultValue={defaultValues?.afsn} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <NativeSelect
              id="position"
              name="position"
              defaultValue={defaultValues?.position ?? "Fixed-Wing Pilot"}
              required
            >
              {POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fit_to_fly">Fitness</Label>
            <NativeSelect
              id="fit_to_fly"
              name="fit_to_fly"
              defaultValue={defaultValues?.fit_to_fly ?? "true"}
              required
            >
              <option value="true">Fit to Fly</option>
              <option value="false">Unfit to Fly</option>
            </NativeSelect>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
