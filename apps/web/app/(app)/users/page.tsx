import { ROLE_LABELS, STAFF_ROLES, type UserRole } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteForm } from "./invite-form";
import { MemberActions } from "./member-actions";
import { InvitationActions } from "./invitation-actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireFeature("users.manage");
  const supabase = await createClient();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("users").select("id, full_name, email, role").order("created_at"),
    supabase
      .from("user_invitations")
      .select("id, email, role, status, token, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  // Staff only — tenants are managed under Tenants & Leases, not here.
  const staff = (members ?? []).filter((m) => m.role && STAFF_ROLES.includes(m.role as UserRole));

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
              {staff.map((m) => {
                const isSelf = m.id === me.id;
                return (
                  <div key={m.id} className="flex items-center justify-between gap-4 px-6 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.full_name ?? m.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    {isSelf ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="muted">{m.role ? ROLE_LABELS[m.role as UserRole] : "—"}</Badge>
                        <Badge variant="success">You</Badge>
                      </div>
                    ) : (
                      <MemberActions
                        userId={m.id}
                        role={m.role as UserRole}
                        name={m.full_name ?? m.email ?? "this user"}
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {invites && invites.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Pending invitations</CardTitle>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {invites.map((inv) => (
                  <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm">{inv.email}</p>
                      <Badge variant="muted">{ROLE_LABELS[inv.role as UserRole]}</Badge>
                      <Badge variant="warning">Pending</Badge>
                    </div>
                    <InvitationActions id={inv.id} link={`/accept-invite?token=${inv.token}`} />
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
