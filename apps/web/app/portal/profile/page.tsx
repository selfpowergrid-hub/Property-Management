import { requireTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage() {
  const user = await requireTenant();
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("full_name, phone, email, national_id, emergency_contact")
    .eq("user_id", user.id)
    .maybeSingle();

  const rows: [string, string][] = [
    ["Full name", tenant?.full_name ?? user.profile?.full_name ?? "—"],
    ["Phone", tenant?.phone ?? "—"],
    ["Email", tenant?.email ?? user.email ?? "—"],
    ["National ID", tenant?.national_id ?? "—"],
    ["Emergency contact", tenant?.emergency_contact ?? "—"],
  ];

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your contact details (editing arrives with the portal build-out, Phase 4)."
      />
      <Card>
        <CardContent className="divide-y p-0">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-6 py-3 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
