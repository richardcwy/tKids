import { describe, expect, test } from "bun:test";
import { isAgeOk, MIN_AGE } from "./age";

describe("isAgeOk", () => {
  const YEAR = 2026;

  test("someone born 13+ years ago is allowed", () => {
    expect(isAgeOk(YEAR - 13, YEAR)).toBe(true);
    expect(isAgeOk(YEAR - 25, YEAR)).toBe(true);
    expect(isAgeOk(1990, YEAR)).toBe(true);
  });

  test("someone born < 13 years ago is blocked", () => {
    expect(isAgeOk(YEAR - 12, YEAR)).toBe(false);
    expect(isAgeOk(YEAR - 5, YEAR)).toBe(false);
    expect(isAgeOk(YEAR - 0, YEAR)).toBe(false);
  });

  test("boundary: born exactly MIN_AGE years ago passes", () => {
    expect(isAgeOk(YEAR - MIN_AGE, YEAR)).toBe(true);
  });

  test("boundary: one year too young fails", () => {
    expect(isAgeOk(YEAR - (MIN_AGE - 1), YEAR)).toBe(false);
  });

  test("rejects non-finite input", () => {
    expect(isAgeOk(NaN, YEAR)).toBe(false);
    expect(isAgeOk(Infinity, YEAR)).toBe(false);
    expect(isAgeOk(YEAR - 20, NaN)).toBe(false);
  });

  test("birthYear in the future is blocked (obviously)", () => {
    expect(isAgeOk(YEAR + 1, YEAR)).toBe(false);
  });
});
