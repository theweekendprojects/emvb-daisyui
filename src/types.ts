/** Field kinds the daisyUI catalog declares. Local copies of the shapes EmVB's extension output takes. */
export type DaisyFieldKind =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "boolean"
  | "href"
  | "datetime"
  | "media";
export type DaisyFieldValue = string | number | boolean;
export type DaisyProps = Record<string, DaisyFieldValue | undefined>;
/** A markup tree: a tag, its attributes (undefined values are skipped) and its children. */
export interface DaisyVNode {
  tag: string;
  attrs: Record<string, string | undefined>;
  children: Array<DaisyVNode | string>;
}
export interface DaisyComponentNode {
  id: string;
  type: "provider";
  provider: "daisyui";
  component: string;
  props: DaisyProps;
  providerMeta?: Record<string, DaisyFieldValue>;
  /** Name shown in the editor's Layers panel. Compound parts (slides, tabs, rows) get one. */
  editorLabel?: string;
  children?: DaisyComponentNode[];
}

export interface DaisyFieldDefinition {
  key: string;
  label: string;
  kind: DaisyFieldKind;
  default: DaisyFieldValue;
  options?: readonly string[];
  /** Panel text for an option; unset options show their value in title case. */
  optionLabels?: Readonly<Record<string, string>>;
  classMap?: Readonly<Record<string, string>>;
  attribute?: string;
  textContent?: boolean;
}

export interface DaisyComponentDefinition {
  id: string;
  label: string;
  category:
    | "Actions"
    | "Data display"
    | "Feedback"
    | "Layout"
    | "Marketing"
    | "Navigation"
    | "Interactive";
  tag: string;
  rootClass: string;
  fields: readonly DaisyFieldDefinition[];
  container?: boolean;
  role?: string;
  /** Props computed each time a node is created, on top of the fields' static defaults. */
  initial?: () => DaisyProps;
  build?: (
    node: DaisyComponentNode,
    classes: string[],
    children: DaisyVNode[],
    options?: DaisyRenderOptions,
  ) => DaisyVNode;
}

export interface GeneratedDaisyComponent {
  definition: DaisyComponentDefinition;
  descriptor: {
    type: "provider";
    provider: "daisyui";
    component: string;
    name: string;
    group: "content";
    defaultTab: "content";
    category?: string;
    /** True when the component holds child elements (see the descriptor of the stored provider node). */
    container?: boolean;
    /** False hides the Add panel tile; existing nodes still render (see the descriptor of the stored provider node). */
    addPanel?: boolean;
    support?: "verified" | "experimental";
    icon?: string;
    keywords?: readonly string[];
    order?: number;
    fields: Array<{
      key: string;
      kind: DaisyFieldKind;
      label: string;
      options?: Array<{ value: string; label: string }>;
    }>;
  };
  defaults: () => Omit<DaisyComponentNode, "id">;
  build: (
    node: DaisyComponentNode,
    attrs?: Record<string, string>,
    children?: DaisyVNode[],
    options?: DaisyRenderOptions,
  ) => DaisyVNode;
}

export interface DaisyRenderer {
  components: ReadonlyMap<string, GeneratedDaisyComponent>;
  createNode(component: string, id: string): DaisyComponentNode;
  render(
    node: DaisyComponentNode,
    attrs?: Record<string, string>,
    children?: DaisyVNode[],
    context?: { mode: "editor" | "public" },
  ): DaisyVNode;
}

/** Render options: only the editor canvas differs from the public page. */
export type DaisyRenderOptions = { mode?: "editor" | "public" };
