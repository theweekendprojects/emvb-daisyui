import { expect, test } from "bun:test";
import { daisyRenderer } from "../renderer.ts";
import { nodeFor } from "./content.ts";
import { partElementFor } from "./elements.ts";

const HOSTILE = "javascript:alert(1)";
const GOOD = "https://example.com/photo.jpg";

test("a card photo keeps a safe URL and drops a javascript: one", () => {
  const render = (image: string) =>
    JSON.stringify(daisyRenderer.render(nodeFor("card", { image }), {}, [], { mode: "public" }));
  expect(render(GOOD)).toContain(`src":"${GOOD}"`);
  expect(render(HOSTILE)).not.toContain("javascript:");
});

test("a carousel slide photo keeps a safe URL and drops a javascript: one", () => {
  const slide = partElementFor("carousel");
  const render = (image: string) =>
    JSON.stringify(slide.render({ label: "Slide", image, alt: "x" }, { mode: "public" }).markup);
  expect(render(GOOD)).toContain(`src":"${GOOD}"`);
  expect(render(HOSTILE)).not.toContain("javascript:");
});
