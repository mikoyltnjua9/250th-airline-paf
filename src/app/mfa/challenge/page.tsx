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

export default function ChallengeMfaPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;

      if (listError || !data?.totp?.length) {
        setError("No authenticator is set up for this account yet.");
        setLoading(false);
        return;
      }

      // listFactors()'s `totp` bucket only ever contains verified factors.
      setFactorId(data.totp[0].id);
      setLoading(false);
    }

    load();
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
            <CardTitle>Enter your 2FA code</CardTitle>
            <CardDescription>
              Open your authenticator app and enter the current 6-digit code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
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
                  autoFocus
                  disabled={loading}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={verifying || loading || code.length !== 6 || !factorId}
              >
                {verifying ? "Verifying…" : "Verify"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
