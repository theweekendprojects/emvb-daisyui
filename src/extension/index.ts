/**
 * The daisyUI extension for EmVB (extensionApi 1.x).
 *
 * Register it in the site config:
 *   emvb({ extensions: [daisyUIExtension] })
 * The stylesheet and runtime listed here load only on pages that render one of its elements.
 */
import { CLASSES_FOR_EXTENSION } from "./classes.ts";
import { daisyElements } from "./elements.ts";
import { DAISY_COMPONENT_CATALOG } from "../catalog/index.ts";
import { COLUMNS } from "../catalog/layout-marketing.ts";

export const daisyUIExtension = {
  extensionApi: 1 as const,
  id: "daisyui",
  label: "daisyUI",
  classes: CLASSES_FOR_EXTENSION,
  styles: ["@perkyzz/emvb-daisyui/styles.css"],
  runtime: ["@perkyzz/emvb-daisyui/runtime"],
  elements: daisyElements([...DAISY_COMPONENT_CATALOG, COLUMNS]),
};
