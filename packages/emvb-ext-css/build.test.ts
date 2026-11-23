import { describe, expect, test } from "bun:test";
import { unvariantSelectors, variantFirst } from "./build.ts";

describe("variant-first class names", () => {
  test("a breakpoint class is asked for variant first; others are left alone", () => {
    expect(variantFirst("daisy-max-sm:timeline-vertical")).toBe("max-sm:daisy-timeline-vertical");
    expect(variantFirst("daisy-sm:footer-horizontal")).toBe("sm:daisy-footer-horizontal");
    expect(variantFirst("daisy-lg:flex")).toBe("lg:daisy-flex");
    expect(variantFirst("daisy-btn")).toBe("daisy-btn");
    expect(variantFirst("daisy-[--value:70]")).toBe("daisy-[--value:70]");
    expect(variantFirst("daisy-hover:btn")).toBe("daisy-hover:btn");
  });
  test("the built selector is renamed back to the prefix-first name", () => {
    const css = ".daisy-timeline-compact.max-sm\\:daisy-timeline-vertical > li { gap: 0 }";
    expect(unvariantSelectors(css, ["daisy-max-sm:timeline-vertical"])).toBe(
      ".daisy-timeline-compact.daisy-max-sm\\:timeline-vertical > li { gap: 0 }",
    );
  });
});
