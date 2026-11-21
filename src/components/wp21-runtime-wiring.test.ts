import { describe, expect, test } from "bun:test";
import { DAISY_INTERACTIVE_RUNTIME } from "../runtime/browser.ts";
describe("WP21 runtime wiring metadata", () => {
  test("runtime entry is explicit and keyboard/focus capable", () => {
    expect(DAISY_INTERACTIVE_RUNTIME).toContain("showModal");
    expect(DAISY_INTERACTIVE_RUNTIME).toContain("ArrowRight");
    expect(DAISY_INTERACTIVE_RUNTIME).toContain("focus()");
  });
});
