// Small DOM helpers for the Art Lab (no framework).

import type { ArtImage } from "../../contracts";

type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown> & { class?: string; style?: string };

/** Create an element: h("div", { class: "x", onclick: fn }, "text", child). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v as EventListener);
      else if (k === "class") el.className = String(v);
      else if (k === "style") el.setAttribute("style", String(v));
      else if (k in el && typeof v !== "string") (el as unknown as Record<string, unknown>)[k] = v;
      else el.setAttribute(k, v === true ? "" : String(v));
    }
  }
  append(el, children);
  return el;
}

function append(el: Node, children: Child[]) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
  }
}

/** Drop null/false entries (for Element.append). */
export function nn<T>(xs: (T | null | undefined | false)[]): T[] {
  return xs.filter(Boolean) as T[];
}

export function clear(el: Element) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** A crisp pixel canvas of w×h logical pixels shown at `zoom`. */
export function pixelCanvas(w: number, h: number, zoom: number, cls = "px"): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  c.className = cls;
  c.style.width = `${c.width * zoom}px`;
  c.style.height = `${c.height * zoom}px`;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  return g;
}

/** Copy an image into a fresh canvas (so it can be edited). */
export function toCanvas(img: ArtImage): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  ctx2d(c).drawImage(img, 0, 0);
  return c;
}

/** Decode a dropped/picked image file into a canvas. */
export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`${file.name} is not an image`));
      img.src = url;
    });
    return toCanvas(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function downloadJson(obj: unknown, name: string) {
  downloadBlob(new Blob([JSON.stringify(obj, null, 2) + "\n"], { type: "application/json" }), name);
}

export function downloadPng(img: ArtImage, name: string) {
  toCanvas(img).toBlob((b) => b && downloadBlob(b, name), "image/png");
}

/**
 * Make an element accept dropped PNGs. `onFile` gets the decoded canvas;
 * errors are reported through `onError`.
 */
export function dropTarget(el: HTMLElement, onFile: (img: HTMLCanvasElement, file: File) => void | Promise<void>, onError: (msg: string) => void) {
  el.classList.add("drop");
  el.addEventListener("dragover", (e) => {
    if (!e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    el.classList.add("over");
  });
  el.addEventListener("dragleave", () => el.classList.remove("over"));
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.remove("over");
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    fileToCanvas(file).then((c) => onFile(c, file)).catch((err: unknown) => onError(err instanceof Error ? err.message : String(err)));
  });
}
