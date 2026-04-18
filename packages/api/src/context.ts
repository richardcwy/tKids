import { auth } from "@my-better-t-app/auth";

// Context passed by the Astro /api/rpc/[...path].ts handler.
// Web-standard Request + extracted IP (Cloudflare sets cf-connecting-ip)
// + UA for rate-limit and audit logging without re-parsing headers per
// procedure.
export type CreateContextOptions = {
  request: Request;
  ip: string;
  userAgent: string;
};

export async function createContext(opts: CreateContextOptions) {
  const session = await auth.api.getSession({ headers: opts.request.headers });
  return {
    session,
    request: opts.request,
    ip: opts.ip,
    userAgent: opts.userAgent,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
