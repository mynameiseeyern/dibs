import { Marked, type Tokens } from "marked";
import { fonts, light } from "./theme";

// Markdown to email-safe HTML: every element gets inline styles, because Gmail drops
// most of a <style> block. Supports headings, paragraphs, lists, bold, links, inline code,
// images, horizontal rules and > callouts.

const L = light;

const md = new Marked({ gfm: true, breaks: false });

md.use({
  renderer: {
    heading({ tokens, depth }: Tokens.Heading) {
      const text = this.parser.parseInline(tokens);
      if (depth === 1)
        return `<h1 class="db-text" style="margin:0 0 12px;font:800 30px/36px ${fonts.display};letter-spacing:-0.01em;color:${L["text-strong-950"]};">${text}</h1>\n`;
      if (depth === 2)
        return `<h2 class="db-text" style="margin:28px 0 8px;font:700 20px/26px ${fonts.display};color:${L["text-strong-950"]};">${text}</h2>\n`;
      return `<h3 class="db-text" style="margin:20px 0 4px;font:700 16px/22px ${fonts.sans};color:${L["text-strong-950"]};">${text}</h3>\n`;
    },
    paragraph({ tokens }: Tokens.Paragraph) {
      return `<p style="margin:0 0 16px;">${this.parser.parseInline(tokens)}</p>\n`;
    },
    list(token: Tokens.List) {
      const tag = token.ordered ? "ol" : "ul";
      const items = token.items.map((item) => this.listitem(item)).join("");
      return `<${tag} style="margin:0 0 16px;padding:0 0 0 22px;">${items}</${tag}>\n`;
    },
    listitem(item: Tokens.ListItem) {
      const inner = this.parser.parse(item.tokens).replace(/^<p style="margin:0 0 16px;">([\s\S]*)<\/p>\n?$/, "$1");
      return `<li style="margin:0 0 8px;padding-left:2px;">${inner}</li>`;
    },
    strong({ tokens }: Tokens.Strong) {
      return `<strong style="font-weight:700;">${this.parser.parseInline(tokens)}</strong>`;
    },
    link({ href, title, tokens }: Tokens.Link) {
      const t = title ? ` title="${title}"` : "";
      return `<a href="${href}"${t} style="color:${L["primary-dark"]};font-weight:600;text-decoration:underline;">${this.parser.parseInline(tokens)}</a>`;
    },
    codespan({ text }: Tokens.Codespan) {
      return `<code class="db-code" style="font:500 14px ${fonts.mono};background:${L["bg-soft-200"]};color:${L["text-strong-950"]};padding:2px 6px;border-radius:6px;">${text}</code>`;
    },
    image({ href, title, text }: Tokens.Image) {
      const t = title ? ` title="${title}"` : "";
      return `<img src="${href}" alt="${text}"${t} width="496" style="width:100%;max-width:496px;height:auto;border-radius:16px;margin:4px 0 16px;">`;
    },
    hr() {
      return `<hr class="db-rule" style="border:0;border-top:1px solid ${L["stroke-soft-200"]};margin:28px 0;">\n`;
    },
    blockquote({ tokens }: Tokens.Blockquote) {
      const inner = this.parser.parse(tokens).replace(/margin:0 0 16px;/g, "margin:0;");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;"><tr><td class="db-callout" style="background:${L["primary-lighter"]};border-radius:16px;padding:16px 20px;">${inner}</td></tr></table>\n`;
    },
  },
});

export function markdownToEmailHtml(markdown: string): string {
  return md.parse(markdown, { async: false }) as string;
}

/** Plain-text version for the text/plain part. Inboxes trust mail more when it has one. */
export function markdownToText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
