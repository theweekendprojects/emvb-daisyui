import { DAISY_COMPONENT_CATALOG } from "./catalog/index.ts";
import { COLUMNS } from "./catalog/layout-marketing.ts";
import { createDaisyRenderer } from "./render/provider.ts";

/** The daisyUI renderer for the catalog. The extension calls it; nothing is registered globally. */
export const daisyRenderer = createDaisyRenderer([...DAISY_COMPONENT_CATALOG, COLUMNS]);
