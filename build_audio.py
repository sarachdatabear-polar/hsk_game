#!/usr/bin/env python3
"""Generate per-word MP3s with Microsoft neural TTS (edge-tts).

Scope: the top-2000 blended words (product/hsk_top2000_bilingual.csv).
Output: game/audio/<hanzi>.mp3 + game/audio/index.json
Re-runnable: existing files are skipped, so interrupted runs resume.
"""
import asyncio, csv, json, sys
from pathlib import Path
import edge_tts

VOICE = "zh-CN-XiaoxiaoNeural"
ROOT = Path(__file__).resolve().parent
SRC = ROOT.parent / "product" / "hsk_top2000_bilingual.csv"
OUT = ROOT / "audio"
CONCURRENCY = 8


async def synth(word: str, path: Path, sem: asyncio.Semaphore):
    async with sem:
        await edge_tts.Communicate(word, VOICE).save(str(path))


async def main() -> int:
    OUT.mkdir(exist_ok=True)
    words = [r["word"].strip() for r in csv.DictReader(open(SRC, encoding="utf-8-sig")) if r["word"].strip()]
    sem = asyncio.Semaphore(CONCURRENCY)
    todo = [(w, OUT / f"{w}.mp3") for w in words if not (OUT / f"{w}.mp3").exists()]
    print(f"{len(words)} words, {len(todo)} to synthesize")
    for i in range(0, len(todo), 100):
        batch = todo[i:i + 100]
        await asyncio.gather(*(synth(w, p, sem) for w, p in batch))
        print(f"  {min(i + 100, len(todo))}/{len(todo)}")
    have = sorted(w for w in words if (OUT / f"{w}.mp3").exists())
    (OUT / "index.json").write_text(json.dumps(have, ensure_ascii=False), encoding="utf-8")
    print(f"index.json: {len(have)} entries")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
