import Link from "next/link";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { NewTenantForm, type VacantUnitOption } from "./new-tenant-form";

export const dynamic = "force-dynamic";

export default async function NewTenantPage() {
  await requireFeature("tenants.manage");
  const supabase = await createClient();

  const { data: units } = await supabase
    .from("units")
    .select("id, unit_number, monthly_rent, properties(name)")
    .eq("status", "vacant")
    .order("unit_number");

  const vacantUnits: VacantUnitOption[] = (units ?? []).map((u) => ({
    id: u.id,
    label: `${(u.properties as { name?: string } | null)?.name ?? "—"} · Unit ${u.unit_number}`,
    monthlyRent: Number(u.monthly_rent),
  }));

  return (
    <>
      <div className="mb-4">
        <Link href="/tenants" className="text-sm text-primary hover:underline">
          ← Tenants
        </Link>
      </div>
      <PageHeader
        title="New tenant"
        description="Capture the full tenant profile and optionally allocate units (TEN-01/02)."
      />
      <div className="mx-auto max-w-3xl">
        <NewTenantForm vacantUnits={vacantUnits} />
      </div>
    </>
  );
}
