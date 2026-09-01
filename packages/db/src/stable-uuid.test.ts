import { describe, expect, it } from "vitest";
import { stableUuid } from "./stable-uuid";

describe("stableUuid", () => {
  it("같은 이름은 항상 같은 uuid — 시드 재실행에도 id가 유지된다", () => {
    expect(stableUuid("notice:n-2026-08-luca")).toBe(stableUuid("notice:n-2026-08-luca"));
  });

  it("다른 이름은 다른 uuid", () => {
    expect(stableUuid("user:demo-new")).not.toBe(stableUuid("user:demo-heavy"));
  });

  it("uuid v5 형식(버전·variant 비트)을 만족한다", () => {
    const id = stableUuid("user:official");
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
