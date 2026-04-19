#!/usr/bin/env bun
/**
 * Dumps the Turso (libSQL) database to a .sql file and (optionally)
 * uploads it to Cloudflare R2 via the S3-compatible API.
 *
 * Why a script and not a scheduled Worker?
 *   Scheduled Workers conflict with Astro's fetch-only Cloudflare
 *   adapter (different entry-point shape). Running this via GitHub
 *   Actions cron is simpler, auditable in the Actions tab, and reuses
 *   the same secrets set up for deploy.
 *
 * Env required:
 *   DATABASE_URL           — Turso libsql:// URL
 *   DATABASE_AUTH_TOKEN    — Turso auth JWT
 *
 * Env optional (if any missing, script prints the dump to stdout):
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET              — defaults to "tkids-backups"
 *
 * Usage:
 *   bun run scripts/backup-turso.ts             # writes local.sql.gz
 *   BACKUP_STDOUT=1 bun run scripts/backup-turso.ts > dump.sql
 */
import { createClient } from "@libsql/client";
import { gzipSync } from "node:zlib";
import { writeFile } from "node:fs/promises";

function env(name: string): string | undefined {
  return process.env[name] || undefined;
}
function required(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function dumpDb(): Promise<string> {
  const client = createClient({
    url: required("DATABASE_URL"),
    authToken: env("DATABASE_AUTH_TOKEN") ?? "",
  });

  // List user tables (skip sqlite_ internals).
  const tablesRes = await client.execute({
    sql: "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' ORDER BY name",
    args: [],
  });

  const lines: string[] = [
    "-- tKids Turso dump",
    `-- generated: ${new Date().toISOString()}`,
    "PRAGMA foreign_keys = OFF;",
    "BEGIN TRANSACTION;",
  ];

  for (const row of tablesRes.rows) {
    const name = String(row["name"]);
    const createSql = String(row["sql"]);
    lines.push("");
    lines.push(`-- ${name}`);
    lines.push(`DROP TABLE IF EXISTS "${name}";`);
    lines.push(`${createSql};`);

    const dataRes = await client.execute({
      sql: `SELECT * FROM "${name}"`,
      args: [],
    });
    const cols = dataRes.columns.map((c) => `"${c}"`).join(", ");
    for (const r of dataRes.rows) {
      const values = dataRes.columns
        .map((c) => formatValue(r[c]))
        .join(", ");
      lines.push(`INSERT INTO "${name}" (${cols}) VALUES (${values});`);
    }
  }

  lines.push("COMMIT;");
  return lines.join("\n");
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "boolean") return v ? "1" : "0";
  if (v instanceof Uint8Array) {
    return `X'${Array.from(v).map((b) => b.toString(16).padStart(2, "0")).join("")}'`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

// --- R2 upload (S3-compatible signed PUT) ------------------------------------
async function uploadToR2(
  bucket: string,
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  const accountId = required("R2_ACCOUNT_ID");
  const accessKey = required("R2_ACCESS_KEY_ID");
  const secretKey = required("R2_SECRET_ACCESS_KEY");
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const url = `${endpoint}/${bucket}/${key}`;

  const { headers } = await signS3Put({
    method: "PUT",
    url,
    body,
    contentType,
    accessKey,
    secretKey,
    region: "auto",
  });

  const res = await fetch(url, { method: "PUT", headers, body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 upload failed (${res.status}): ${text}`);
  }
}

// Minimal AWS SigV4 signing for R2 (region=auto, service=s3).
async function signS3Put(args: {
  method: "PUT";
  url: string;
  body: Uint8Array;
  contentType: string;
  accessKey: string;
  secretKey: string;
  region: string;
}): Promise<{ headers: Record<string, string> }> {
  const u = new URL(args.url);
  const now = new Date();
  const isoBasic = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = isoBasic.slice(0, 8);
  const host = u.host;
  const payloadHash = await sha256Hex(args.body);
  const canonicalUri = u.pathname;
  const canonicalHeaders =
    `content-type:${args.contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${isoBasic}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    args.method,
    canonicalUri,
    "", // query
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${args.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    isoBasic,
    credentialScope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest)),
  ].join("\n");

  const kDate = await hmac(`AWS4${args.secretKey}`, dateStamp);
  const kRegion = await hmac(kDate, args.region);
  const kService = await hmac(kRegion, "s3");
  const kSigning = await hmac(kService, "aws4_request");
  const signature = toHex(await hmac(kSigning, stringToSign));

  const auth =
    `AWS4-HMAC-SHA256 Credential=${args.accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    headers: {
      "Content-Type": args.contentType,
      Host: host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": isoBasic,
      Authorization: auth,
    },
  };
}

async function sha256Hex(input: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", input);
  return toHex(new Uint8Array(buf));
}
function toHex(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
async function hmac(key: string | Uint8Array, data: string): Promise<Uint8Array> {
  const keyBytes = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const k = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    k,
    new TextEncoder().encode(data),
  );
  return new Uint8Array(sig);
}

// --- main --------------------------------------------------------------------
async function main() {
  const sql = await dumpDb();
  console.error(`[backup] dumped ${sql.length} bytes of SQL`);

  if (process.env.BACKUP_STDOUT === "1") {
    process.stdout.write(sql);
    return;
  }

  const gz = gzipSync(Buffer.from(sql, "utf8"));
  const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const fileName = `turso-${stamp}.sql.gz`;

  // Always write a local copy so Actions runs preserve an artifact.
  await writeFile(fileName, gz);
  console.error(`[backup] wrote ${fileName} (${gz.length} bytes gzipped)`);

  const haveR2 =
    env("R2_ACCOUNT_ID") && env("R2_ACCESS_KEY_ID") && env("R2_SECRET_ACCESS_KEY");
  if (haveR2) {
    const bucket = env("R2_BUCKET") ?? "tkids-backups";
    await uploadToR2(bucket, fileName, gz, "application/gzip");
    console.error(`[backup] uploaded s3://${bucket}/${fileName}`);
  } else {
    console.error(
      "[backup] skipping R2 upload — set R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY to enable",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
