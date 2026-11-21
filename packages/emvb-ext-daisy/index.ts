/**
 * daisyUI for EmVB 1.4, extension API only (no provider API). First slice: button, badge, card.
 * Every element returns built-in nodes; daisy classes go in extClasses (prefix `daisy-`).
 * The stylesheet is generated with daisyUI's prefix option and flattened (no @layer).
 */
export const daisyExtension = {
  extensionApi: 1 as const,
  id: "emvb-ext-daisy",
  label: "daisyUI",
  module: import.meta.url,
  classes: {
    prefix: "daisy-",
    allow: [
      "daisy-badge", "daisy-badge-md", "daisy-badge-neutral",
      "daisy-btn", "daisy-btn-md", "daisy-btn-primary",
      "daisy-card", "daisy-card-body", "daisy-card-md", "daisy-card-title",
      "daisy-mx-auto", "daisy-my-4", "daisy-w-fit",
    ],
  },
  css: "./daisy.css",
  elements: [
    {
      name: "btn",
      label: "Button",
      group: "content",
      schema: { type: "object", properties: { text: { type: "string", maxLength: 80, default: "Button" } } },
      fields: [{ key: "text", kind: "text", label: "Label" }],
      defaults: () => ({ text: "Button" }),
      render: (props: Record<string, unknown>) => ({
        id: "btn00001",
        type: "button",
        props: { text: String(props.text ?? "Button") },
        extClasses: ["daisy-btn", "daisy-btn-primary", "daisy-btn-md", "daisy-w-fit", "daisy-mx-auto", "daisy-my-4"],
      }),
    },
    {
      name: "badge",
      label: "Badge",
      group: "content",
      schema: { type: "object", properties: { text: { type: "string", maxLength: 80, default: "Badge" } } },
      fields: [{ key: "text", kind: "text", label: "Label" }],
      defaults: () => ({ text: "Badge" }),
      render: (props: Record<string, unknown>) => ({
        id: "bdg00001",
        type: "label",
        props: { text: String(props.text ?? "Badge") },
        extClasses: ["daisy-badge", "daisy-badge-neutral", "daisy-badge-md", "daisy-w-fit", "daisy-mx-auto", "daisy-my-4"],
      }),
    },
    {
      name: "card",
      label: "Card",
      group: "content",
      schema: {
        type: "object",
        properties: {
          title: { type: "string", maxLength: 120, default: "Card title" },
          body: { type: "string", maxLength: 400, default: "Add supporting content to this card." },
        },
      },
      fields: [
        { key: "title", kind: "text", label: "Title" },
        { key: "body", kind: "text", label: "Text" },
      ],
      defaults: () => ({ title: "Card title", body: "Add supporting content to this card." }),
      render: (props: Record<string, unknown>) => ({
        id: "crd00001",
        type: "container",
        props: {},
        extClasses: ["daisy-card", "daisy-card-md", "daisy-mx-auto", "daisy-my-4"],
        children: [
          {
            id: "crd00002",
            type: "container",
            props: {},
            extClasses: ["daisy-card-body"],
            children: [
              { id: "crd00003", type: "heading", props: { text: String(props.title ?? "Card title"), level: 2 }, extClasses: ["daisy-card-title"] },
              { id: "crd00004", type: "text", props: { text: String(props.body ?? "") } },
            ],
          },
        ],
      }),
    },
  ],
};
export default daisyExtension;
