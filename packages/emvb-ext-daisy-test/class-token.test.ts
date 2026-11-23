import { describe, expect, test } from "bun:test";
import { prefixClassToken } from "./class-token.ts";

describe("prefixClassToken", () => {
  test("a component class gets the prefix", () => {
    expect(prefixClassToken("btn")).toBe("daisy-btn");
    expect(prefixClassToken("size-24!")).toBe("daisy-size-24!");
    expect(prefixClassToken("max-sm:timeline-vertical")).toBe("daisy-max-sm:timeline-vertical");
  });
  test("a per-instance variable is renamed to daisyUI's prefixed variable", () => {
    expect(prefixClassToken("[--value:70]")).toBe("daisy-[--daisy-value:70]");
    expect(prefixClassToken("[--digits:2]")).toBe("daisy-[--daisy-digits:2]");
  });
});
