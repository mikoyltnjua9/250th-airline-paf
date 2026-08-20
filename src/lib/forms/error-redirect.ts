import { redirect } from "next/navigation";

/**
 * Redirects back to a form with an error message AND the values the user
 * had just submitted, so a failed save (validation or a DB constraint like
 * a duplicate AFSN/license number) doesn't wipe out everything they typed.
 * The submitted FormData is round-tripped as-is via a `values` query param;
 * the corresponding page reads it back with `parsePreservedValues` and
 * feeds it into the form as `defaultValues`.
 */
export function redirectWithFormError(path: string, error: string, formData: FormData): never {
  const params = new URLSearchParams();
  params.set("error", error);
  params.set("values", JSON.stringify(Object.fromEntries(formData)));
  redirect(`${path}?${params.toString()}`);
}

/** Parses the `values` query param `redirectWithFormError` left behind, if any. */
export function parsePreservedValues(values?: string): Record<string, string> | undefined {
  if (!values) return undefined;
  try {
    return JSON.parse(values);
  } catch {
    return undefined;
  }
}
