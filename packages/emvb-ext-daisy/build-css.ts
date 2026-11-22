/**
 * Regenerates daisy.css from the extension's own class allow list, through the shared builder in
 * packages/emvb-ext-css (same theme rules as every other EmVB daisyUI extension).
 * Hand-written utilities live in extras.css and are appended.
 *
 * Run: bun run packages/emvb-ext-daisy/build-css.ts   (after `bun install` in packages/emvb-ext-css)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDaisyCss } from "../emvb-ext-css/build.ts";
import { daisyExtension } from "./index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const extras = readFileSync(join(here, "extras.css"), "utf8");
const css = buildDaisyCss({ name: "shipped", classes: daisyExtension.classes.allow, extras });
writeFileSync(join(here, "daisy.css"), css);
console.log(`daisy.css ${css.length} bytes, ${daisyExtension.classes.allow.length} allowed classes`);
