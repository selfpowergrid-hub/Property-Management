// Run a .sql file against a Postgres connection string.
//   node scripts/run-sql.mjs <path-to-sql> "<connection-string>"
// Used to apply seed.sql to the hosted Supabase project (the CLI's db push
// only runs migrations, not the seed).
import { readFileSync } from "node:fs";
import pg from "pg";

const [, , sqlPath, connString] = process.argv;
if (!sqlPath || !connString) {
  console.error("Usage: node scripts/run-sql.mjs <file.sql> <connection-string>");
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");
const client = new pg.Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log(`OK: applied ${sqlPath}`);
} catch (err) {
  console.error(`FAILED applying ${sqlPath}:`);
  console.error(err.message);
  process.exit(1);
} finally {
  await client.end();
}
