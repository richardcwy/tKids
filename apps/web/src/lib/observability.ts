import { env } from "@my-better-t-app/env/server";

// Lightweight error reporting that does not pull in the @sentry/cloudflare
// SDK (which has its own setup overhead). If you need full transactions /
// performance monitoring later, swap this out for the official SDK — the
// public API stays the same.
//
// Strategy:
//   1. Always console.error so logs land in `wrangler tail` / Workers Logs.
//   2. If SENTRY_DSN is set, POST to Sentry's envelope endpoint.
//   3. If DISCORD_ALERT_WEBHOOK is set, POST a formatted message there.
//      Useful as a "the founder sees the alert immediately on phone" sink.
//
// All sinks are best-effort: a failure here must NEVER block the user-
// facing response.

export type CaptureContext = {
  /** Where the error happened, e.g. "subscribe", "/api/rpc/[...path]". */
  source?: string;
  /** Tagged metadata: request method, route, etc. */
  tags?: Record<string, string>;
  /** Free-form context: input shape, etc. (no PII). */
  extra?: Record<string, unknown>;
};

export function captureException(
  error: unknown,
  ctx: CaptureContext = {},
): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[capture] ${ctx.source ?? "unknown"}: ${message}`, {
    ...ctx,
    stack,
  });

  // Fire-and-forget. Use waitUntil if available (passed from the route
  // handler); otherwise just let the promise hang.
  void Promise.allSettled([
    sendToSentry(message, stack, ctx),
    sendToDiscord(message, ctx),
  ]);
}

async function sendToSentry(
  message: string,
  stack: string | undefined,
  ctx: CaptureContext,
): Promise<void> {
  if (!env.SENTRY_DSN) return;
  try {
    // Parse Sentry DSN: https://<key>@<host>/<projectId>
    const url = new URL(env.SENTRY_DSN);
    const projectId = url.pathname.replace(/^\//, "");
    const publicKey = url.username;
    const endpoint = `https://${url.host}/api/${projectId}/envelope/`;

    const eventId = crypto.randomUUID().replace(/-/g, "");
    const timestamp = Date.now() / 1000;

    const envelopeHeader = JSON.stringify({
      event_id: eventId,
      sent_at: new Date().toISOString(),
      dsn: env.SENTRY_DSN,
    });
    const itemHeader = JSON.stringify({ type: "event" });
    const eventBody = JSON.stringify({
      event_id: eventId,
      timestamp,
      level: "error",
      message: { formatted: message },
      exception: stack
        ? {
            values: [
              {
                type: "Error",
                value: message,
                stacktrace: { frames: parseStackFrames(stack) },
              },
            ],
          }
        : undefined,
      tags: { source: ctx.source ?? "unknown", ...ctx.tags },
      extra: ctx.extra,
      environment: env.NODE_ENV,
      platform: "javascript",
      release: "tkids@launch",
    });

    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=tkids/0.1`,
      },
      body: `${envelopeHeader}\n${itemHeader}\n${eventBody}\n`,
    });
  } catch {
    // Swallow — observability never blocks the user response.
  }
}

function parseStackFrames(stack: string): Array<Record<string, unknown>> {
  return stack
    .split("\n")
    .slice(1, 11)
    .map((line) => {
      const m = line.match(/at (?:(.+?) )?\(?(.+?):(\d+):(\d+)\)?$/);
      if (!m) return { filename: line.trim() };
      return {
        function: m[1] ?? "<anonymous>",
        filename: m[2],
        lineno: Number(m[3]),
        colno: Number(m[4]),
        in_app: !m[2]!.includes("node_modules"),
      };
    });
}

async function sendToDiscord(
  message: string,
  ctx: CaptureContext,
): Promise<void> {
  if (!env.DISCORD_ALERT_WEBHOOK) return;
  try {
    await fetch(env.DISCORD_ALERT_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "tkids.tw alert",
        embeds: [
          {
            title: `❗ ${ctx.source ?? "unknown"}`,
            description: `\`\`\`${truncate(message, 1500)}\`\`\``,
            color: 0xff6a85,
            fields: Object.entries(ctx.tags ?? {}).map(([name, value]) => ({
              name,
              value: String(value),
              inline: true,
            })),
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch {
    // Swallow.
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}
