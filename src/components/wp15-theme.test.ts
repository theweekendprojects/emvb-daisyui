import { describe, expect, test } from "bun:test";
import { createDaisyRenderer } from "../render/provider.ts";
import { DAISY_COMPONENT_CATALOG } from "../catalog/index.ts";

describe("WP15 default and component theme activation", () => {
  test("Daisy theme metadata remains outside semantic component props", () => {
    const provider = createDaisyRenderer(DAISY_COMPONENT_CATALOG);
    const button = provider.createNode("button", "button-theme");
    button.providerMeta = { theme: "corporate" };
    expect(button.props.theme).toBeUndefined();
    expect(button.providerMeta.theme).toBe("corporate");
  });
});
