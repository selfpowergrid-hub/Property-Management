import { daysBetween, can } from "@nyumba360/shared";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: string | number | null | undefined): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

// Vacancy report CSV (VAC-04).
export async function GET() {
  const me = await getCurrentUser();
  if (!me?.role || !can(me.role, "data.export")) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = await createClient();
  const { data: vacant } = await supabase
    .from("units")
    .select("unit_number, type, monthly_rent, listed, updated_at, properties(name)")
    .eq("status", "vacant")
    .order("updated_at", { ascending: true });

  const header = ["Property", "Unit", "Type", "Monthly rent (KES)", "Listed", "Days vacant"];
  const rows = (vacant ?? []).map((u) =>
    [
      (u.properties as { name?: string } | null)?.name ?? "",
      u.unit_number,
      u.type ?? "",
      Number(u.monthly_rent).toFixed(2),
      u.listed ? "Yes" : "No",
      String(daysBetween(u.updated_at)),
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = [header.map(csvCell).join(","), ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vacancies-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
