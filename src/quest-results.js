"use strict";

export function questResultsSummary(view = {}, { score = 0 } = {}) {
  const learned = Math.max(0, Math.floor(Number(view.learned) || 0));
  const target = view.endless ? Infinity : Math.max(0, Math.floor(Number(view.target) || 0));
  const attempts = Math.max(0, Math.floor(Number(view.attempts) || 0));
  const correctAttempts = Math.max(0, Math.floor(Number(view.correctAttempts) || 0));
  const extraPractice = Array.isArray(view.missedWords) ? view.missedWords : [];
  const chapterStep = learned % 20;

  return {
    learned,
    target,
    attempts,
    accuracy: attempts ? Math.round(100 * correctAttempts / attempts) : 0,
    extraPractice,
    lanternsLit: Math.floor(learned / 5),
    chapterLanternsLit: learned && chapterStep === 0 ? 4 : Math.floor(chapterStep / 5),
    routeChapter: learned ? Math.floor((learned - 1) / 20) + 1 : 1,
    score: Math.max(0, Math.floor(Number(score) || 0)),
    nextReview: extraPractice.length ? "practice" : "tomorrow",
    complete: !!view.complete,
  };
}
