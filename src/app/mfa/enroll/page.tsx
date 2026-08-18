"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Crest } from "@/components/crest";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function EnrollMfaPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [qrDataUri, setQrDataUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      setLoading(true);
      setError(null);

      // Clean up any abandoned unverified factor from a previous attempt so
      // we always show a fresh, scannable QR code. (listFactors()'s `totp`
      // bucket only ever contains verified factors — unverified ones only
      // show up in `all`.)
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const stale = existing?.all?.find(
        (f) => f.factor_type === "totp" && f.status === "unverified",
      );
      if (stale) {
        await supabase.auth.mfa.unenroll({ factorId: stale.id });
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `authenticator-${Date.now()}`,
      });

      if (cancelled) return;

      if (enrollError || !data) {
        setError(enrollError?.message ?? "Could not start 2FA enrollment.");
        setLoading(false);
        return;
      }

      setFactorId(data.id);
      setQrDataUri(data.totp.qr_code);
      setSecret(data.totp.secret);
      setLoading(false);
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setVerifying(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (verifyError) {
      setError("That code didn't match. Check the time on your device and try again.");
      setVerifying(false);
      setCode("");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-navy p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-navy-foreground">
          <Crest className="h-12 w-12" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Set up two-factor authentication</CardTitle>
            <CardDescription>
              Required for every account, no exceptions. Scan this with an
              authenticator app (Google Authenticator, Authy, 1Password, etc.).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <Skeleton className="mx-auto h-48 w-48" />
            ) : qrDataUri ? (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- qrDataUri
                    is a data: URI from Supabase, not a static asset next/image can optimize */}
                <img
                  src={qrDataUri}
                  alt="Scan with your authenticator app"
                  className="h-48 w-48 rounded-md border bg-white p-2"
                />
                {secret && (
                  <p className="break-all text-center text-xs text-muted-foreground">
                    Can&apos;t scan the QR code? Type this setup key into your
                    authenticator app instead:{" "}
                    <span className="font-mono">{secret}</span>
                  </p>
                )}
              </div>
            ) : null}

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">6-digit code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  disabled={loading}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={verifying || loading || code.length !== 6 || !factorId}
              >
                {verifying ? "Verifying…" : "Verify & finish setup"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
