import { describe, it, expect } from "vitest";
import { cardSessionKey, newCardSession, restoreCardSession, cardSessionSnapshot } from "../src/flashcards.js";

const words = Array.from({length:30}, (_,i)=>({h:`w${i}`}));

describe("flashcard sessions", () => {
  it("uses the selected finite session length instead of the legacy 400-card cap", () => {
    const session = newCardSession(words, 20, () => 0.5);
    expect(session.deck).toHaveLength(20);
    expect(session.total).toBe(20);
  });

  it("keys resume state to both scope and length", () => {
    expect(cardSessionKey("HSK1", 20)).toBe("HSK1·cards20");
    expect(cardSessionKey("HSK1", 40)).not.toBe(cardSessionKey("HSK1", 20));
  });

  it("round-trips a retry-extended deck through hanzi storage", () => {
    const session = {deck:[words[0],words[1],words[0]],i:1,done:1,total:2};
    const saved = cardSessionSnapshot(session, "HSK1·cards20");
    const lookup = Object.fromEntries(words.map(w=>[w.h,w]));
    expect(restoreCardSession(saved, "HSK1·cards20", lookup)).toEqual(session);
  });

  it("rejects stale scope keys and missing vocabulary", () => {
    const saved = {key:"HSK1·cards20",deck:["w0","missing"],i:0,done:0,total:2};
    expect(restoreCardSession(saved, "HSK2·cards20", {})).toBeNull();
    expect(restoreCardSession(saved, "HSK1·cards20", {w0:words[0]})).toBeNull();
  });
});
