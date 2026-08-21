"use client";

import { useState, useTransition } from "react";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];

/**
 * A button that opens a confirmation dialog before running a server action.
 * Shared by every delete/deactivate control in the app (record deletes,
 * account deletes, pilot deactivation) so the confirm-before-destructive-
 * action pattern stays identical everywhere instead of drifting per screen.
 */
export function ConfirmActionButton({
  onConfirm,
  triggerLabel,
  title,
  description,
  confirmLabel,
  triggerVariant = "ghost",
  triggerSize = "sm",
  confirmVariant = "destructive",
}: {
  /** Server action to run on confirm, already bound to its record's id(s)
   * via .bind() at the call site (Server Component parents can pass a
   * bound server action as a prop; this is the supported pattern for
   * parameterized actions triggered from a Client Component). */
  onConfirm: () => Promise<void>;
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: "sm" | "xs" | "default";
  confirmVariant?: ButtonVariant;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        onClick={(e) => {
          // Safe to nest inside a whole-row <Link> (e.g. mobile flight
          // cards) -- without this, the same click that opens the dialog
          // would also fire the row's navigation underneath it.
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmVariant}
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await onConfirm();
                  setOpen(false);
                })
              }
            >
              {isPending ? "Working…" : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
