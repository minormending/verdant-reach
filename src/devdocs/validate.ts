// Fragment validation for src/devdocs/sections/*.html (CONTRACT.md).
//
// Pure string scanning (no DOM), so the same checks run in the browser at
// load (dev) and in vitest (src/devdocs/sections.test.ts) with Node's fs.

import { CODE_LANGS } from "./names";

export interface Fragment { file: string; html: string }
export interface Problem { file: string; message: string }

export interface Tag {
  name: string;
  close: boolean;
  attrs: Record<string, string>;
  /** Offset in the comment-stripped source. */
  index: number;
}

/** Elements a fragment may use. Anything else is usually an unescaped `<` in code (`Array<string>`). */
const ALLOWED = new Set([
  "section", "h2", "h3", "h4", "p", "a", "ul", "ol", "li", "pre", "code", "figure", "figcaption",
  "details", "summary", "aside", "dfn", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "colgroup", "col", "em", "strong", "b", "i", "u", "s", "kbd", "samp", "var", "br", "hr", "span", "div",
  "dl", "dt", "dd", "sup", "sub", "small", "abbr", "blockquote", "q", "cite", "mark", "time", "wbr",
  "img", "picture", "source", "del", "ins",
]);
/** Elements that are never allowed (CONTRACT.md: plain HTML, no scripts). */
const FORBIDDEN = new Set(["script", "style", "iframe", "object", "embed", "link", "meta", "base", "form", "input", "button", "textarea", "select", "frame", "frameset", "noscript", "template", "svg", "math", "canvas", "video", "audio"]);

const ID_RE = /^[a-z][a-z0-9-]*$/;

export const stripComments = (html: string) => html.replace(/<!--[\s\S]*?-->/g, (m) => " ".repeat(m.length));

/** Every start and end tag, with attributes (values unescaped only for `&amp;`). */
export function scanTags(html: string): Tag[] {
  const src = stripComments(html);
  const out: Tag[] = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)\s*\/?>/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    const attrs: Record<string, string> = {};
    const ar = /([^\s=>/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g;
    for (let a = ar.exec(m[3]); a; a = ar.exec(m[3])) {
      attrs[a[1].toLowerCase()] = (a[2] ?? a[3] ?? a[4] ?? "").replace(/&amp;/g, "&");
    }
    out.push({ name: m[2].toLowerCase(), close: m[1] === "/", attrs, index: m.index });
  }
  return out;
}

export interface ValidateOptions {
  /** Chart names the page can draw. */
  chartNames: readonly string[];
  /** Ids the shell creates (links may target them; fragments must not reuse them). */
  shellIds?: readonly string[];
  /** Does a repository path exist? Omit to skip `data-src` existence checks (the browser). */
  fileExists?: (path: string) => boolean;
}

