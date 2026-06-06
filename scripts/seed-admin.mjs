// Provision a production organisation + landlord admin on a hosted Supabase
// project. Unlike supabase/seed.sql (local demo data), this uses the Auth Admin
// API with the service-role key so it works against a real project and creates
// a proper, confirmed login.
//
// Usage (env: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY):
//   node scripts/seed-admin.mjs \
//     --org "Acme Properties" --county Nairobi \
//     --email owner@acme.co.ke --name "Jane Acme" [--password 'S3cret!'] \
//     [--plan growth]
//
// If --password is omitted a strong one is generated and printed once.
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Missing env. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const orgName = arg("org");
const email = arg("email");
const fullName = arg("name");
const county = arg("county", null);
const plan = arg("plan", "starter");
const phone = arg("phone", null);
let password = arg("password");

if (!orgName || !email || !fullName) {
  console.error("Required: --org <name> --email <email> --name <full name>");
  process.exit(1);
}
if (!password) {
  // URL-safe, 24 chars, with guaranteed symbol/number for password policies.
  password = randomBytes(18).toString("base64url") + "9!";
}

const VALID_PLANS = ["starter", "growth", "pro", "enterprise"];
if (!VALID_PLANS.includes(plan)) {
  console.error(`Invalid --plan "${plan}". One of: ${VALID_PLANS.join(", ")}`);
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // 1. Organisation (the FK target the landlord's profile points at).
  const { data: org, error: orgErr } = await admin
    .from("organisations")
    .insert({ name: orgName, county, plan })
    .select("id")
    .single();
  if (orgErr) throw new Error(`Create organisation failed: ${orgErr.message}`);
  console.log(`✓ Organisation "${orgName}" created (${org.id})`);

  // 2. Auth user. app_metadata seeds the org_id/user_role that the
  //    handle_new_user trigger copies into public.users and the access-token
  //    hook later mirrors into the JWT claims.
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
    app_metadata: {
      provider: "email",
      providers: ["email"],
      org_id: org.id,
      user_role: "landlord",
    },
  });
  if (userErr) {
    // Roll back the org so a retry starts clean.
    await admin.from("organisations").delete().eq("id", org.id);
    throw new Error(`Create user failed: ${userErr.message}`);
  }
  const userId = created.user.id;
  console.log(`✓ Landlord ${email} created (${userId})`);

  // 3. Belt-and-braces: ensure the profile row carries org_id/role even if the
  //    trigger ran before app_metadata was visible. Service role bypasses RLS
  //    and the privileged-columns guard.
  const { error: profErr } = await admin
    .from("users")
    .update({ org_id: org.id, role: "landlord", full_name: fullName, phone })
    .eq("id", userId);
  if (profErr) throw new Error(`Link profile failed: ${profErr.message}`);
  console.log("✓ Profile linked to organisation as landlord");

  console.log("\nProvisioned. Share these credentials securely:");
  console.log(`  URL:      ${url.replace(/\/$/, "")}`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log("\nThe landlord should sign in and change their password.");
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
