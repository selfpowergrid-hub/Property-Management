import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organisations")
    .select("name, logo_path")
    .eq("id", user.orgId!)
    .maybeSingle();

  const logoUrl = org?.logo_path
    ? supabase.storage.from("org-logos").getPublicUrl(org.logo_path).data.publicUrl
    : null;

  return (
    <AppShell
      role={user.role!}
      orgName={org?.name ?? "Your organisation"}
      userName={user.profile?.full_name ?? user.email ?? "User"}
      logoUrl={logoUrl}
    >
      {children}
    </AppShell>
  );
}
