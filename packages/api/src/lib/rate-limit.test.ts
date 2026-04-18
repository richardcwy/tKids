import { describe, expect, test } from "bun:test";
import { computeWindow } from "./rate-limit-window";

describe("computeWindow", () => {
  const MIN = 60_000;

  test("snaps now to the start of a minute", () => {
    // Mon, 2026-04-18 10:00:00 UTC = 1776506400000 (exact minute boundary)
    const now = 1776506400000 + 37_000; // :37 past the minute
    const { windowStart } = computeWindow(now, MIN);
    expect(windowStart).toBe(1776506400000);
  });

  test("next bucket retry is 1-60 seconds", () => {
    const now = Date.now();
    const { retryAfterSeconds } = computeWindow(now, MIN);
    expect(retryAfterSeconds).toBeGreaterThan(0);
    expect(retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  test("samples across a minute always land in [0, 60000)", () => {
    for (let s = 0; s < 60; s++) {
      const now = 1776506400000 + s * 1000;
      const { windowStart, retryAfterSeconds } = computeWindow(now, MIN);
      const within = now - windowStart;
      expect(within).toBeGreaterThanOrEqual(0);
      expect(within).toBeLessThan(60_000);
      expect(retryAfterSeconds).toBeGreaterThan(0);
      expect(retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  test("samples exactly at the boundary retry in 60s, not 0s", () => {
    const boundary = 1776506400000;
    const { retryAfterSeconds } = computeWindow(boundary, MIN);
    expect(retryAfterSeconds).toBe(60);
  });

  test("different window sizes snap correctly", () => {
    // 5-minute window
    const now = 1776506400000 + 3 * 60_000 + 7_000; // 3m 7s into
    const { windowStart } = computeWindow(now, 5 * 60_000);
    expect(windowStart).toBe(1776506400000);
  });
});
