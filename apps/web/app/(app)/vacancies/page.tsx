import { formatKES, formatDate, daysBetween } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setUnitListingAction, createInquiryAction } from "@/app/actions/vacancy";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormDialog, Field } from "@/components/form-dialog";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function VacanciesPage() {
  await requireFeature("properties.manage");
  const supabase = await createClient();

  const [{ data: vacant }, { data: inquiries }] = await Promise.all([
    supabase
      .from("units")
      .select("id, unit_number, type, monthly_rent, listed, listing_description, updated_at, properties(name)")
      .eq("status", "vacant")
      .order("updated_at", { ascending: true }),
    supabase
      .from("inquiries")
      .select("id, name, phone, preferred_move_in, message, units(unit_number)")
      .order("created_at", { ascending: false }),
  ]);

  const addInquiry = (
    <FormDialog
      trigger={<Button variant="outline">Add inquiry</Button>}
      title="Prospective tenant inquiry"
      description="Capture an enquiry against a vacant unit (VAC-03)."
      action={createInquiryAction}
      submitLabel="Save inquiry"
    >
      <Field label="Unit" htmlFor="unitId">
        <Select id="unitId" name="unitId" defaultValue="">
          <option value="">No specific unit</option>
          {(vacant ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {(u.properties as { name?: string } | null)?.name ?? "—"} · Unit {u.unit_number}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" required />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" required />
        </Field>
        <Field label="Preferred move-in" htmlFor="preferredMoveIn">
          <Input id="preferredMoveIn" name="preferredMoveIn" type="date" />
        </Field>
      </div>
      <Field label="Message" htmlFor="message">
        <Textarea id="message" name="message" />
      </Field>
    </FormDialog>
  );

  return (
    <>
      <PageHeader
        title="Vacancies"
        description="Vacant units, listings, and inquiries (PRD §6.5)."
        action={
          <div className="flex gap-2">
            <a href="/vacancies/export">
              <Button variant="outline">Export CSV</Button>
            </a>
            {addInquiry}
          </div>
        }
      />

      {vacant && vacant.length > 0 ? (
        <Card>
          <CardContent className="divide-y p-0">
            {vacant.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium">
                    {(u.properties as { name?: string } | null)?.name ?? "—"} · Unit {u.unit_number}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {u.type ?? "—"} · {formatKES(u.monthly_rent)}/mo · {daysBetween(u.updated_at)} days vacant
                  </p>
                  {u.listing_description ? (
                    <p className="mt-1 text-xs text-muted-foreground">{u.listing_description}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {u.listed ? <Badge>Listed</Badge> : <Badge variant="muted">Not listed</Badge>}
                  <FormDialog
                    trigger={<Button variant="outline" size="sm">Edit listing</Button>}
                    title="Edit listing"
                    description="Mark this unit available for listing (VAC-02)."
                    action={setUnitListingAction}
                    submitLabel="Save"
                  >
                    <input type="hidden" name="unitId" value={u.id} />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="listed" defaultChecked={u.listed} className="h-4 w-4" />
                      Available for listing
                    </label>
                    <Field label="Listing description" htmlFor="listingDescription">
                      <Textarea
                        id="listingDescription"
                        name="listingDescription"
                        defaultValue={u.listing_description ?? ""}
                        placeholder="Bright studio, close to CBD…"
                      />
                    </Field>
                  </FormDialog>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <EmptyState icon="DoorOpen" title="No vacant units" description="Occupied and reserved units won't appear here." />
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Inquiries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {inquiries && inquiries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Move-in</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.name}</TableCell>
                    <TableCell>{q.phone}</TableCell>
                    <TableCell>{(q.units as { unit_number?: string } | null)?.unit_number ?? "—"}</TableCell>
                    <TableCell>{q.preferred_move_in ? formatDate(q.preferred_move_in) : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{q.message ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">No inquiries captured yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
