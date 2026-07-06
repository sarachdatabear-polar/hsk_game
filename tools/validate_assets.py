"""Validate extracted assets against the source PNG pixels and manifest."""

from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[1]


if __name__ == "__main__":
    subprocess.run(["node", str(ROOT / "tools" / "asset_pipeline.mjs"), "validate"], check=True)
