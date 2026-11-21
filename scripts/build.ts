// Builds the daisyUI package's dist/ for this repo: the catalog, the extension and their helpers.
import { rm, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const result = await Bun.build({
  entrypoints: [
    join(root, "src/index.ts"),
    join(root, "src/catalog/index.ts"),
    join(root, "src/themes/index.ts"),
    join(root, "src/validation/index.ts"),
    join(root, "src/compatibility/index.ts"),
    join(root, "src/conformance/index.ts"),
    join(root, "src/extension/index.ts"),
  ],
  outdir: dist,
  target: "browser",
  format: "esm",
  splitting: true,
  sourcemap: "external",
  minify: false,
});

if (!result.success) throw new Error(result.logs.map(String).join("\n"));