/** All problems across the fragments, in file order. An empty list means the page will build cleanly. */
export function validateFragments(frags: readonly Fragment[], opts: ValidateOptions): Problem[] {
  const problems: Problem[] = [];
  const shell = new Set(opts.shellIds ?? []);
  const charts = new Set(opts.chartNames);
  const idOwner = new Map<string, string>();
  const links: { file: string; target: string }[] = [];

  for (const { file, html } of frags) {
    const bad = (message: string) => problems.push({ file, message });
    if (!/^\d{2}-[a-z0-9-]+\.html$/.test(file)) bad(`file name should look like "03-engine.html"`);
    const tags = scanTags(html);
    const opens = tags.filter((t) => !t.close);

    // One <section id data-title> wrapping everything.
    const sections = opens.filter((t) => t.name === "section");
    if (sections.length !== 1) bad(`needs exactly one <section>, found ${sections.length}`);
    const sec = sections[0];
    if (sec) {
      const stripped = stripComments(html);
      const lastClose = stripped.lastIndexOf("</section>");
      if (stripped.slice(0, sec.index).trim() || (lastClose >= 0 && stripped.slice(lastClose + 10).trim())) {
        bad("everything must be inside the <section>");
      }
      if (!sec.attrs.id) bad("<section> has no id");
      else if (!ID_RE.test(sec.attrs.id)) bad(`section id "${sec.attrs.id}" should be lower case letters, digits and hyphens`);
      if (!sec.attrs["data-title"]?.trim()) bad("<section> has no data-title");
    }
    const sectionId = sec?.attrs.id ?? "";

    const count = (n: string) => opens.filter((t) => t.name === n).length;
    if (count("h2") !== 1) bad(`needs exactly one <h2> (the section title), found ${count("h2")}`);
    for (const h of ["h1", "h5", "h6"]) if (count(h)) bad(`<${h}> is not allowed (use h2 once, then h3/h4)`);
    if (!opens.some((t) => t.name === "details" && (t.attrs.class ?? "").split(/\s+/).includes("advanced"))) {
      bad('needs at least one <details class="advanced"> block');
    }

    for (const t of opens) {
      if (FORBIDDEN.has(t.name)) bad(`<${t.name}> is not allowed`);
      else if (!ALLOWED.has(t.name)) bad(`unknown element <${t.name}> (an unescaped "<" in code? write &lt;)`);
      for (const [k, v] of Object.entries(t.attrs)) {
        if (k.startsWith("on")) bad(`inline event handler ${k}= on <${t.name}>`);
        if ((k === "href" || k === "src") && /^\s*javascript:/i.test(v)) bad(`javascript: URL on <${t.name}>`);
      }
      if (t.name === "img" && /^(?:[a-z]+:)?\/\//i.test(t.attrs.src ?? "")) bad(`external image ${t.attrs.src}`);

      const id = t.attrs.id;
      if (id !== undefined && t.name !== "section") {
        if (!ID_RE.test(id)) bad(`id "${id}" should be lower case letters, digits and hyphens`);
        if ((t.name === "h3" || t.name === "h4") && sectionId && !id.startsWith(`${sectionId}-`)) {
          bad(`heading id "${id}" should start with "${sectionId}-"`);
        }
      }
      if (id !== undefined) {
        if (shell.has(id)) bad(`id "${id}" is reserved by the page shell`);
        const prev = idOwner.get(id);
        if (prev) bad(`duplicate id "${id}" (also in ${prev})`);
        else idOwner.set(id, file);
      }

      if (t.attrs["data-chart"] !== undefined && !charts.has(t.attrs["data-chart"])) {
        bad(`unknown chart "${t.attrs["data-chart"]}" (see CONTRACT.md § Charts)`);
      }
      const href = t.attrs.href;
      if (t.name === "a" && href !== undefined && href.startsWith("#")) links.push({ file, target: decodeURIComponent(href.slice(1)) });
      const ds = t.attrs["data-src"];
      if (ds !== undefined) {
        const path = ds.replace(/#L\d+(?:-L?\d+)?$/, "");
        if (!path || path.startsWith("/") || path.split("/").includes("..") || /^[a-z]+:/i.test(path)) bad(`data-src "${ds}" must be a repository-relative path`);
        else if (/#/.test(path)) bad(`data-src "${ds}": only #L<line> or #L<a>-L<b> may follow the path`);
        else if (opts.fileExists && !opts.fileExists(path)) bad(`data-src "${ds}" does not exist in the repository`);
      }
    }

    // Mermaid blocks must have a body.
    const stripped = stripComments(html);
    const mre = /<pre\s+class="mermaid"\s*>([\s\S]*?)<\/pre>/g;
    for (let m = mre.exec(stripped); m; m = mre.exec(stripped)) if (!m[1].trim()) bad("empty mermaid diagram");
    const cre = /<code\b([^>]*)>([\s\S]*?)<\/code>/g;
    for (let m = cre.exec(stripped); m; m = cre.exec(stripped)) {
      const cls = /class="([^"]*)"/.exec(m[1])?.[1] ?? "";
      const lang = cls.split(/\s+/).find((c) => c.startsWith("lang-"));
      if (lang && !CODE_LANGS.includes(lang.slice(5) as (typeof CODE_LANGS)[number])) bad(`unknown code language "${lang}" (${CODE_LANGS.map((l) => `lang-${l}`).join(", ")})`);
      if (/<(?!\/?(?:span|em|strong|b|i|mark|br)\b)/.test(m[2])) bad(`unescaped "<" in code: ${JSON.stringify(m[2].slice(m[2].indexOf("<"), m[2].indexOf("<") + 24))} (write &lt;)`);
    }
  }

  for (const { file, target } of links) {
    if (!target) continue;
    if (!idOwner.has(target) && !shell.has(target)) problems.push({ file, message: `broken link #${target}` });
  }
  return problems;
}

export const formatProblems = (ps: readonly Problem[]) => ps.map((p) => `${p.file}: ${p.message}`).join("\n");
