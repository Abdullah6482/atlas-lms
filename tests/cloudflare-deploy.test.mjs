import assert from "node:assert/strict";
import test from "node:test";
import { configureD1Database } from "../scripts/cloudflare-deploy.mjs";

const validId = "12345678-1234-1234-1234-123456789abc";

test("injects the configured production D1 database into the DB binding", () => {
  const config = {
    d1_databases: [
      {
        binding: "DB",
        database_name: "local-name",
        database_id: "00000000-0000-4000-8000-000000000000",
      },
    ],
  };

  const result = configureD1Database(config, validId, "atlas-production");

  assert.equal(result.d1_databases[0].database_id, validId);
  assert.equal(result.d1_databases[0].database_name, "atlas-production");
  assert.match(result.d1_databases[0].migrations_dir, /[\\/]drizzle$/);
  assert.equal(config.d1_databases[0].database_id, "00000000-0000-4000-8000-000000000000");
});

test("refuses to deploy without a valid Cloudflare database ID", () => {
  assert.throws(
    () => configureD1Database({ d1_databases: [{ binding: "DB" }] }, "", "atlas"),
    /CLOUDFLARE_D1_DATABASE_ID/,
  );
});

test("refuses a generated config without the expected D1 binding", () => {
  assert.throws(
    () => configureD1Database({ d1_databases: [] }, validId, "atlas"),
    /missing its DB D1 binding/,
  );
});
