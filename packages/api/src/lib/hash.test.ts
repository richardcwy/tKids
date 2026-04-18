import { describe, expect, test } from "bun:test";
import { sha256 } from "./hash";

describe("sha256", () => {
  test("empty string has a known hex digest", async () => {
    const got = await sha256("");
    expect(got).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  test("hex output is always 64 chars", async () => {
    for (const s of ["a", "ab", "hello", "192.168.1.1", "Mozilla/5.0"]) {
      const got = await sha256(s);
      expect(got).toHaveLength(64);
      expect(got).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  test("is deterministic", async () => {
    const a = await sha256("192.168.1.1");
    const b = await sha256("192.168.1.1");
    expect(a).toBe(b);
  });

  test("different inputs produce different hashes", async () => {
    const a = await sha256("192.168.1.1");
    const b = await sha256("192.168.1.2");
    expect(a).not.toBe(b);
  });
});
