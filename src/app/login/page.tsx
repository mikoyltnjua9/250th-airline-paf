import { Crest } from "@/components/crest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const { error, reason } = await searchParams;

  return (
    <div className="flex min-h-svh items-center justify-center bg-navy p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-navy-foreground">
          <Crest className="h-16 w-16" />
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-gold">
              250th Presidential Airlift Wing
            </p>
            <h1 className="text-lg font-semibold">Wing Safety Dashboard</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Authorized personnel only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reason === "timeout" && (
              <Alert>
                <AlertTitle>Signed out</AlertTitle>
                <AlertDescription>
                  You were signed out after 15 minutes of inactivity.
                </AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Sign-in failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form action={login} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="username" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-navy-foreground/70">
          No self-service sign-up. Accounts are created by a super admin.
        </p>
      </div>
    </div>
  );
}
