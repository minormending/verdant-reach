// Art Lab stylesheet (injected once). Game palette, dark, dense but legible.

export const LAB_CSS = `
.al-root {
  --bg: #0b1510; --panel: #12211a; --panel2: #182b22; --line: #24392e; --ink: #d8ead0;
  --dim: #8fae92; --accent: #a8d098; --accent2: #f8b800; --bad: #ff6b5a; --ok: #6fd08a; --pack: #7fb8ff;
  position: fixed; inset: 0; z-index: 1000; display: grid;
  grid-template-columns: 260px minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); overflow: hidden;
  background: var(--bg); color: var(--ink);
  font: 13px/1.4 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-user-select: text; user-select: text;
}
.al-root * { box-sizing: border-box; }
.al-root button, .al-root input, .al-root select { font: inherit; color: inherit; }
.al-root code, .al-root .mono { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 12px; }

.al-top { grid-column: 1 / -1; display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  padding: 8px 14px; background: var(--panel); border-bottom: 1px solid var(--line); }
.al-brand { font-weight: 700; letter-spacing: .12em; color: var(--accent); white-space: nowrap; }
.al-brand small { color: var(--dim); font-weight: 400; letter-spacing: 0; margin-left: 6px; }
.al-group { display: flex; align-items: center; gap: 4px; }
.al-group > .lbl { color: var(--dim); margin-right: 4px; font-size: 12px; }
.al-spacer { flex: 1; }
.al-btn { background: var(--panel2); border: 1px solid var(--line); border-radius: 6px; padding: 4px 10px; cursor: pointer; white-space: nowrap; }
.al-btn:hover { border-color: var(--accent); }
.al-btn.on { background: var(--accent); color: #0b1510; border-color: var(--accent); font-weight: 600; }
.al-btn.small { padding: 2px 7px; font-size: 12px; }
.al-btn.warn { border-color: var(--accent2); color: var(--accent2); }
.al-btn.pack.on { background: var(--pack); border-color: var(--pack); }
.al-chip { display: inline-block; padding: 0 6px; border-radius: 4px; font-size: 11px; background: var(--panel2); color: var(--dim); border: 1px solid var(--line); }
.al-chip.pack { color: var(--pack); border-color: #2c4766; }
.al-chip.lab { color: var(--accent2); border-color: #5a4a10; }
.al-chip.ok { color: var(--ok); }
.al-chip.bad { color: var(--bad); border-color: #5a2620; }
.al-chip.legacy { color: #e0a0ff; border-color: #503060; }

.al-side { display: flex; flex-direction: column; min-height: 0; background: var(--panel); border-right: 1px solid var(--line); }
.al-tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; padding: 8px; }
.al-tab { padding: 5px 2px; text-align: center; border-radius: 5px; cursor: pointer; color: var(--dim); font-size: 12px; border: 1px solid transparent; }
.al-tab:hover { color: var(--ink); }
.al-tab.on { background: var(--panel2); color: var(--accent); border-color: var(--line); }
.al-tab .n { opacity: .6; font-size: 10px; margin-left: 2px; }
.al-search { margin: 0 8px 8px; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); outline: none; }
.al-search:focus { border-color: var(--accent); }
.al-list { overflow: auto; flex: 1; padding: 0 6px 12px; }
.al-item { display: flex; align-items: center; gap: 8px; padding: 3px 6px; border-radius: 5px; cursor: pointer; }
.al-item:hover { background: var(--panel2); }
.al-item.on { background: #24402f; }
.al-item .thumb { width: 32px; height: 32px; display: grid; place-items: center; flex: none; }
.al-item .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.al-item .sub { color: var(--dim); font-size: 11px; }

.al-main { overflow: auto; padding: 18px 22px 60px; min-width: 0; min-height: 0; }
.al-main h1 { font-size: 20px; margin: 0 0 2px; font-weight: 650; }
.al-main h2 { font-size: 13px; margin: 22px 0 8px; color: var(--accent); text-transform: uppercase; letter-spacing: .08em; font-weight: 600; }
.al-meta { color: var(--dim); display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.al-meta b { color: var(--ink); font-weight: 500; }
.al-row { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-start; }
.al-card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 10px; }
.al-card .cap { font-size: 11px; color: var(--dim); margin-top: 6px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.al-card .cap b { color: var(--ink); font-weight: 600; }
.al-stage { display: grid; place-items: center; border-radius: 4px; }
.al-root canvas.px { image-rendering: pixelated; image-rendering: crisp-edges; display: block; }
.bg-light { background: #a8d098; } .bg-white { background: #f8f8f8; } .bg-dark { background: #306850; } .bg-black { background: #181818; }
.bg-checker { background: repeating-conic-gradient(#2a3b31 0 25%, #1c2a22 0 50%) 0 0 / 16px 16px; }

.al-swatches { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.al-swatch { width: 54px; border-radius: 6px; overflow: hidden; border: 1px solid var(--line); cursor: pointer; position: relative; background: var(--panel); }
.al-swatch .c { height: 30px; }
.al-swatch .t { font-size: 10px; text-align: center; padding: 2px 0; font-family: ui-monospace, Menlo, monospace; color: var(--dim); }
.al-swatch input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
.al-swatch .i { position: absolute; top: 2px; left: 4px; font-size: 10px; color: #fff; text-shadow: 0 0 2px #000; }
.al-arrow { color: var(--dim); }

.drop { position: relative; }
.drop.over { outline: 2px dashed var(--accent2); outline-offset: 3px; }
.drop.over::after { content: "drop PNG"; position: absolute; inset: 0; display: grid; place-items: center; background: rgba(248,184,0,.18); color: var(--accent2); font-weight: 700; border-radius: 6px; pointer-events: none; }

.al-sheetwrap { position: relative; display: inline-block; }
.al-sheetwrap .hover { position: absolute; pointer-events: none; box-shadow: inset 0 0 0 2px var(--accent2); z-index: 1; }
.al-sheetwrap .sel { position: absolute; pointer-events: none; box-shadow: inset 0 0 0 2px #ff4fd8, inset 0 0 0 3px #000; }
.al-tip { min-height: 18px; color: var(--dim); font-size: 12px; margin-top: 6px; }

.al-table { border-collapse: collapse; width: 100%; font-size: 12px; }
.al-table th { text-align: left; color: var(--dim); font-weight: 500; padding: 4px 8px; border-bottom: 1px solid var(--line); position: sticky; top: 0; background: var(--bg); }
.al-table td { padding: 3px 8px; border-bottom: 1px solid #16261d; vertical-align: middle; }
.al-table tr.click { cursor: pointer; }
.al-table tr.click:hover td { background: var(--panel); }
.al-table tr.on td { background: #24402f; }

.al-masks { display: grid; grid-template-columns: repeat(4, auto); gap: 8px; justify-content: start; }
.al-mask { text-align: center; }
.al-mask .lbl { font-size: 10px; color: var(--dim); margin-top: 3px; font-family: ui-monospace, Menlo, monospace; }
.al-mask .lbl i { font-style: normal; opacity: .25; }
.al-mask .lbl i.on { opacity: 1; color: var(--accent); }
.al-mask.fallback canvas { opacity: .35; }

.al-json { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; max-height: 360px; overflow: auto; white-space: pre; margin: 0; }
.al-problems { list-style: none; padding: 0; margin: 0; }
.al-problems li { padding: 5px 8px; border-bottom: 1px solid #16261d; display: flex; gap: 10px; }
.al-problems li .w { color: var(--accent2); min-width: 240px; font-family: ui-monospace, Menlo, monospace; font-size: 12px; cursor: pointer; }
.al-problems li .w:hover { text-decoration: underline; }
.al-stat { font-size: 26px; font-weight: 700; }
.al-toast { position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%); background: var(--panel2); border: 1px solid var(--accent2);
  color: var(--ink); padding: 8px 14px; border-radius: 8px; z-index: 1001; box-shadow: 0 6px 24px rgba(0,0,0,.5); }
.al-empty { color: var(--dim); padding: 30px 0; }
.al-hint { color: var(--dim); font-size: 12px; }
@media (max-width: 720px) {
  .al-root { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto 40vh minmax(0, 1fr); }
  .al-side { border-right: 0; border-bottom: 1px solid var(--line); }
}
`;
