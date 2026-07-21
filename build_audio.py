#!/usr/bin/env python3
"""Generate per-word MP3s with Microsoft neural TTS (edge-tts).

Scope: the FULL game vocabulary, sourced from the game's own data/words.json
- NOT product/hsk_top2000_bilingual.csv, which has drifted from the actual
game vocabulary. Every distinct hanzi across all levels gets an mp3.

Output: game/audio/<hanzi>.mp3 + two indexes:
  - index.json: the BUNDLED core set (top WORDS_CAP by frequency across
    every level, deduped by hanzi keeping the max frequency seen, plus all
    of ALWAYS_LEVELS in full) - this is what ships in the APK/PWA precache
    and what hasMp3 gating reads.
  - index-full.json: every hosted mp3 on disk, for the remote-voice ladder.
Re-runnable: existing files are skipped, so interrupted runs resume.
Both indexes are always rebuilt from the actual contents of audio/ so they
reflect every mp3 on disk, not just the words picked in this run.
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


def load_data() -> dict:
    return json.loads(WORDS_JSON.read_text(encoding="utf-8"))


def core_words(data) -> list[str]:
    """Bundled core set: the top WORDS_CAP by frequency across every level
    (deduped by hanzi keeping the max frequency seen), plus all of
    ALWAYS_LEVELS in full."""
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


def all_words(data) -> list[str]:
    """Full voice set: every distinct hanzi across all levels."""
    seen: set[str] = set()
    out: list[str] = []
    for level_words in data["levels"].values():
        for w in level_words:
            if w["h"] not in seen:
                seen.add(w["h"])
                out.append(w["h"])
    return out


async def synth(word: str, path: Path, sem: asyncio.Semaphore):
    async with sem:
        try:
            await edge_tts.Communicate(word, VOICE).save(str(path))
        except Exception as e:  # a failed word must not abort the full run
            print(f"  FAILED {word}: {e}")
            if path.exists():
                path.unlink()


async def main() -> int:
    OUT.mkdir(exist_ok=True)
    data = load_data()
    words = all_words(data)
    sem = asyncio.Semaphore(CONCURRENCY)
    todo = [(w, OUT / f"{w}.mp3") for w in words if not (OUT / f"{w}.mp3").exists()]
    print(f"{len(words)} words, {len(todo)} to synthesize")
    for i in range(0, len(todo), 100):
        batch = todo[i:i + 100]
        await asyncio.gather(*(synth(w, p, sem) for w, p in batch))
        print(f"  {min(i + 100, len(todo))}/{len(todo)}")
    # Both indexes rebuild from what actually exists on disk. index.json is
    # the BUNDLED core set (APK staging + hasMp3 gating read it); index-full
    # lists every hosted mp3 for the remote-voice ladder.
    on_disk = {p.stem for p in OUT.glob("*.mp3")}
    core = [h for h in core_words(data) if h in on_disk]
    full = sorted(on_disk)
    (OUT / "index.json").write_text(json.dumps(core, ensure_ascii=False), encoding="utf-8")
    (OUT / "index-full.json").write_text(json.dumps(full, ensure_ascii=False), encoding="utf-8")
    print(f"index.json: {len(core)} core / index-full.json: {len(full)} total")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
