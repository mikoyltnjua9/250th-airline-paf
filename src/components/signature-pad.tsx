"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const WIDTH = 480;
const HEIGHT = 160;

/**
 * Draw-your-signature box for mouse, finger or stylus. The drawing travels
 * with the form as a small PNG in a hidden input named `name`; empty string
 * means "not signed".
 */
export function SignaturePad({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [value, setValue] = useState(defaultValue ?? "");

  // White ground (so the saved PNG reads in print and in dark mode), then any
  // signature already on file.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (defaultValue) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
      img.src = defaultValue;
    }
  }, [defaultValue]);

  function pointFrom(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * WIDTH) / rect.width,
      y: ((e.clientY - rect.top) * HEIGHT) / rect.height,
    };
  }

  function stroke(from: { x: number; y: number }, to: { x: number; y: number }) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointFrom(e);
    lastPoint.current = p;
    stroke(p, { x: p.x + 0.01, y: p.y }); // a tap leaves a dot
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!lastPoint.current) return;
    const p = pointFrom(e);
    stroke(lastPoint.current, p);
    lastPoint.current = p;
  }

  function onPointerUp() {
    if (!lastPoint.current) return;
    lastPoint.current = null;
    if (canvasRef.current) setValue(canvasRef.current.toDataURL("image/png"));
  }

  function clear() {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    setValue("");
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={value} />
      <p className="text-sm font-medium">{label}</p>
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={`${label}: draw your signature here`}
        className="aspect-[3/1] w-full max-w-md cursor-crosshair touch-none rounded-lg border bg-white"
      />
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={clear} disabled={!value}>
          Clear
        </Button>
        <p className="text-xs text-muted-foreground">
          {value ? "Signed. Clear to sign again." : "Sign in the box above with a mouse, finger or stylus."}
        </p>
      </div>
    </div>
  );
}
