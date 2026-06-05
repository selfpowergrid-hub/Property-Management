import Link from "next/link";
import { PROPERTY_TYPES, enumLabel, formatKES } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createPropertyAction } from "@/app/actions/properties";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormDialog, Field } from "@/components/form-dialog";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  await requireFeature("properties.manage");
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, county, type, units(id, status, monthly_rent)")
    .order("created_at", { ascending: true });

  const newPropertyDialog = (
    <FormDialog
      trigger={<Button>New property</Button>}
      title="New property"
      description="Add a residential, commercial, or mixed-use property."
      action={createPropertyAction}
      submitLabel="Create property"
    >
      <Field label="Name" htmlFor="name">
        <Input id="name" name="name" placeholder="e.g. Greenview Apartments" required />
      </Field>
      <Field label="Address" htmlFor="address">
        <Input id="address" name="address" placeholder="Street / building" />
      </Field>
      <Field label="County" htmlFor="county">
        <Input id="county" name="county" placeholder="e.g. Nairobi" />
      </Field>
      <Field label="Type" htmlFor="type">
        <Select id="type" name="type" defaultValue="residential">
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {enumLabel(t)}
            </option>
          ))}
        </Select>
      </Field>
    </FormDialog>
  );

  return (
    <>
      <PageHeader
        title="Properties & Units"
        description="Manage your properties and their units (PRD §6.2)."
        action={newPropertyDialog}
      />

      {properties && properties.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => {
            const units = property.units ?? [];
            const occupied = units.filter((u) => u.status === "occupied").length;
            const rentRoll = units.reduce((s, u) => s + Number(u.monthly_rent), 0);
            return (
              <Link key={property.id} href={`/properties/${property.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle>{property.name}</CardTitle>
                      <Badge variant="muted">{enumLabel(property.type)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{property.county ?? "—"}</p>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Units</span>
                      <span className="font-medium">{units.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Occupied</span>
                      <span className="font-medium">
                        {occupied}/{units.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rent roll</span>
                      <span className="font-medium">{formatKES(rentRoll)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="Building2"
          title="No properties yet"
          description="Create your first property to start adding units, tenants, and leases."
        />
      )}
    </>
  );
}
