import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(projectRoot, "dist", "server", "wrangler.json");
const migrationsDirectory = "../../drizzle";

export function configureD1Database(config, databaseId, databaseName) {
  if (!/^[\da-f]{8}-([\da-f]{4}-){3}[\da-f]{12}$/i.test(databaseId ?? "")) {
    throw new Error(
      "Set CLOUDFLARE_D1_DATABASE_ID to the ID of your production D1 database.",
    );
  }
  if (!databaseName?.trim()) {
    throw new Error("CLOUDFLARE_D1_DATABASE_NAME must not be empty.");
  }

  const database = config.d1_databases?.find(({ binding }) => binding === "DB");
  if (!database) {
    throw new Error("The generated Worker config is missing its DB D1 binding.");
  }

  return {
    ...config,
    d1_databases: config.d1_databases.map((entry) =>
      entry.binding === "DB"
        ? {
            ...entry,
            database_id: databaseId,
            database_name: databaseName.trim(),
            migrations_dir: migrationsDirectory,
          }
        : entry,
    ),
  };
}

async function prepareConfig() {
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const databaseName = process.env.CLOUDFLARE_D1_DATABASE_NAME ?? "atlas-lms";
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const configured = configureD1Database(config, databaseId, databaseName);
  await writeFile(configPath, `${JSON.stringify(configured, null, 2)}\n`);
}

function runWrangler(args) {
  const wranglerPath = path.join(
    projectRoot,
    "node_modules",
    "wrangler",
    "bin",
    "wrangler.js",
  );
  const result = spawnSync(
    process.execPath,
    [wranglerPath, ...args, "--config", configPath],
    { cwd: projectRoot, stdio: "inherit" },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Wrangler exited with status ${result.status ?? "unknown"}.`);
  }
}

async function main(command) {
  if (!["deploy", "migrate"].includes(command)) {
    throw new Error("Usage: node scripts/cloudflare-deploy.mjs <deploy|migrate>");
  }

  await prepareConfig();

  if (command === "deploy") {
    runWrangler(["deploy"]);
    return;
  }

  const databaseName = process.env.CLOUDFLARE_D1_DATABASE_NAME ?? "atlas-lms";
  runWrangler([
    "d1",
    "migrations",
    "apply",
    databaseName,
    "--remote",
  ]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main(process.argv[2]);
}
