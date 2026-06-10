import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicListingRow } from "@nyumba360/supabase";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ListingFilters {
  county?: string;
  type?: string;
  maxRent?: number;
}

export interface ListingCard extends PublicListingRow {
  thumbnailUrl: string | null;
}
export interface ListingDetail extends PublicListingRow {
  photoUrls: string[];
}

/** Sign a private-bucket object for short-lived public display. */
async function sign(admin: SupabaseClient, bucket: string, path: string): Promise<string | null> {
  const { data } = await admin.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Marketplace listings (listed + vacant units across all companies). Data
 *  comes from the anon-safe RPC; photo URLs are signed server-side. */
export async function getListings(filters: ListingFilters = {}): Promise<ListingCard[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_public_listings", {
    p_county: filters.county || null,
    p_type: filters.type || null,
    p_max_rent: filters.maxRent ?? null,
  });
  const rows = (data ?? []) as PublicListingRow[];
  if (rows.length === 0) return [];

  const admin = createAdminClient();
  return Promise.all(
    rows.map(async (r) => ({
      ...r,
      thumbnailUrl: r.photo_path ? await sign(admin, "property-photos", r.photo_path) : null,
    })),
  );
}

/** One listing's full detail + signed photo gallery. */
export async function getListing(unitId: string): Promise<ListingDetail | null> {
  const supabase = await createClient();
  const [{ data: rows }, { data: photos }] = await Promise.all([
    supabase.rpc("get_public_listing", { p_unit: unitId }),
    supabase.rpc("get_listing_photos", { p_unit: unitId }),
  ]);
  const row = ((rows ?? []) as PublicListingRow[])[0];
  if (!row) return null;

  const admin = createAdminClient();
  const refs = (photos ?? []) as { bucket: string; path: string }[];
  const photoUrls = (
    await Promise.all(refs.map((p) => sign(admin, p.bucket, p.path)))
  ).filter((u): u is string => Boolean(u));

  return { ...row, photoUrls };
}
