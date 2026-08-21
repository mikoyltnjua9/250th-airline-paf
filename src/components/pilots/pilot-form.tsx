import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PilotAvatar } from "@/components/pilots/pilot-avatar";
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
  currentPhotoUrl,
}: {
  ranks: Rank[];
  action: (formData: FormData) => void;
  submitLabel: string;
  defaultValues?: PilotFormDefaults;
  hiddenFields?: Record<string, string>;
  error?: string;
  /** Existing photo, for the preview thumbnail on Edit. File inputs can't
   * be pre-filled with a value for security reasons, so this is a display-
   * only prop, separate from defaultValues. */
  currentPhotoUrl?: string | null;
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
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="photo">Photo</Label>
            <div className="flex items-center gap-3">
              {currentPhotoUrl && (
                <PilotAvatar
                  fullName={defaultValues?.full_name ?? ""}
                  photoUrl={currentPhotoUrl}
                  className="h-12 w-12"
                />
              )}
              <Input
                id="photo"
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="max-w-xs"
              />
            </div>
            {currentPhotoUrl && (
              <p className="text-xs text-muted-foreground">
                Choose a new file to replace the current photo, or leave blank to keep it.
              </p>
            )}
          </div>
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
              {/* If the stored value predates this dropdown (e.g. the old
                  free-text "Pilot" default) it won't match any option below.
                  Surface it explicitly instead of letting the browser
                  silently fall back to the first option -- that would save
                  the wrong value the moment this form is submitted without
                  someone noticing and re-selecting the real position. */}
              {defaultValues?.position && !(POSITIONS as readonly string[]).includes(defaultValues.position) && (
                <option value={defaultValues.position}>{defaultValues.position} (unrecognized — please update)</option>
              )}
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
