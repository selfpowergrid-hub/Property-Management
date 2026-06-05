import { enumLabel, formatDate, can } from "@nyumba360/shared";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

// CSV export of expenses for the accountant (EXP-05).
export async function GET() {
  const me = await getCurrentUser();
  if (!me?.role || !can(me.role, "data.export")) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = await createClient();
  const { data: expenses } = await supabase
    .from("expenses")
    .select("date, category, amount, description, properties(name)")
    .order("date", { ascending: false });

  const header = ["Date", "Property", "Category", "Description", "Amount (KES)"];
  const rows = (expenses ?? []).map((e) =>
    [
      formatDate(e.date),
      (e.properties as { name?: string } | null)?.name ?? "",
      enumLabel(e.category),
      e.description ?? "",
      Number(e.amount).toFixed(2),
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = [header.map(csvCell).join(","), ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expenses-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
