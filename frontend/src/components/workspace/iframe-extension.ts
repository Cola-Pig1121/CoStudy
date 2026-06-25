import { Node, mergeAttributes } from "@tiptap/core";

/**
 * 自定义 TipTap 扩展：嵌入外部网页 (iframe)。
 * 支持 YouTube、Bilibili、通用 embed URL。
 */
export const Iframe = Node.create({
  name: "iframe",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      width: { default: "100%" },
      height: { default: "400" },
      title: { default: "嵌入内容" },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-iframe]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-iframe": "", class: "my-4 rounded-xl overflow-hidden border border-gray-200" }),
      [
        "iframe",
        {
          src: HTMLAttributes.src,
          width: HTMLAttributes.width,
          height: HTMLAttributes.height,
          title: HTMLAttributes.title,
          style: "border:none;width:100%",
          allowfullscreen: "true",
        },
      ],
    ];
  },
  addCommands() {
    return {
      setIframe:
        (options: { src: string; title?: string; height?: string }) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              title: options.title ?? "嵌入内容",
              height: options.height ?? "400",
            },
          });
        },
    } as any;
  },
});
