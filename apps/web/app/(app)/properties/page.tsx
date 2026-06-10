import Link from "next/link";
import { Building, Building2, Store, type LucideIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Visual identity per property type: a gradient banner + a fitting building icon
// so the cards read at a glance without needing uploaded photos.
const TYPE_STYLE: Record<(typeof PROPERTY_TYPES)[number], { gradient: string; Icon: LucideIcon }> = {
  residential: { gradient: "from-orange-400 to-rose-500", Icon: Building2 },
  commercial: { gradient: "from-amber-400 to-orange-600", Icon: Store },
  mixed: { gradient: "from-rose-400 to-amber-500", Icon: Building },
};

export default async function PropertiesPage() {
  await requireFeature("properties.manage");
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, county, type, units(id, status, monthly_rent)")
    .order("created_at", { ascending: true });

  // Latest photo per property (private bucket → sign a short-lived URL).
  const propertyIds = (properties ?? []).map((p) => p.id);
  const photoUrl = new Map<string, string>();
  if (propertyIds.length) {
    const { data: photos } = await supabase
      .from("documents")
      .select("owner_id, bucket, path, created_at")
      .eq("owner_type", "property")
      .eq("bucket", "property-photos")
      .in("owner_id", propertyIds)
      .order("created_at", { ascending: false });

    const latest = new Map<string, { bucket: string; path: string }>();
    for (const d of photos ?? []) {
      if (!latest.has(d.owner_id)) latest.set(d.owner_id, { bucket: d.bucket, path: d.path });
    }
    await Promise.all(
      [...latest].map(async ([pid, d]) => {
        const { data } = await supabase.storage.from(d.bucket).createSignedUrl(d.path, 3600);
        if (data?.signedUrl) photoUrl.set(pid, data.signedUrl);
      }),
    );
  }

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
      <Field label="Photo" htmlFor="photo" hint="Optional — shown on the property card">
        <Input id="photo" name="photo" type="file" accept="image/*" />
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
            const style = TYPE_STYLE[property.type] ?? TYPE_STYLE.residential;
            const occupancy = units.length ? Math.round((occupied / units.length) * 100) : null;
            const photo = photoUrl.get(property.id);
            return (
              <Link key={property.id} href={`/properties/${property.id}`}>
                <Card className="group h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  <div
                    className={cn(
                      "relative flex h-24 items-center justify-center bg-gradient-to-br",
                      style.gradient,
                    )}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt={property.name}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <style.Icon className="h-10 w-10 text-white/90 transition-transform group-hover:scale-110" />
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                      {occupancy === null ? "No units" : `${occupancy}% occupied`}
                    </span>
                  </div>
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
