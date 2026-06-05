import Link from "next/link";
import { notFound } from "next/navigation";
import { UNIT_STATUSES, enumLabel, formatKES, type UnitStatus } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createUnitAction, uploadDocumentAction } from "@/app/actions/properties";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormDialog, Field } from "@/components/form-dialog";
import { UnitStatusSelect } from "@/components/unit-status-select";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<UnitStatus, "success" | "warning" | "muted"> = {
  occupied: "success",
  vacant: "warning",
  under_maintenance: "muted",
  reserved: "muted",
};

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  await requireFeature("properties.manage");
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("id, name, address, county, type, units(id, unit_number, floor, type, size_sqft, monthly_rent, status)")
    .eq("id", params.id)
    .maybeSingle();

  if (!property) notFound();

  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, bucket, path, created_at")
    .eq("owner_type", "property")
    .eq("owner_id", property.id)
    .order("created_at", { ascending: false });

  // Pre-sign document URLs for download links.
  const docLinks = await Promise.all(
    (documents ?? []).map(async (d) => {
      const { data } = await supabase.storage.from(d.bucket).createSignedUrl(d.path, 3600);
      return { ...d, url: data?.signedUrl ?? "#" };
    }),
  );

  const units = property.units ?? [];

  const addUnitDialog = (
    <FormDialog
      trigger={<Button>Add unit</Button>}
      title="Add unit"
      action={createUnitAction}
      submitLabel="Add unit"
    >
      <input type="hidden" name="propertyId" value={property.id} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Unit number" htmlFor="unitNumber">
          <Input id="unitNumber" name="unitNumber" placeholder="A1" required />
        </Field>
        <Field label="Floor" htmlFor="floor">
          <Input id="floor" name="floor" placeholder="1" />
        </Field>
        <Field label="Type" htmlFor="type">
          <Input id="type" name="type" placeholder="2-bedroom" />
        </Field>
        <Field label="Size (sqft)" htmlFor="sizeSqft">
          <Input id="sizeSqft" name="sizeSqft" type="number" min="0" />
        </Field>
        <Field label="Monthly rent (KES)" htmlFor="monthlyRent">
          <Input id="monthlyRent" name="monthlyRent" type="number" min="0" required />
        </Field>
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue="vacant">
            {UNIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {enumLabel(s)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </FormDialog>
  );

  return (
    <>
      <div className="mb-4">
        <Link href="/properties" className="text-sm text-primary hover:underline">
          ← Properties
        </Link>
      </div>
      <PageHeader
        title={property.name}
        description={`${property.county ?? "—"} · ${enumLabel(property.type)}${property.address ? ` · ${property.address}` : ""}`}
        action={addUnitDialog}
      />

      <Card>
        <CardHeader>
          <CardTitle>Units</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {units.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.unit_number}</TableCell>
                    <TableCell>{u.type ?? "—"}</TableCell>
                    <TableCell>{u.size_sqft ? `${u.size_sqft} sqft` : "—"}</TableCell>
                    <TableCell>{formatKES(u.monthly_rent)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS_VARIANT[u.status]}>{enumLabel(u.status)}</Badge>
                        <UnitStatusSelect unitId={u.id} propertyId={property.id} status={u.status} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">No units yet. Add the first one.</p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Photos & documents</CardTitle>
          <FormDialog
            trigger={
              <Button variant="outline" size="sm">
                Upload
              </Button>
            }
            title="Upload a file"
            description="Property photo, title deed, or other document (PROP-05)."
            action={uploadDocumentAction}
            submitLabel="Upload"
          >
            <input type="hidden" name="ownerType" value="property" />
            <input type="hidden" name="ownerId" value={property.id} />
            <Field label="Bucket" htmlFor="bucket">
              <Select id="bucket" name="bucket" defaultValue="property-photos">
                <option value="property-photos">Photo</option>
                <option value="lease-documents">Document</option>
              </Select>
            </Field>
            <Field label="File" htmlFor="file">
              <Input id="file" name="file" type="file" required />
            </Field>
          </FormDialog>
        </CardHeader>
        <CardContent>
          {docLinks.length > 0 ? (
            <ul className="divide-y">
              {docLinks.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{d.name}</span>
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    Download
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
