"""Python wrapper for pixel-integrity validation.

Run with pytest in Python-capable environments. The actual validator is the
same dependency-free Node implementation used by the local pipeline.
"""

from pathlib import Path
import subprocess


def test_pixel_integrity():
    root = Path(__file__).resolve().parents[1]
    subprocess.run(["node", str(root / "tools" / "asset_pipeline.mjs"), "validate"], check=True)
