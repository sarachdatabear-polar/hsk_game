// src/ui/avatar-picker.js
// DOM controller for the #avatar-overlay picker: cat grid, photo intake
// pipeline, persistence hand-off. Untested by design (DOM wiring, like
// main.js) — ids/ownership/crops/caps/codecs all live in the pure, tested
// modules (avatar.js, profile.js, storage.js).
//
// Photo privacy: gallery-only file input (NO `capture` attribute -> no
// Android camera permission, no Play Data Safety delta); pixels never leave
// the device (nbhsk.profilePhoto, local-only key).
import { t } from "../i18n.js";
import { catAvatarChoices, avatarPortraitStyle, normalizeAvatar, AVATAR_DEFAULT_CAT_ID } from "../avatar.js";
import { profileInitial } from "../profile.js";
import { CATALOG } from "../shop.js";

// 96 K chars ≈ 72 KB of JPEG. Justification (spec §8): total app footprint
// stays < 700 KB against a 5 MB (10 MB Android WebView) origin quota.
export const PHOTO_DATA_URL_MAX = 98304;

const JPEG_QUALITY_LADDER = [0.82, 0.66, 0.5];

export function createAvatarPicker({
  $, openDialog, closeDialog, store, toast, getProfile, setProfile, getOwned, onChanged,
}) {
  const overlay = $("#avatar-overlay");
  const panel = $("#avatar-panel");
  const closeBtn = $("#avatar-popup-close");

  function close() { closeDialog(overlay); }

  function catLabel(id) {
    if (id === AVATAR_DEFAULT_CAT_ID) return t("avatar.cat.lucky");
    const key = "item." + id;              // skins reuse the shop item names
    const label = t(key);
    if (label !== key) return label;
    const item = CATALOG.find(it => it.id === id);
    return item ? item.name : id;
  }

  function paintArt(art, style) {
    art.style.backgroundImage = `url("${style.image}")`;
    art.style.backgroundSize = `${style.sizePct[0]}% ${style.sizePct[1]}%`;
    art.style.backgroundPosition = `${style.posPct[0]}% ${style.posPct[1]}%`;
  }

  function makeTile({ label, selected, disabled, onPick, fill }) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "av-tile" + (selected ? " selected" : "");
    if (disabled) btn.disabled = true;
    const art = document.createElement("span");
    art.className = "av-art";
    fill(art);
    const cap = document.createElement("span");
    cap.className = "av-cap";
    cap.textContent = label;
    btn.appendChild(art);
    btn.appendChild(cap);
    if (onPick && !disabled) btn.onclick = onPick;
    return btn;
  }

  // Selecting monogram/cat frees the photo key (must actually reclaim the
  // ~96 KB — spec §1) and persists via setProfile so main.js's in-memory
  // playerProfile stays coherent.
  function pick(avatar) {
    store.remove("profilePhoto");
    setProfile({ ...getProfile(), avatar: normalizeAvatar(avatar) });
    onChanged();
    close();
  }

  function render() {
    const current = getProfile().avatar;
    panel.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "av-grid";
    grid.appendChild(makeTile({
      label: t("avatar.monogram"),
      selected: current.kind === "monogram",
      fill: art => {
        art.classList.add("av-initial");
        art.textContent = profileInitial(getProfile().displayName) || "•";
      },
      onPick: () => pick({ kind: "monogram" }),
    }));
    for (const { id, locked } of catAvatarChoices(getOwned())) {
      const style = avatarPortraitStyle({ kind: "cat", id });
      grid.appendChild(makeTile({
        label: locked ? t("avatar.locked") : catLabel(id),
        selected: current.kind === "cat" && current.id === id,
        disabled: locked,
        fill: art => {
          paintArt(art, style);
          if (locked) {
            const lock = document.createElement("span");
            lock.className = "av-lock";
            lock.textContent = "🔒";
            art.appendChild(lock);
          }
        },
        onPick: () => pick({ kind: "cat", id }),
      }));
    }
    // Photo tile: a <label> styled like a tile, hosting the hidden file input.
    const photoTile = document.createElement("label");
    photoTile.className = "av-tile av-photo" + (current.kind === "photo" ? " selected" : "");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";              // gallery-only: NO capture attribute (risk R11)
    input.className = "av-file";
    input.setAttribute("aria-label", t("avatar.photo"));
    input.addEventListener("change", onPhotoPicked);
    const photoArt = document.createElement("span");
    photoArt.className = "av-art av-initial";
    photoArt.textContent = "📷";
    const photoCap = document.createElement("span");
    photoCap.className = "av-cap";
    photoCap.textContent = t("avatar.photo");
    photoTile.appendChild(input);
    photoTile.appendChild(photoArt);
    photoTile.appendChild(photoCap);
    grid.appendChild(photoTile);
    panel.appendChild(grid);
    const hint = document.createElement("div");
    hint.className = "av-hint";
    hint.textContent = t("avatar.photoHint");
    panel.appendChild(hint);
    if (current.kind === "photo") {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "av-remove";
      removeBtn.textContent = t("avatar.removePhoto");
      removeBtn.onclick = () => pick({ kind: "monogram" });
      panel.appendChild(removeBtn);
    }
  }

  // Decode with EXIF rotation. Primary: createImageBitmap({imageOrientation:
  // "from-image"}); fallback for old WebViews: object-URL + <img> (modern
  // engines default image-orientation: from-image, so EXIF still lands;
  // pre-2020 WebViews may show a rotated crop — accepted, risk R6).
  async function decodePicked(file) {
    if (typeof createImageBitmap === "function") {
      try {
        return { bitmap: await createImageBitmap(file, { imageOrientation: "from-image" }) };
      } catch (e) { /* fall through */ }
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = url;
      });
      return { bitmap: img, url };
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
    }
  }

  async function onPhotoPicked(e) {
    const input = e.target;
    const file = input.files && input.files[0];
    input.value = "";                      // re-picking the same file re-fires change
    if (!file) return;
    if (!/^image\//.test(file.type || "")) { toast(t("avatar.photoError")); return; }
    let decoded;
    try { decoded = await decodePicked(file); }
    catch (err) { toast(t("avatar.photoError")); return; }
    const { bitmap, url } = decoded;
    try {
      const w = bitmap.naturalWidth || bitmap.width;
      const h = bitmap.naturalHeight || bitmap.height;
      if (!w || !h) { toast(t("avatar.photoError")); return; }
      // Center-crop to a square, downscale onto a 256x256 canvas (fills the
      // 112px hero circle at 2x DPR; 512 would quadruple bytes for nothing).
      const side = Math.min(w, h);
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, (w - side) / 2, (h - side) / 2, side, side, 0, 0, 256, 256);
      // JPEG quality ladder — first result under the cap wins.
      let dataUrl = null;
      for (const q of JPEG_QUALITY_LADDER) {
        const candidate = canvas.toDataURL("image/jpeg", q);
        if (candidate.length <= PHOTO_DATA_URL_MAX) { dataUrl = candidate; break; }
      }
      if (!dataUrl) { toast(t("avatar.photoTooBig")); return; }   // previous avatar untouched
      // Persist photo FIRST with read-back verification — createStore.set
      // swallows QuotaExceededError, so reading back is the only reliable
      // quota signal (spec §8.7). Only then point the profile at it, so
      // profile can never reference a missing photo.
      const prevPhoto = store.get("profilePhoto", null);
      store.set("profilePhoto", dataUrl);
      if (store.get("profilePhoto", "") !== dataUrl) {
        if (prevPhoto != null) store.set("profilePhoto", prevPhoto);
        else store.remove("profilePhoto");
        toast(t("avatar.saveFailed"));
        return;
      }
      setProfile({ ...getProfile(), avatar: { kind: "photo" } });
      onChanged();
      close();
    } finally {
      if (bitmap && typeof bitmap.close === "function") bitmap.close();
      if (url) URL.revokeObjectURL(url);
    }
  }

  closeBtn.onclick = close;
  overlay.addEventListener("click", ev => { if (ev.target.id === "avatar-overlay") close(); });

  function open() {
    render();
    openDialog(overlay, closeBtn, close);
  }

  return { open };
}
