import { requireFeature } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireFeature("reports.view");
  return (
    <>
      <PageHeader title="Reports" description="Financial and operational summaries (PRD §6.8)." />
      <EmptyState
        icon="BarChart3"
        title="Reports & financial summaries"
        description="Rent collection, income & expense, arrears aging, occupancy, and maintenance reports — all exportable to PDF/CSV with date filters. Built in Phase 4."
        phase="Module build-out: Phase 4"
      />
    </>
  );
}
