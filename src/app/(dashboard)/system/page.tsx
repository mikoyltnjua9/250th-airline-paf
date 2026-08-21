import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewAccountForm } from "@/components/system/new-account-form";
import { AccountsList } from "@/components/system/accounts-list";
import { AuditLogTable } from "@/components/system/audit-log-table";
import { getAccounts, getAuditLog, getRoles } from "@/lib/system/queries";

export default async function SystemManagementPage() {
  const [accounts, roles, auditLog] = await Promise.all([
    getAccounts(),
    getRoles(),
    getAuditLog(100),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System Management</h1>
        <p className="text-muted-foreground">Accounts and the safety-critical change history.</p>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="audit-log">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Account</CardTitle>
              <CardDescription>
                No self-service sign-up — every account is created here. The new user is
                required to set up 2FA the first time they sign in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NewAccountForm roles={roles} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Accounts</CardTitle>
              <CardDescription>{accounts.length} account(s).</CardDescription>
            </CardHeader>
            <CardContent>
              <AccountsList accounts={accounts} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-log" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>
                Every change to a safety-critical field (pilot fitness, qualifications, APE,
                StanEval), most recent first. Showing up to 100 entries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogTable rows={auditLog} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
