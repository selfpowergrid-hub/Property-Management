import type { NextRequest } from "next/server";
import { can } from "@nyumba360/shared";
import { REPORTS, defaultRange } from "@/lib/reports";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";
import { renderReport } from "@/lib/report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { report: string } }) {
  const me = await getCurrentUser();
  if (!me?.role || !can(me.role, "data.export")) return new Response("Forbidden", { status: 403 });

  const report = REPORTS[params.report];
  if (!report) return new Response("Unknown report", { status: 404 });

  const d = defaultRange();
  const sp = req.nextUrl.searchParams;
  const range = { from: sp.get("from") || d.from, to: sp.get("to") || d.to };
  const format = sp.get("format") === "pdf" ? "pdf" : "csv";

  const supabase = await createClient();
  const table = await report.build(supabase, range);
  const stem = `${params.report}-${range.from}_${range.to}`;

  if (format === "csv") {
    return csvResponse(`${stem}.csv`, toCsv(table.columns, table.rows));
  }

  const { data: org } = await supabase.from("organisations").select("name").eq("id", me.orgId!).maybeSingle();
  const pdf = await renderReport(table, range, org?.name ?? "Nyumba360");
  return new Response(new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${stem}.pdf"`,
    },
  });
}
