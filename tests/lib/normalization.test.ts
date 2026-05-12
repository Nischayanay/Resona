import { describe, expect, it } from "vitest";
import { normalizeName, parseOptionalDate } from "@/lib/processing/normalization";

describe("normalization helpers", () => {
  it("normalizes names for deterministic matching", () => {
    expect(normalizeName("  Rahul   Sharma ")).toBe("rahul sharma");
  });

  it("parses concrete dates and leaves ambiguous dates unresolved", () => {
    expect(parseOptionalDate("2026-05-15T16:00:00+05:30")).toBe("2026-05-15T10:30:00.000Z");
    expect(parseOptionalDate("next Friday afternoon")).toBeNull();
    expect(parseOptionalDate()).toBeNull();
  });
});
