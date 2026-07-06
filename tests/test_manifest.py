"""Python wrapper for manifest validation."""

from pathlib import Path
import json
import subprocess


def test_manifest_has_required_assets():
    root = Path(__file__).resolve().parents[1]
    subprocess.run(["node", str(root / "tools" / "asset_pipeline.mjs"), "validate"], check=True)
    manifest = json.loads((root / "assets" / "metadata" / "assets.json").read_text())
    ids = {entry["id"] for entry in manifest["assets"]}
    assert {"cat-walk-01", "cat-happy-01", "bg-home", "bg-battle", "ui-panel", "fx-correct", "icon-heart"} <= ids
