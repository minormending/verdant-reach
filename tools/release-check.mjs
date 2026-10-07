#!/usr/bin/env node
// Run from the repository root. No dependencies; e2e may tolerate unfinished
// dialogue, but that tolerance must never appear in src/.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const offenders = [];

function walk(dir, visit) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    for (const entry of entries) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path, visit);
      else if (entry.isFile()) visit(path);
      else offenders.push(`${path}: cannot check non-regular file`);
    }
  } catch (error) {
    offenders.push(`${dir}: ${error.message}`);
  }
}

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function checkNotes(value, path, location = "$") {
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childLocation = `${location}[${JSON.stringify(key)}]`;
    if (key === "notes" && typeof child === "string" && child.startsWith("PLACEHOLDER")) {
      offenders.push(`${path}: ${childLocation} starts with PLACEHOLDER`);
    }
    // Set images (item icons, UI) carry no notes: placeholder.py marks them by tool.
    if (key === "tool" && child === "tools/art/placeholder.py") {
      offenders.push(`${path}: ${childLocation} is placeholder art`);
    }
    checkNotes(child, path, childLocation);
  }
}

walk("public/art", (path) => {
  if (!path.endsWith(".json")) return;
  try {
    checkNotes(JSON.parse(read(path)), path);
  } catch (error) {
    offenders.push(`${path}: cannot check JSON: ${error.message}`);
  }
});

walk("src", (path) => {
  try {
    read(path).split("\n").forEach((line, index) => {
      for (const marker of ["TODO(text)", "allowTodo"]) {
        let column = line.indexOf(marker);
        while (column !== -1) {
          offenders.push(`${path}:${index + 1}:${column + 1}: contains ${marker}`);
          column = line.indexOf(marker, column + marker.length);
        }
      }
    });
  } catch (error) {
    offenders.push(`${path}: cannot check source: ${error.message}`);
  }
});

if (offenders.length) {
  console.error(`release-check: FAILED\n${offenders.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("release-check: OK");
}
