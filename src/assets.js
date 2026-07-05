"use strict";
/* Manifest-backed asset registry. The manifest is bundled at build time so the
   app never needs a runtime fetch for shell art metadata, preserving file://. */

import manifest from "../assets/asset-manifest.json";

const LOADABLE = new Set(["approved", "integrated"]);
const FRAME_TYPES = new Set(["ui-surface", "ui-frame"]);

export function createAssets(m, opts = {}) {
  const makeImage =
    opts.makeImage || (() => (typeof Image === "undefined" ? null : new Image()));
  const rootEl = () =>
    opts.root || (typeof document === "undefined" ? null : document.documentElement);

  const REGISTRY = {};
  for (const asset of m.assets) REGISTRY[asset.id] = asset;

  const images = new Map();
  const frames = new Map();

  const key = (id, state) => (state === "default" ? id : `${id}:${state}`);
  const stateFile = (asset, state) =>
    state === "default" ? asset.file : asset.file.replace(/\.png$/, `-${state}.png`);

  function frameShorthand(asset, state) {
    if (!Array.isArray(asset.slice) || asset.slice.length !== 4) return null;
    const scale = asset.scale || 1;
    const widths = asset.slice.map(n => `${Math.round(n / scale)}px`).join(" ");
    return `url("assets/${stateFile(asset, state)}") ${asset.slice.join(" ")} fill / ${widths} stretch`;
  }

  function load(id, state = "default") {
    const asset = REGISTRY[id];
    if (!asset || !asset.file.endsWith(".png") || !LOADABLE.has(asset.status)) return;

    const imageKey = key(id, state);
    if (images.has(imageKey)) return;

    const image = makeImage();
    if (!image) return;

    image.onload = () => {
      if (!FRAME_TYPES.has(asset.type)) return;
      const css = frameShorthand(asset, state);
      if (!css) return;

      frames.set(imageKey, css);
      const el = rootEl();
      if (el) el.style.setProperty(`--f-${imageKey.replace(":", "-")}`, css);
    };
    image.src = `assets/${stateFile(asset, state)}`;
    images.set(imageKey, image);
  }

  function preload() {
    for (const asset of m.assets) {
      if (asset.priority !== "P0") continue;
      load(asset.id);
      for (const state of asset.states || []) {
        if (state !== "default") load(asset.id, state);
      }
    }
  }

  function img(id) {
    if (!REGISTRY[id]) return null;
    load(id);
    const image = images.get(id);
    return image && image.complete && image.naturalWidth ? image : null;
  }

  function frameCSS(id, state = "default") {
    return frames.get(key(id, state)) || "none";
  }

  return { REGISTRY, preload, frameCSS, img };
}

const assets = createAssets(manifest);
export const REGISTRY = assets.REGISTRY;
export const preload = assets.preload;
export const frameCSS = assets.frameCSS;
export const img = assets.img;
