// Seed an encrypted Anthropic key into user_provider_keys for a target user.
//
// Usage: node scripts/seed-byok-key.mjs [email]
//   email defaults to "aflekkas@gmail.com".
//
// Requires .env.local with: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY,
// BYOK_ENCRYPTION_KEY, ANTHROPIC_API_KEY.

import { readFileSync } from "node:fs";
import { createCipheriv, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

loadDotEnvLocal();

const TARGET_EMAIL = process.argv[2] ?? "aflekkas@gmail.com";
const PROVIDER = "anthropic";
const DEFAULT_MODEL = "claude-sonnet-4-6";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
const masterKeyB64 = process.env.BYOK_ENCRYPTION_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

if (!supabaseUrl || !supabaseSecret) {
  fail("missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in env");
}
if (!masterKeyB64) fail("missing BYOK_ENCRYPTION_KEY in env");
if (!anthropicKey) fail("missing ANTHROPIC_API_KEY in env");

const masterKey = Buffer.from(masterKeyB64, "base64");
if (masterKey.length !== 32) {
  fail(`BYOK_ENCRYPTION_KEY must decode to 32 bytes, got ${masterKey.length}`);
}

const supabase = createClient(supabaseUrl, supabaseSecret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const userId = await findUserIdByEmail(TARGET_EMAIL);
if (!userId) fail(`no user found with email ${TARGET_EMAIL}`);

const blob = encrypt(anthropicKey.trim());
const last4 = anthropicKey.trim().slice(-4);

const { error: upsertErr } = await supabase
  .from("user_provider_keys")
  .upsert({
    user_id: userId,
    provider: PROVIDER,
    ciphertext: bytesToHex(blob.ciphertext),
    iv: bytesToHex(blob.iv),
    auth_tag: bytesToHex(blob.authTag),
    last4,
    updated_at: new Date().toISOString(),
  });
if (upsertErr) fail(`upsert failed: ${upsertErr.message}`);

const { error: profileErr } = await supabase
  .from("user_profiles")
  .upsert({
    user_id: userId,
    active_provider: PROVIDER,
    active_model: DEFAULT_MODEL,
    updated_at: new Date().toISOString(),
  });
if (profileErr) fail(`profile upsert failed: ${profileErr.message}`);

console.log(
  `seeded last4=…${last4} provider=${PROVIDER} model=${DEFAULT_MODEL} for ${TARGET_EMAIL}`,
);

function encrypt(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag };
}

function bytesToHex(buf) {
  return `\\x${buf.toString("hex")}`;
}

async function findUserIdByEmail(email) {
  const target = email.toLowerCase();
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) fail(`listUsers failed: ${error.message}`);
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
    page += 1;
    if (page > 50) return null;
  }
}

function loadDotEnvLocal() {
  try {
    const raw = readFileSync(
      new URL("../.env.local", import.meta.url),
      "utf8",
    );
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // .env.local optional; rely on existing env vars
  }
}

function fail(msg) {
  console.error(`seed-byok-key: ${msg}`);
  process.exit(1);
}
