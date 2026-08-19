import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type RoleRow = { code: string; label: string };

export async function getRoles(): Promise<RoleRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("roles").select("code, label").order("code");
  if (error) throw error;
  return data ?? [];
}

export type AccountRow = {
  id: string;
  fullName: string;
  email: string | undefined;
  roleCode: string;
  createdAt: string;
};

export async function getAccounts(): Promise<AccountRow[]> {
  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, role_code, created_at")
    .order("full_name");
  if (error) throw error;

  // Email lives on auth.users, not profiles — PostgREST has no way to join
  // across schemas, so this needs the admin client and a manual merge.
  const admin = createAdminClient();
  const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (usersError) throw usersError;

  const emailById = new Map(usersData.users.map((u) => [u.id, u.email]));

  return (profiles ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    email: emailById.get(p.id),
    roleCode: p.role_code,
    createdAt: p.created_at,
  }));
}

export type AuditLogRow = {
  id: number;
  tableName: string;
  recordId: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedByName: string;
  changedAt: string;
};

export async function getAuditLog(limit = 100): Promise<AuditLogRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, table_name, record_id, field_changed, old_value, new_value, changed_by, changed_at")
    .order("changed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = data ?? [];

  // audit_log.changed_by references auth.users(id) directly, not
  // public.profiles(id) -- no FK PostgREST can follow for an embedded
  // select, so resolve names with a second query instead.
  const changedByIds = [...new Set(rows.map((r) => r.changed_by).filter((id): id is string => !!id))];

  let namesById = new Map<string, string>();
  if (changedByIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", changedByIds);
    if (profilesError) throw profilesError;
    namesById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  }

  return rows.map((row) => ({
    id: row.id,
    tableName: row.table_name,
    recordId: row.record_id,
    fieldChanged: row.field_changed,
    oldValue: row.old_value,
    newValue: row.new_value,
    changedByName: row.changed_by
      ? (namesById.get(row.changed_by) ?? "Deleted account")
      : "System / seed data",
    changedAt: row.changed_at,
  }));
}
