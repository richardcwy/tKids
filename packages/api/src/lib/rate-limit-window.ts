// Pure helper — extracted so tests can run without pulling in the DB
// layer (which eagerly instantiates env-validated clients).
export function computeWindow(now: number, windowMs: number) {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const retryAfterSeconds = Math.ceil((windowStart + windowMs - now) / 1000);
  return { windowStart, retryAfterSeconds };
}
