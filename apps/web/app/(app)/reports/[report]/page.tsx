import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@nyumba360/shared";
import { REPORTS, defaultRange, type ReportRange } from "@/lib/reports";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangeFilter } from "@/components/date-range-filter";

export const dynamic = "force-dynamic";

function resolveRange(searchParams: { from?: string; to?: string }): ReportRange {
  const d = defaultRange();
  return { from: searchParams.from || d.from, to: searchParams.to || d.to };
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: { report: string };
  searchParams: { from?: string; to?: string };
}) {
  const me = await requireFeature("reports.view");
  const report = REPORTS[params.report];
  if (!report) notFound();

  const range = resolveRange(searchParams);
  const supabase = await createClient();
  const table = await report.build(supabase, range);
  const canExport = can(me.role!, "data.export");
  const qs = `from=${range.from}&to=${range.to}`;

  return (
    <>
      <div className="mb-4">
        <Link href="/reports" className="text-sm text-primary hover:underline">
          ← Reports
        </Link>
      </div>
      <PageHeader
        title={table.title}
        description={report.description}
        action={
          canExport ? (
            <div className="flex gap-2">
              <a href={`/reports/${params.report}/export?format=pdf&${qs}`} target="_blank" rel="noreferrer">
                <Button variant="outline">Export PDF</Button>
              </a>
              <a href={`/reports/${params.report}/export?format=csv&${qs}`}>
                <Button variant="outline">Export CSV</Button>
              </a>
            </div>
          ) : undefined
        }
      />

      <div className="mb-4">
        <DateRangeFilter from={range.from} to={range.to} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {table.summary.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {table.columns.map((c) => (
                  <TableHead key={c}>{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j} className={j === 0 ? "font-medium" : ""}>
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {table.rows.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={table.columns.length}>
                    No data in this date range.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
