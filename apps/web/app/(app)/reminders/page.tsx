import { formatKES, formatDate } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadArrears } from "@/lib/arrears";
import { sendRentReminderAction, sendAllRemindersAction } from "@/app/actions/reminders";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  await requireFeature("payments.record");
  const supabase = await createClient();

  const [arrears, { data: reminderLogs }] = await Promise.all([
    loadArrears(supabase),
    supabase
      .from("sms_logs")
      .select("recipient_phone, created_at")
      .ilike("message", "%overdue%")
      .order("created_at", { ascending: false }),
  ]);

  // Most recent reminder per phone, to discourage double-texting.
  const lastReminder = new Map<string, string>();
  for (const l of reminderLogs ?? []) {
    if (!lastReminder.has(l.recipient_phone)) lastReminder.set(l.recipient_phone, l.created_at);
  }

  const totalOwed = arrears.reduce((s, a) => s + a.balance, 0);
  const reachable = arrears.filter((a) => a.phone).length;

  const remindAll = (
    <form action={sendAllRemindersAction}>
      <Button type="submit" disabled={reachable === 0}>
        Remind all ({reachable})
      </Button>
    </form>
  );

  return (
    <>
      <PageHeader
        title="Reminders"
        description="Send SMS rent reminders to tenants who are overdue (PRD §6.9)."
        action={arrears.length > 0 ? remindAll : undefined}
      />

      {arrears.length > 0 ? (
        <>
          <div className="mb-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{arrears.length}</span> tenant(s) overdue
            </span>
            <span>
              Total owed <span className="font-medium text-foreground">{formatKES(totalOwed)}</span>
            </span>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Overdue</TableHead>
                    <TableHead>Last reminder</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arrears.map((a) => {
                    const last = a.phone ? lastReminder.get(a.phone) : undefined;
                    return (
                      <TableRow key={a.leaseId}>
                        <TableCell className="font-medium">
                          {a.tenantName}
                          {!a.phone ? (
                            <span className="ml-2 text-xs text-destructive">no phone</span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {a.property} · {a.unit}
                        </TableCell>
                        <TableCell>{formatKES(a.balance)}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{a.daysLate} days</Badge>
                          <span className="ml-2 text-xs text-muted-foreground">since {formatDate(a.oldestDue)}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {last ? formatDate(last) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <form action={sendRentReminderAction}>
                            <input type="hidden" name="leaseId" value={a.leaseId} />
                            <Button type="submit" variant="outline" size="sm" disabled={!a.phone}>
                              Send reminder
                            </Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState
          icon="Bell"
          title="No overdue tenants"
          description="Everyone is within their grace period. Reminders appear here when rent falls overdue."
        />
      )}
    </>
  );
}
