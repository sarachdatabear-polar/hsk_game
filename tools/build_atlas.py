"""Build character atlases as part of the full extraction pipeline."""

from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[1]


if __name__ == "__main__":
    subprocess.run(["node", str(ROOT / "tools" / "asset_pipeline.mjs"), "all"], check=True)
