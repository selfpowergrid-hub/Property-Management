import { requireTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireTenant();

  const supabase = await createClient();
  const { data: org } = user.orgId
    ? await supabase.from("organisations").select("name").eq("id", user.orgId).maybeSingle()
    : { data: null };

  return (
    <AppShell
      role="tenant"
      orgName={org?.name ?? "Your landlord"}
      userName={user.profile?.full_name ?? user.email ?? "Tenant"}
    >
      {children}
    </AppShell>
  );
}
