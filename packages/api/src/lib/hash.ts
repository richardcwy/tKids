// SHA-256 hex digest using the Web Crypto API (Cloudflare Workers native).
// Used to hash IP and UA for audit logs without storing raw PII.
export async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
