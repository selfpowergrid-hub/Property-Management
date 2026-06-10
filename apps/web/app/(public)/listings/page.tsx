import Link from "next/link";
import { PROPERTY_TYPES, enumLabel, formatKES } from "@nyumba360/shared";
import { getListings } from "@/lib/listings";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: { county?: string; type?: string; maxRent?: string };
}) {
  const county = searchParams.county?.trim() || undefined;
  const type = searchParams.type || undefined;
  const maxRent = searchParams.maxRent ? Number(searchParams.maxRent) : undefined;

  const listings = await getListings({ county, type, maxRent });

  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Find your next home</h1>
        <p className="mt-1 text-muted-foreground">
          {listings.length} vacant {listings.length === 1 ? "unit" : "units"} available now.
        </p>
      </div>

      {/* Filters (GET form → query params) */}
      <form className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-4" method="get">
        <Input name="county" placeholder="Town / county" defaultValue={county ?? ""} />
        <Select name="type" defaultValue={type ?? ""}>
          <option value="">Any type</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {enumLabel(t)}
            </option>
          ))}
        </Select>
        <Input name="maxRent" type="number" min="0" placeholder="Max rent (KES)" defaultValue={maxRent ?? ""} />
        <button type="submit" className={buttonVariants()}>
          Search
        </button>
      </form>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No listings match your search. Try widening your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <Link key={l.unit_id} href={`/listings/${l.unit_id}`}>
              <Card className="group h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative aspect-[4/3] bg-muted">
                  {l.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.thumbnailUrl}
                      alt={l.property_name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No photo
                    </div>
                  )}
                  <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                    {formatKES(l.monthly_rent)}/mo
                  </span>
                </div>
                <CardContent className="space-y-1 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{l.property_name}</p>
                    <Badge variant="muted">{enumLabel(l.property_type)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[l.unit_type, l.county].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">by {l.company_name}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
