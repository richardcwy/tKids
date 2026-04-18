import { env } from "@my-better-t-app/env/server";

// Verifies a Cloudflare Turnstile token against the siteverify endpoint.
// In dev (no TURNSTILE_SECRET_KEY set) we accept any non-empty token so the
// signup flow is testable without the widget being real.
export async function verifyTurnstile(
  token: string,
  ip: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  if (!env.TURNSTILE_SECRET_KEY) {
    if (!token) return { ok: false, reason: "missing_token" };
    return { ok: true };
  }

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
          ...(ip ? { remoteip: ip } : {}),
        }),
      },
    );
    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };
    if (data.success) return { ok: true };
    return { ok: false, reason: data["error-codes"]?.[0] ?? "turnstile_failed" };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "turnstile_network_error",
    };
  }
}
