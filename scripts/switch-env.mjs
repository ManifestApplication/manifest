// Swap apps/web/.env.local between the local Docker Supabase and the cloud DEV
// project — touches ONLY the two NEXT_PUBLIC_SUPABASE_* lines, leaving Biteship /
// Maps / shipping values intact. Both keys below are browser-safe *publishable*
// keys (never the secret/service_role key), so they're fine to keep in-repo.
//
// Usage:  pnpm env:local   |   pnpm env:dev
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = join(ROOT, "apps/web/.env.local");

const TARGETS = {
  local: {
    label: "Local Docker (`supabase start`)",
    url: "http://127.0.0.1:54321",
    key: "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
  },
  dev: {
    label: "Manifest DEV (cloud)",
    url: "https://yqqavavkkmkcwlnahjre.supabase.co",
    key: "sb_publishable_QT2NfYLr9eEml1nGhqSP-g_UXE5DNs4",
  },
};

const target = process.argv[2];
const cfg = TARGETS[target];
if (!cfg) {
  console.error(`Usage: node scripts/switch-env.mjs <local|dev>`);
  process.exit(1);
}

let text;
try {
  text = readFileSync(ENV_PATH, "utf8");
} catch {
  console.error(`Cannot read ${ENV_PATH} — create it from apps/web/.env.example first.`);
  process.exit(1);
}

// Replace the active (uncommented) lines only; commented alternates are left as-is.
const replaced = text
  .replace(/^# Active:.*$/m, `# Active: ${cfg.label} — set by \`pnpm env:${target}\``)
  .replace(/^NEXT_PUBLIC_SUPABASE_URL=.*$/m, `NEXT_PUBLIC_SUPABASE_URL=${cfg.url}`)
  .replace(
    /^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=.*$/m,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${cfg.key}`,
  );

if (!/^NEXT_PUBLIC_SUPABASE_URL=/m.test(replaced)) {
  console.error("No active NEXT_PUBLIC_SUPABASE_URL line found in .env.local.");
  process.exit(1);
}

writeFileSync(ENV_PATH, replaced);
console.log(`✓ .env.local → ${cfg.label}`);
console.log(`  ${cfg.url}`);
console.log(`  Restart \`next dev\` for the change to take effect.`);
