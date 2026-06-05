import { enumLabel, formatDate } from "@nyumba360/shared";
import { requireTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { submitMaintenanceAction } from "@/app/actions/maintenance";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog, Field } from "@/components/form-dialog";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function PortalMaintenancePage() {
  await requireTenant();
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("maintenance_requests")
    .select("id, category, description, status, created_at")
    .order("created_at", { ascending: false });

  const newRequestDialog = (
    <FormDialog
      trigger={<Button>New request</Button>}
      title="Submit a maintenance request"
      description="Describe the issue. You can attach a photo (MNT-01)."
      action={submitMaintenanceAction}
      submitLabel="Submit request"
    >
      <Field label="Category" htmlFor="category">
        <Input id="category" name="category" placeholder="Plumbing, Electrical, Other…" required />
      </Field>
      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" placeholder="What's the problem?" required />
      </Field>
      <Field label="Photo" htmlFor="file" hint="Optional">
        <Input id="file" name="file" type="file" accept="image/*" />
      </Field>
    </FormDialog>
  );

  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Submit and track repair requests (PRD §7.1)."
        action={newRequestDialog}
      />
      {requests && requests.length > 0 ? (
        <Card>
          <CardContent className="divide-y p-0">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium">{r.category}</p>
                  <p className="text-sm text-muted-foreground">{r.description ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                </div>
                <Badge variant="muted">{enumLabel(r.status)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon="Wrench"
          title="No requests yet"
          description="Tap 'New request' to report an issue. You'll get an SMS as the status changes."
        />
      )}
    </>
  );
}
