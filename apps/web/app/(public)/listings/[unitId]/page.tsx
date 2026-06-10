import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { enumLabel, formatKES } from "@nyumba360/shared";
import { getListing } from "@/lib/listings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ListingInquiryForm } from "./listing-inquiry-form";

export const dynamic = "force-dynamic";

/** Kenyan phone → wa.me digits (0xxxxxxxxx → 254xxxxxxxxx). */
function whatsappDigits(phone: string): string {
  const d = phone.replace(/[^0-9]/g, "");
  if (d.startsWith("0")) return `254${d.slice(1)}`;
  return d;
}

export async function generateMetadata({
  params,
}: {
  params: { unitId: string };
}): Promise<Metadata> {
  const l = await getListing(params.unitId);
  if (!l) return { title: "Listing — LogiQ Estates Pro" };
  return {
    title: `${l.property_name} · ${formatKES(l.monthly_rent)}/mo — LogiQ Estates Pro`,
    description: l.listing_description ?? `Vacant ${l.unit_type ?? "unit"} in ${l.county ?? "Kenya"}.`,
  };
}

export default async function ListingDetailPage({ params }: { params: { unitId: string } }) {
  const l = await getListing(params.unitId);
  if (!l) notFound();

  const [hero, ...rest] = l.photoUrls;

  return (
    <>
      <div className="mb-4">
        <Link href="/listings" className="text-sm text-primary hover:underline">
          ← All listings
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Gallery + description */}
        <div>
          <div className="overflow-hidden rounded-lg border bg-muted">
            {hero ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero} alt={l.property_name} className="h-80 w-full object-cover" />
            ) : (
              <div className="flex h-80 items-center justify-center text-muted-foreground">No photo available</div>
            )}
          </div>
          {rest.length > 0 ? (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {rest.slice(0, 4).map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`${l.property_name} photo ${i + 2}`}
                  className="h-20 w-full rounded-md border object-cover"
                />
              ))}
            </div>
          ) : null}

          <div className="mt-6">
            <h1 className="font-serif text-2xl font-semibold tracking-tight">{l.property_name}</h1>
            <p className="mt-1 text-muted-foreground">
              {[l.unit_type, l.county].filter(Boolean).join(" · ") || "—"} · Unit {l.unit_number}
            </p>
            <Badge variant="muted" className="mt-3">
              {enumLabel(l.property_type)}
            </Badge>
            {l.listing_description ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{l.listing_description}</p>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No description provided.</p>
            )}
          </div>
        </div>

        {/* Contact / booking */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl text-primary">{formatKES(l.monthly_rent)}</CardTitle>
              <p className="text-sm text-muted-foreground">per month</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="border-t pt-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Listed by</p>
                <p className="font-medium">{l.company_name}</p>
              </div>
              {l.company_phone ? (
                <div className="flex gap-2">
                  <a href={`tel:${l.company_phone}`} className={`${buttonVariants({ variant: "outline" })} flex-1`}>
                    Call
                  </a>
                  <a
                    href={`https://wa.me/${whatsappDigits(l.company_phone)}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`${buttonVariants({ variant: "outline" })} flex-1`}
                  >
                    WhatsApp
                  </a>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Book a viewing</CardTitle>
            </CardHeader>
            <CardContent>
              <ListingInquiryForm unitId={l.unit_id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
