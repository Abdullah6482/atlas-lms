import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface HostingConfig {
  d1?: string | null;
  r2?: string | null;
}

export function readHostingConfig(root: string): HostingConfig {
  const privateConfig = resolve(root, ".openai", "hosting.json");
  const configPath = existsSync(privateConfig)
    ? privateConfig
    : resolve(root, ".openai", "hosting.example.json");

  return JSON.parse(readFileSync(configPath, "utf8")) as HostingConfig;
}
