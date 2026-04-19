import { env } from "@my-better-t-app/env/server";

export type WelcomeEmailInput = {
  to: string;
  name: string;
};

// Welcome + subscription-confirmed email.
// In dev (no RESEND_API_KEY) this is a no-op that logs the payload.
export async function sendWelcomeEmail(
  input: WelcomeEmailInput,
): Promise<{ ok: true; id: string }> {
  if (!env.RESEND_API_KEY) {
    console.log("[resend:dev] would send welcome email", {
      to: input.to,
      from: env.RESEND_FROM_EMAIL,
    });
    return { ok: true, id: "dev-stub" };
  }

  const html = buildWelcomeHtml(input);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [input.to],
      reply_to: env.RESEND_REPLY_TO,
      subject: "Welcome to tKids — you're in",
      html,
    }),
  });

  if (!res.ok) {
    throw new Error(`resend_${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string };
  return { ok: true, id: data.id };
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

function buildWelcomeHtml(input: WelcomeEmailInput): string {
  const name = escapeHtml(input.name || input.to.split("@")[0] || "friend");
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Welcome to tKids</title></head>
<body style="font-family:-apple-system,Segoe UI,sans-serif;background:#03061a;color:#e8ecff;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#0a1340;border-radius:16px;padding:40px;">
    <h1 style="font-family:Georgia,serif;font-size:40px;margin:0 0 16px;color:#fff;letter-spacing:-0.02em;">
      t<span style="color:#ffd84a;">★</span>Kids
    </h1>
    <p style="font-size:16px;line-height:1.55;margin:0 0 20px;">Hi ${name},</p>
    <p style="font-size:16px;line-height:1.55;margin:0 0 20px;">
      You're officially on the list. Three kids, one collective —
      a small group of us believed in them first, and now you're one of us.
    </p>
    <p style="font-size:16px;line-height:1.55;margin:0 0 28px;">
      The first EP, <em>Ignite!</em>, drops on <strong>June 1, 2026</strong>.
      We'll send exactly one note when it's out. Nothing else, ever.
    </p>
    <p style="font-size:14px;color:#b8ccff;margin:0;">
      — Team tKids<br>
      <a href="https://tkids.tw" style="color:#5b85ff;">tkids.tw</a>
    </p>
    <hr style="border:0;border-top:1px solid rgba(184,204,255,0.15);margin:32px 0 16px;">
    <p style="font-size:11px;color:#777;line-height:1.5;">
      You received this because you subscribed at tkids.tw.
      Reply to this email to unsubscribe; we'll remove you within 24 hours.
    </p>
  </div>
</body>
</html>`;
}
