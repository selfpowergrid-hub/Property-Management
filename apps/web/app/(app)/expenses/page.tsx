import { EXPENSE_CATEGORIES, enumLabel, formatKES, formatDate } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createExpenseAction } from "@/app/actions/expenses";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { FormDialog, Field } from "@/components/form-dialog";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  await requireFeature("expenses.record");
  const supabase = await createClient();

  const today = new Date();
  const yearStart = `${today.getFullYear()}-01-01`;
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

  const [{ data: expenses }, { data: properties }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, category, amount, date, description, properties(name)")
      .gte("date", yearStart)
      .order("date", { ascending: false }),
    supabase.from("properties").select("id, name, units(id, unit_number)").order("name"),
  ]);

  const yearTotal = expenses?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;
  const monthTotal =
    expenses?.filter((e) => e.date >= monthStart).reduce((s, e) => s + Number(e.amount), 0) ?? 0;

  const newExpenseDialog = (
    <FormDialog
      trigger={<Button>New expense</Button>}
      title="Record expense"
      description="Property expense with optional receipt (EXP-01)."
      action={createExpenseAction}
      submitLabel="Save expense"
    >
      <Field label="Property" htmlFor="propertyId">
        <Select id="propertyId" name="propertyId" required defaultValue="">
          <option value="" disabled>
            Select a property
          </option>
          {(properties ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Category" htmlFor="category">
          <Select id="category" name="category" defaultValue="repairs">
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {enumLabel(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount (KES)" htmlFor="amount">
          <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
        </Field>
        <Field label="Date" htmlFor="date">
          <Input id="date" name="date" type="date" defaultValue={today.toISOString().slice(0, 10)} required />
        </Field>
        <Field label="Receipt" htmlFor="file" hint="Optional">
          <Input id="file" name="file" type="file" />
        </Field>
      </div>
      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" />
      </Field>
    </FormDialog>
  );

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Property expense tracking (PRD §6.7)."
        action={
          <div className="flex gap-2">
            <a href="/expenses/export">
              <Button variant="outline">Export CSV</Button>
            </a>
            {newExpenseDialog}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard title="This month" value={formatKES(monthTotal)} icon="Wallet" />
        <StatCard title={`${today.getFullYear()} total`} value={formatKES(yearTotal)} icon="BarChart3" />
      </div>

      {expenses && expenses.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.date)}</TableCell>
                    <TableCell>{(e.properties as { name?: string } | null)?.name ?? "—"}</TableCell>
                    <TableCell>{enumLabel(e.category)}</TableCell>
                    <TableCell className="text-muted-foreground">{e.description ?? "—"}</TableCell>
                    <TableCell className="font-medium">{formatKES(e.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon="Wallet"
          title="No expenses recorded"
          description="Record property expenses; maintenance resolution costs also appear here automatically."
        />
      )}
    </>
  );
}
