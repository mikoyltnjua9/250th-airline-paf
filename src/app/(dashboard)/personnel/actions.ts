"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { redirectWithFormError } from "@/lib/forms/error-redirect";
import { POSITIONS, SKILL_LEVELS } from "@/lib/types/pilot";
import { flash } from "@/lib/flash";

const pilotFormSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required"),
  rank_code: z.string().trim().min(1, "Rank is required"),
  afsn: z.string().trim().min(1, "AFSN is required"),
  position: z.enum(POSITIONS),
  fit_to_fly: z.enum(["true", "false"]).transform((v) => v === "true"),
  skill_level: z
    .enum(["", ...SKILL_LEVELS])
    .optional()
    .transform((v) => v || null),
  unit_section: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
  designation: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
  contact_phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
  contact_email: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || z.string().email().safeParse(v).success, {
      message: "Contact email must be a valid email address.",
    }),
});

/**
 * A Unit Admin only ever works inside their own unit, whatever the form says
 * (the database enforces it too; this keeps the saved value tidy).
 */
async function withAccountUnit<T extends { unit_section: string | null }>(data: T): Promise<T> {
  const me = await getCurrentProfile();
  return me?.role_code === "unit_admin" ? { ...data, unit_section: me.unit } : data;
}

function friendlyDbError(message: string): string {
  if (message.includes("afsn")) return "That AFSN is already in use by another pilot.";
  return message;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function validatePhoto(file: File): string | null {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return "Photo must be a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return "Photo must be smaller than 5MB.";
  }
  return null;
}

/** Uploads to a fresh path every time (pilotId-timestamp) rather than
 * overwriting the same path -- simplest way to avoid a stale cached image
 * showing after a re-upload. Old files are left behind uncleaned; storage
 * cost is negligible at this scale. */
async function uploadPilotPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pilotId: string,
  file: File,
): Promise<string | null> {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${pilotId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("pilot-photos")
    .upload(path, file, { contentType: file.type });
  if (error) return null;
  const { data } = supabase.storage.from("pilot-photos").getPublicUrl(path);
  return data.publicUrl;
}

export async function createPilot(formData: FormData) {
  const parsed = pilotFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirectWithFormError(
      "/personnel/new",
      parsed.error.issues[0]?.message ?? "Invalid input.",
      formData,
    );
  }

  const photo = formData.get("photo");
  const photoFile = photo instanceof File && photo.size > 0 ? photo : null;
  if (photoFile) {
    const photoError = validatePhoto(photoFile);
    if (photoError) {
      redirectWithFormError("/personnel/new", photoError, formData);
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pilot, error: pilotError } = await supabase
    .from("pilots")
    .insert({
      ...(await withAccountUnit(parsed.data)),
      created_by: user?.id,
      updated_by: user?.id,
    })
    .select()
    .single();

  if (pilotError) {
    redirectWithFormError("/personnel/new", friendlyDbError(pilotError.message), formData);
  }

  if (photoFile) {
    const url = await uploadPilotPhoto(supabase, pilot.id, photoFile);
    if (url) {
      await supabase.from("pilots").update({ photo_url: url }).eq("id", pilot.id);
    }
  }

  await flash("Personnel record created");

  revalidatePath("/personnel");
  redirect(`/personnel/${pilot.id}`);
}

export async function updatePilot(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");

  const parsed = pilotFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirectWithFormError(
      `/personnel/${pilotId}/edit`,
      parsed.error.issues[0]?.message ?? "Invalid input.",
      formData,
    );
  }

  const photo = formData.get("photo");
  const photoFile = photo instanceof File && photo.size > 0 ? photo : null;
  if (photoFile) {
    const photoError = validatePhoto(photoFile);
    if (photoError) {
      redirectWithFormError(`/personnel/${pilotId}/edit`, photoError, formData);
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: pilotError } = await supabase
    .from("pilots")
    .update({ ...(await withAccountUnit(parsed.data)), updated_by: user?.id })
    .eq("id", pilotId);

  if (pilotError) {
    redirectWithFormError(`/personnel/${pilotId}/edit`, friendlyDbError(pilotError.message), formData);
  }

  if (photoFile) {
    const url = await uploadPilotPhoto(supabase, pilotId, photoFile);
    if (url) {
      await supabase.from("pilots").update({ photo_url: url }).eq("id", pilotId);
    }
  }

  await flash("Changes saved");

  revalidatePath("/personnel");
  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}

export async function deactivatePilot(pilotId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("pilots")
    .update({ active: false, updated_by: user?.id })
    .eq("id", pilotId);
  if (error) throw error;
  await flash("Personnel deactivated");
  revalidatePath("/personnel");
  revalidatePath(`/personnel/${pilotId}`);
}

export async function reactivatePilot(pilotId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("pilots")
    .update({ active: true, updated_by: user?.id })
    .eq("id", pilotId);
  if (error) throw error;
  await flash("Personnel reactivated");
  revalidatePath("/personnel");
  revalidatePath(`/personnel/${pilotId}`);
}
