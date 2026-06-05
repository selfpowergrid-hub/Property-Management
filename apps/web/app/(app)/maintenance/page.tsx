import {
  MAINTENANCE_PRIORITIES,
  enumLabel,
  formatKES,
  type MaintenancePriority,
} from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  assignMaintenanceAction,
  createMaintenanceStaffAction,
  resolveMaintenanceAction,
} from "@/app/actions/maintenance";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormDialog, Field } from "@/components/form-dialog";
import { MaintenanceStatusSelect } from "@/components/maintenance-status-select";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

const PRIORITY_VARIANT: Record<MaintenancePriority, "destructive" | "warning" | "muted"> = {
  urgent: "destructive",
  medium: "warning",
  low: "muted",
};

export default async function MaintenancePage() {
  const me = await requireFeature("maintenance.manage");
  const isManager = me.role === "landlord" || me.role === "manager";
  const supabase = await createClient();

  const [{ data: requests }, { data: caretakers }, { data: units }] = await Promise.all([
    supabase
      .from("maintenance_requests")
      .select("id, category, description, status, priority, cost, units(unit_number), tenants(full_name), assigned:users(full_name)")
      .order("created_at", { ascending: false }),
    supabase.from("users").select("id, full_name").eq("role", "caretaker"),
    supabase.from("units").select("id, unit_number, properties(name)"),
  ]);

  const createDialog = isManager ? (
    <FormDialog
      trigger={<Button>New request</Button>}
      title="Log a maintenance request"
      description="Create a request on behalf of a tenant (MNT-07)."
      action={createMaintenanceStaffAction}
      submitLabel="Create"
    >
      <Field label="Unit" htmlFor="unitId">
        <Select id="unitId" name="unitId" required defaultValue="">
          <option value="" disabled>
            Select a unit
          </option>
          {(units ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {(u.properties as { name?: string } | null)?.name ?? "—"} · Unit {u.unit_number}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Category" htmlFor="category">
        <Input id="category" name="category" placeholder="Plumbing, Electrical…" required />
      </Field>
      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" required />
      </Field>
      <Field label="Priority" htmlFor="priority">
        <Select id="priority" name="priority" defaultValue="medium">
          {MAINTENANCE_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {enumLabel(p)}
            </option>
          ))}
        </Select>
      </Field>
    </FormDialog>
  ) : undefined;

  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Repair requests and assignments (PRD §6.6)."
        action={createDialog}
      />

      {requests && requests.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => {
                  const unit = r.units as { unit_number?: string } | null;
                  const assigned = r.assigned as { full_name?: string } | null;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{unit?.unit_number ?? "—"}</TableCell>
                      <TableCell>
                        <div>{r.category}</div>
                        <div className="text-xs text-muted-foreground">{r.description ?? ""}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={PRIORITY_VARIANT[r.priority]}>{enumLabel(r.priority)}</Badge>
                      </TableCell>
                      <TableCell>{assigned?.full_name ?? "—"}</TableCell>
                      <TableCell>
                        <MaintenanceStatusSelect requestId={r.id} status={r.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isManager ? (
                            <FormDialog
                              trigger={<Button variant="outline" size="sm">Assign</Button>}
                              title="Assign request"
                              action={assignMaintenanceAction}
                              submitLabel="Assign"
                            >
                              <input type="hidden" name="requestId" value={r.id} />
                              <Field label="Caretaker" htmlFor="assignedTo">
                                <Select id="assignedTo" name="assignedTo" required defaultValue="">
                                  <option value="" disabled>
                                    Select a caretaker
                                  </option>
                                  {(caretakers ?? []).map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.full_name ?? "Caretaker"}
                                    </option>
                                  ))}
                                </Select>
                              </Field>
                              <Field label="Priority" htmlFor="priority">
                                <Select id="priority" name="priority" defaultValue={r.priority}>
                                  {MAINTENANCE_PRIORITIES.map((p) => (
                                    <option key={p} value={p}>
                                      {enumLabel(p)}
                                    </option>
                                  ))}
                                </Select>
                              </Field>
                            </FormDialog>
                          ) : null}
                          <FormDialog
                            trigger={<Button variant="outline" size="sm">Resolve</Button>}
                            title="Resolve request"
                            description="Record resolution notes and cost; cost posts to expenses (EXP-03)."
                            action={resolveMaintenanceAction}
                            submitLabel="Mark resolved"
                          >
                            <input type="hidden" name="requestId" value={r.id} />
                            <Field label="Resolution notes" htmlFor="resolutionNotes">
                              <Textarea id="resolutionNotes" name="resolutionNotes" />
                            </Field>
                            <Field label="Cost (KES)" htmlFor="cost" hint={r.cost ? `Recorded: ${formatKES(r.cost)}` : undefined}>
                              <Input id="cost" name="cost" type="number" min="0" defaultValue={0} />
                            </Field>
                          </FormDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon="Wrench"
          title="No maintenance requests"
          description="Tenants submit requests from their portal; managers assign caretakers and track them to closure."
        />
      )}
    </>
  );
}
