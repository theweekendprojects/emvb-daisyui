import { generateComponent } from "../generator/generate.ts";
import type {
  DaisyRenderer,
  DaisyComponentDefinition,
  DaisyComponentNode,
  GeneratedDaisyComponent,
  DaisyVNode,
} from "../types.ts";
import { isCompoundPart, renderCompoundNode } from "../compound/index.ts";
import { nodeForRender, type DaisyRenderContext } from "../runtime/index.ts";

/** Builds the daisyUI renderer: its components, node factory and markup render. No registration. */
export function createDaisyRenderer(definitions: readonly DaisyComponentDefinition[]): DaisyRenderer {
  const components = new Map<string, GeneratedDaisyComponent>(
    definitions.map((definition) => [definition.id, generateComponent(definition)]),
  );
  return {
    components,
    createNode(component, id) {
      const generated = components.get(component);
      if (!generated) throw new Error(`Unknown daisyUI component: ${component}`);
      return { id, ...generated.defaults() };
    },
    render(
      node: DaisyComponentNode,
      attrs: Record<string, string> = {},
      children: DaisyVNode[] = [],
      context: DaisyRenderContext = { mode: "public" },
    ) {
      const prepared = nodeForRender(node, context);
      if (isCompoundPart(prepared.component)) return renderCompoundNode(prepared, children);
      const generated = components.get(prepared.component);
      if (!generated) throw new Error(`Unknown daisyUI component: ${node.component}`);
      return generated.build(prepared, attrs, children, { mode: context.mode });
    },
  };
}
