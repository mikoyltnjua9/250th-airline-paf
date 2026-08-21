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
  license_no: string;
  date_issued: string;
  date_expires: string;
  status: string;
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
        </div>
      </div>

      <div className="space-y-4 border-t pt-6">
        <h3 className="text-sm font-semibold text-muted-foreground">License</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="license_no">License number</Label>
            <Input id="license_no" name="license_no" defaultValue={defaultValues?.license_no} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <NativeSelect id="status" name="status" defaultValue={defaultValues?.status ?? "valid"} required>
              <option value="valid">Valid</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
              <option value="suspended">Suspended</option>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_issued">Date issued</Label>
            <Input
              id="date_issued"
              name="date_issued"
              type="date"
              defaultValue={defaultValues?.date_issued}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_expires">Date expires</Label>
            <Input
              id="date_expires"
              name="date_expires"
              type="date"
              defaultValue={defaultValues?.date_expires}
              required
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
