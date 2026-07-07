#!/usr/bin/env python3
"""Generate per-word MP3s with Microsoft neural TTS (edge-tts).

Scope: all HSK1-2 words plus the top WORDS_CAP words by frequency, sourced
from the game's own data/words.json (deduped by hanzi keeping the max
frequency seen across levels, then sorted descending) - NOT
product/hsk_top2000_bilingual.csv, which has drifted from the actual game
vocabulary.
Output: game/audio/<hanzi>.mp3 + game/audio/index.json
Re-runnable: existing files are skipped, so interrupted runs resume.
index.json is always rebuilt from the actual contents of audio/ so it
reflects every mp3 on disk, not just the words picked in this run.
"""
import asyncio, json, sys
from pathlib import Path
import edge_tts

VOICE = "zh-CN-XiaoxiaoNeural"
ROOT = Path(__file__).resolve().parent
WORDS_JSON = ROOT / "data" / "words.json"
OUT = ROOT / "audio"
CONCURRENCY = 8
WORDS_CAP = 2000  # top-N words by frequency to synthesize audio for
# Frequency here is mock-exam TEXT frequency, which underranks basic vocab
# (七 sits around rank 4,600) - beginners are exactly who needs bundled
# audio, so these levels are always included in full regardless of rank.
ALWAYS_LEVELS = ("1", "2")


def load_words() -> list[str]:
    """Word source from data/words.json: the top WORDS_CAP by frequency
    across every level (deduped by hanzi keeping the max frequency seen),
    plus all of ALWAYS_LEVELS in full."""
    data = json.loads(WORDS_JSON.read_text(encoding="utf-8"))
    best_freq: dict[str, int] = {}
    for level_words in data["levels"].values():
        for w in level_words:
            hanzi = w["h"]
            freq = w.get("f", 0)
            if hanzi not in best_freq or freq > best_freq[hanzi]:
                best_freq[hanzi] = freq
    ranked = sorted(best_freq.items(), key=lambda kv: -kv[1])
    words = [hanzi for hanzi, _ in ranked[:WORDS_CAP]]
    seen = set(words)
    for lv in ALWAYS_LEVELS:
        for w in data["levels"][lv]:
            if w["h"] not in seen:
                seen.add(w["h"])
                words.append(w["h"])
    return words


async def synth(word: str, path: Path, sem: asyncio.Semaphore):
    async with sem:
        await edge_tts.Communicate(word, VOICE).save(str(path))


async def main() -> int:
    OUT.mkdir(exist_ok=True)
    words = load_words()
    sem = asyncio.Semaphore(CONCURRENCY)
    todo = [(w, OUT / f"{w}.mp3") for w in words if not (OUT / f"{w}.mp3").exists()]
    print(f"{len(words)} words, {len(todo)} to synthesize")
    for i in range(0, len(todo), 100):
        batch = todo[i:i + 100]
        await asyncio.gather(*(synth(w, p, sem) for w, p in batch))
        print(f"  {min(i + 100, len(todo))}/{len(todo)}")
    # Rebuild index.json from whatever mp3s actually exist on disk, so it
    # always reflects audio/ (not just words targeted in this run).
    have = sorted(p.stem for p in OUT.glob("*.mp3"))
    (OUT / "index.json").write_text(json.dumps(have, ensure_ascii=False), encoding="utf-8")
    print(f"index.json: {len(have)} entries")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
