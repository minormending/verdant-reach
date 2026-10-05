"""public/art/index.json is written by `npm run art:index` (tools/art/index.mjs,
owned by the art runtime). These wrappers just call it, so there is exactly
one implementation of the index format."""

from __future__ import annotations

import shutil
import subprocess

from .core import ROOT

SCRIPT = ROOT / "tools" / "art" / "index.mjs"


def _node(*args: str) -> subprocess.CompletedProcess:
    node = shutil.which("node")
    if not node or not SCRIPT.exists():
        raise RuntimeError("needs node and tools/art/index.mjs (npm run art:index)")
    return subprocess.run([node, str(SCRIPT), *args], cwd=ROOT, capture_output=True, text=True)


def rebuild() -> str:
    r = _node()
    if r.returncode:
        raise RuntimeError(r.stderr or r.stdout)
    return (r.stdout + r.stderr).strip()


def check() -> str | None:
    """None when index.json is up to date, else the complaint."""
    r = _node("--check")
    return None if r.returncode == 0 else (r.stderr or r.stdout).strip()
