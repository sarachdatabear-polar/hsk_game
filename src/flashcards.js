"use strict";

function shuffled(items, rng) {
  const out = items.slice();
  for(let i=out.length-1;i>0;i--){
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function cardSessionKey(scopeKey, length){
  return `${scopeKey}·cards${Math.max(1, Math.round(Number(length)) || 1)}`;
}

export function newCardSession(source, length, rng = Math.random){
  const n = Math.max(1, Math.round(Number(length)) || 1);
  const deck = shuffled((source || []).slice(0, n), rng);
  return { deck, i:0, done:0, total:deck.length };
}

export function restoreCardSession(saved, expectedKey, lookup){
  if(!saved || saved.key !== expectedKey || !Array.isArray(saved.deck)) return null;
  const deck = saved.deck.map(h => lookup[h]).filter(Boolean);
  const i = Math.round(Number(saved.i));
  if(deck.length !== saved.deck.length || !Number.isFinite(i) || i < 0 || i >= deck.length) return null;
  return {
    deck,
    i,
    done:Math.max(0, Math.round(Number(saved.done)) || 0),
    total:Math.max(1, Math.round(Number(saved.total)) || deck.length),
  };
}

export function cardSessionSnapshot(session, key){
  return {
    key,
    deck:session.deck.map(word => word.h),
    i:session.i,
    done:session.done,
    total:session.total,
  };
}
