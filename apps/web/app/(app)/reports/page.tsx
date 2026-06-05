import Link from "next/link";
import { REPORTS } from "@/lib/reports";
import { requireFeature } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/icon";

export const dynamic = "force-dynamic";

const ICON: Record<string, string> = {
  "rent-collection": "Receipt",
  "income-expense": "Wallet",
  arrears: "Users",
  occupancy: "Building2",
  maintenance: "Wrench",
};

export default async function ReportsPage() {
  await requireFeature("reports.view");

  return (
    <>
      <PageHeader title="Reports" description="Financial and operational summaries (PRD §6.8)." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(REPORTS).map(([slug, r]) => (
          <Link key={slug} href={`/reports/${slug}`}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <Icon name={ICON[slug] ?? "BarChart3"} className="h-5 w-5 text-primary" />
                </span>
                <CardTitle>{r.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{r.description}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
