import { ROLE_LABELS, type UserRole } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteForm } from "./invite-form";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireFeature("users.manage");
  const supabase = await createClient();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("users").select("id, full_name, email, role").order("created_at"),
    supabase
      .from("user_invitations")
      .select("id, email, role, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader title="Users & Roles" description="Invite staff and manage access (PRD §6.1 AUTH-04)." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team members</CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {(members ?? []).map((m) => (
                <div key={m.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium">{m.full_name ?? m.email}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <Badge variant="muted">{m.role ? ROLE_LABELS[m.role as UserRole] : "—"}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {invites && invites.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Pending invitations</CardTitle>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {invites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between px-6 py-3">
                    <p className="text-sm">{inv.email}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="muted">{ROLE_LABELS[inv.role as UserRole]}</Badge>
                      <Badge variant="warning">Pending</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <InviteForm />
      </div>
    </>
  );
}
