"use strict";
// Pure time-of-day → wide-backdrop selection. No clock, no storage: the caller
// passes the time-of-day bucket (from streetTimeOfDay(hour)) and draws the
// returned asset id. Day/morning show the day panorama; dusk/night show the
// night-market panorama.

export function backdropFor(timeOfDay) {
  return timeOfDay === "dusk" || timeOfDay === "night" ? "market" : "day";
}

export function backdropAsset(kind) {
  return kind === "market" ? "bg-street-market-wide" : "bg-street-wide";
}
