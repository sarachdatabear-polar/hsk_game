"""Run the deterministic reference-sheet asset extraction pipeline.

This repository's runnable implementation is dependency-free Node because Python
is not available in the local Codex shell. The wrapper keeps the requested tool
entrypoint stable for Python-capable environments.
"""

from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[1]


if __name__ == "__main__":
    subprocess.run(["node", str(ROOT / "tools" / "asset_pipeline.mjs"), "all"], check=True)
