// Validates the developer-docs fragments (src/devdocs/sections/*.html) against
// CONTRACT.md. With no sections yet, only the validator's own checks run.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CHART_NAMES, SHELL_IDS } from "./names";
import { formatProblems, validateFragments, type Fragment } from "./validate";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DIR = fileURLToPath(new URL("./sections/", import.meta.url));
const opts = { chartNames: CHART_NAMES, shellIds: SHELL_IDS, fileExists: (p: string) => existsSync(ROOT + p) };

let files: string[] = [];
try { files = readdirSync(DIR).filter((f) => f.endsWith(".html")).sort(); } catch { /* no sections folder yet */ }
const fragments: Fragment[] = files.map((file) => ({ file, html: readFileSync(DIR + file, "utf8") }));

describe("developer docs sections", () => {
  it.skipIf(!fragments.length)(`follow CONTRACT.md (${fragments.length} files)`, () => {
    const problems = validateFragments(fragments, opts);
    expect(problems, `\n${formatProblems(problems)}\n`).toEqual([]);
  });
});

const ok = (id: string, body = "") => `<section id="${id}" data-title="T ${id}">
  <h2>T</h2>
  <h3 id="${id}-a">A</h3>
  <details class="advanced"><summary>Advanced: x</summary><p>y</p></details>
  ${body}
</section>`;
const check = (...html: string[]) => validateFragments(html.map((h, i) => ({ file: `0${i + 1}-x.html`, html: h })), opts).map((p) => p.message);

describe("the fragment validator", () => {
  it("accepts a well-formed fragment", () => {
    expect(check(ok("one", `<figure data-chart="exp-curves"><figcaption>c</figcaption></figure>
      <pre class="mermaid">flowchart LR
  A --> B</pre><pre><code class="lang-ts">const x: Array&lt;string&gt; = [];</code></pre>
      <a href="#two-a">x</a> <a href="#top">top</a> <a data-src="src/battle/logic/exp.ts#L7">exp.ts</a>
      <aside class="tip">t</aside><!-- <script> in a comment is fine -->`), ok("two"))).toEqual([]);
  });
  it("rejects unknown charts", () => expect(check(ok("a", '<figure data-chart="pie"></figure>'))).toContain('unknown chart "pie" (see CONTRACT.md § Charts)'));
  it("rejects duplicate ids", () => expect(check(ok("a"), ok("a")).some((m) => m.startsWith('duplicate id "a"'))).toBe(true));
  it("rejects scripts and inline handlers", () => {
    expect(check(ok("a", "<script>alert(1)</script>"))).toContain("<script> is not allowed");
    expect(check(ok("a", '<p onclick="x()">p</p>'))).toContain("inline event handler onclick= on <p>");
    expect(check(ok("a", '<a href="javascript:void 0">x</a>'))).toContain("javascript: URL on <a>");
  });
  it("rejects broken anchors", () => expect(check(ok("a", '<a href="#nowhere">x</a>'))).toContain("broken link #nowhere"));
  it("rejects data-src paths that don't exist", () => {
    expect(check(ok("a", '<a data-src="src/nope.ts">x</a>'))).toContain('data-src "src/nope.ts" does not exist in the repository');
    expect(check(ok("a", '<a data-src="../etc/passwd">x</a>'))[0]).toMatch(/repository-relative/);
  });
  it("rejects structure problems", () => {
    expect(check("<p>no section</p>")).toContain("needs exactly one <section>, found 0");
    expect(check('<section data-title="x"><h2>x</h2><details class="advanced"></details></section>')).toContain("<section> has no id");
    expect(check(ok("a", '<h3 id="other">x</h3>'))).toContain('heading id "other" should start with "a-"');
    expect(check(ok("a", "<h2>again</h2>"))).toContain("needs exactly one <h2> (the section title), found 2");
    expect(check('<section id="a" data-title="x"><h2>x</h2></section>')).toContain('needs at least one <details class="advanced"> block');
    expect(check(ok("a", "<pre><code>Map<string, number></code></pre>"))[0]).toMatch(/unescaped "<" in code/);
    expect(check(ok("a", "<pre><code>Array<T> x</code></pre>")).join()).toMatch(/unknown element <t>/);
    expect(check(ok("a", '<img src="https://example.com/x.png">'))).toContain("external image https://example.com/x.png");
    expect(check(ok("a", '<pre><code class="lang-rust">x</code></pre>'))[0]).toMatch(/unknown code language/);
    expect(check(ok("top"))).toContain('id "top" is reserved by the page shell');
  });
});
