// src/ui/friend-screen.js
// DOM controller for the friend overlay, reframed from "compare" to
// "invite": share-first with QR + plain-language privacy note, paste-a-code,
// remembered friends (last 5, local-only), card freshness. Untested by
// design (DOM wiring) — codec/freshness in friend-compare.js, list rules in
// friend-recent.js, QR in qr.js, avatar resolution in avatar.js.
//
// SECURITY INVARIANTS (spec §9): `theirName` and every stored friend row are
// UNTRUSTED — names reach innerHTML only through escapeHtml (or textContent);
// an avatar id reaches pixels only via avatarFromWireId -> avatarPortraitStyle
// (double allowlist; asset paths are SKIN_PALETTES-derived literals). A raw
// wire string is never concatenated into url(), src, or markup.
import { encodeFriendCard, decodeFriendCard, friendShareLink, buildFriendCompare, cardAgeDays } from "../friend-compare.js";
import { normalizeRecentFriends, rememberFriend, clearRecentFriends } from "../friend-recent.js";
import { avatarFromWireId, avatarPortraitStyle } from "../avatar.js";
import { qrSvgPath } from "../qr.js";
import { profileInitial } from "../profile.js";
import { t } from "../i18n.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, ch => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));
}

export function createFriendCompare({
  $, openDialog, closeDialog, getMyCard, getOrigin, share, store, getTodayDay, toast, setMyName,
}) {
  const overlay = $("#friend-overlay");
  const panel = $("#friend-panel");
  const closeBtn = $("#friend-popup-close");

  function close() { closeDialog(overlay); }

  // wireId is "" | allowlisted CatId; unknown/photo -> monogram initial as a
  // TEXT NODE (never markup, never an image).
  function avatarChip(wireId, name, sizeClass) {
    const el = document.createElement("span");
    el.className = "fr-avatar" + (sizeClass ? " " + sizeClass : "");
    const style = avatarPortraitStyle(avatarFromWireId(wireId));
    if (style) {
      const art = document.createElement("span");
      art.className = "fr-avatar-art";
      art.style.backgroundImage = `url("${style.image}")`;
      art.style.backgroundSize = `${style.sizePct[0]}% ${style.sizePct[1]}%`;
      art.style.backgroundPosition = `${style.posPct[0]}% ${style.posPct[1]}%`;
      el.appendChild(art);
    } else {
      const mono = document.createElement("span");
      mono.className = "fr-avatar-mono";
      mono.textContent = profileInitial(name) || "🐱";
      el.appendChild(mono);
    }
    return el;
  }

  function freshnessText(card) {
    const age = cardAgeDays(card, getTodayDay());
    if (age === null) return "";
    return age === 0 ? t("friend.asOfToday") : t("friend.asOfDays", { n: age });
  }

  function renderQr(host, link) {
    host.innerHTML = "";
    const qr = qrSvgPath(link);
    if (!qr) {
      // Pathological name pushed the payload past v40-L — share/copy still work.
      const hint = document.createElement("div");
      hint.className = "fr-note";
      hint.textContent = t("friend.qrTooLong");
      host.appendChild(hint);
      return;
    }
    // Built with createElementNS from the two returned values — no innerHTML
    // on this branch. The -4/+8 viewBox IS the mandatory 4-module quiet zone.
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `-4 -4 ${qr.size + 8} ${qr.size + 8}`);
    svg.setAttribute("shape-rendering", "crispEdges");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", t("friend.qrLabel"));
    const bg = document.createElementNS(SVG_NS, "rect");
    bg.setAttribute("x", "-4");
    bg.setAttribute("y", "-4");
    bg.setAttribute("width", String(qr.size + 8));
    bg.setAttribute("height", String(qr.size + 8));
    bg.setAttribute("fill", "#fff");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", qr.d);
    path.setAttribute("fill", "#000");
    svg.appendChild(bg);
    svg.appendChild(path);
    host.appendChild(svg);
  }

  function renderRecent(host) {
    const state = normalizeRecentFriends(store.get("friends"));
    host.innerHTML = `<div class="fr-label">${t("friend.recentTitle")}</div>`;
    if (state.items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "fr-note";
      empty.textContent = t("friend.recentEmpty");
      host.appendChild(empty);
      return;
    }
    for (const item of state.items) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "fr-recent-row";           // whole 44px row is the tap target
      row.appendChild(avatarChip(item.card.avatar, item.card.name, "fr-avatar-row"));
      const name = document.createElement("span");
      name.className = "fr-recent-name";
      name.textContent = item.card.name || t("friend.them");
      const fresh = document.createElement("span");
      fresh.className = "fr-fresh";
      fresh.textContent = freshnessText(item.card);
      row.appendChild(name);
      row.appendChild(fresh);
      row.onclick = () => showCompare(item.card);
      host.appendChild(row);
    }
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "fr-btn fr-clear";
    clear.textContent = t("friend.recentClear");
    clear.onclick = () => {
      store.set("friends", clearRecentFriends());
      renderRecent(host);
      toast(t("friend.recentCleared"));
    };
    host.appendChild(clear);
  }

  // Invite view — the default open() target.
  function wireInviteView() {
    const myCard = getMyCard();
    const code = encodeFriendCard(myCard);
    const needName = !myCard.name;
    panel.innerHTML = `<div class="fr-section">
        <div class="fr-lead">${t("friend.inviteLead")}</div>
        <div class="fr-mycard" id="fr-mycard"></div>
      </div>
      ${needName ? `<div class="fr-section" id="fr-name-section">
        <div class="fr-label">${t("friend.namePrompt")}</div>
        <input id="fr-name-in" class="fr-code" type="text" maxlength="48" autocomplete="nickname"
          aria-label="${t("friend.namePrompt")}">
        <button id="fr-name-save" class="btn-primary fr-btn" type="button">${t("friend.namePromptSave")}</button>
      </div>` : ""}
      <div class="fr-section">
        <div class="fr-label">${t("friend.yourCode")}</div>
        <input id="fr-code" class="fr-code" type="text" readonly value="${escapeHtml(code)}" aria-label="${t("friend.yourCode")}">
        <button id="fr-share" class="btn-primary fr-btn" type="button">${t("friend.share")}</button>
        <div class="fr-label">${t("friend.qrLabel")}</div>
        <div class="fr-qr" id="fr-qr"></div>
        <div class="fr-note">${t("friend.privacyNote")}</div>
      </div>
      <div class="fr-section">
        <div class="fr-label">${t("friend.pasteLabel")}</div>
        <input id="fr-in" class="fr-code" type="text" inputmode="text" autocomplete="off"
          placeholder="${t("friend.pastePlaceholder")}" aria-label="${t("friend.pasteLabel")}">
        <button id="fr-go" class="btn-primary fr-btn" type="button">${t("friend.compareBtn")}</button>
        <div id="fr-result" class="fr-result" role="status" aria-live="polite"></div>
      </div>
      <div class="fr-section" id="fr-recent"></div>`;
    // My-card preview: my avatar arrives as a wire id (photo -> "" -> monogram).
    const mycard = $("#fr-mycard");
    mycard.appendChild(avatarChip(myCard.avatar, myCard.name, "fr-avatar-me"));
    const meta = document.createElement("span");
    meta.className = "fr-mycard-meta";
    meta.textContent = (myCard.name || t("friend.you")) + " · " + t("friend.metric.level") + " " + myCard.level;
    mycard.appendChild(meta);
    renderQr($("#fr-qr"), friendShareLink(getOrigin(), myCard));
    renderRecent($("#fr-recent"));
    if (needName) {
      $("#fr-name-save").onclick = () => {
        const v = ($("#fr-name-in").value || "").trim();
        if (!v) return;
        setMyName(v);
        wireInviteView();      // re-render: card + code + QR now carry the name
      };
      $("#fr-name-in").addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); $("#fr-name-save").click(); }
      });
    }
    const result = $("#fr-result");
    $("#fr-share").onclick = () => {
      const card = getMyCard();
      share(t("friend.shareText"), friendShareLink(getOrigin(), card), encodeFriendCard(card));
    };
    $("#fr-code").onclick = e => e.target.select();
    $("#fr-go").onclick = () => {
      const theirs = decodeFriendCard(($("#fr-in").value || "").trim());
      if (!theirs) { result.textContent = t("friend.invalidCode"); return; }
      showCompare(theirs);
    };
    $("#fr-in").addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); $("#fr-go").click(); }
    });
  }

  function showCompare(theirs) {
    // Remember on every successful decode-and-show (screen policy, spec §9).
    store.set("friends",
      rememberFriend(normalizeRecentFriends(store.get("friends")), theirs, getTodayDay()));
    const cmp = buildFriendCompare(getMyCard(), theirs, getTodayDay());
    const name = escapeHtml(cmp.theirName) || t("friend.them");
    const lead = cmp.lead === "mine" ? t("friend.leadMine")
      : cmp.lead === "theirs" ? t("friend.leadTheirs")
      : t("friend.leadTie");
    const rows = cmp.rows.map(r => `<div class="fr-row fr-${r.winner}">
        <span class="fr-metric">${t("friend.metric." + r.key)}</span>
        <span class="fr-mine">${r.mine.toLocaleString()}</span>
        <span class="fr-theirs">${r.theirs.toLocaleString()}</span>
      </div>`).join("");
    const fresh = cmp.ageDays === null ? ""     // LCH1 card: freshness unknown, show nothing
      : `<div class="fr-fresh">${cmp.ageDays === 0 ? t("friend.asOfToday") : t("friend.asOfDays", { n: cmp.ageDays })}</div>`;
    panel.innerHTML = `<div class="fr-compare-head" id="fr-their-head"></div>
      ${fresh}
      <div class="fr-lead">${lead}</div>
      <div class="fr-row fr-head"><span class="fr-metric"></span>
        <span class="fr-mine">${t("friend.you")}</span><span class="fr-theirs">${name}</span></div>
      ${rows}
      <button id="fr-back" class="fr-btn" type="button">${t("friend.compareAnother")}</button>`;
    const head = $("#fr-their-head");
    head.appendChild(avatarChip(cmp.theirAvatar, cmp.theirName, "fr-avatar-me"));
    const headName = document.createElement("span");
    headName.className = "fr-their-name";
    headName.textContent = cmp.theirName || t("friend.them");
    head.appendChild(headName);
    $("#fr-back").onclick = wireInviteView;
  }

  // open() with no arg -> invite view; open(card) -> straight to compare (deep link).
  function open(incoming) {
    if (incoming) showCompare(incoming); else wireInviteView();
    openDialog(overlay, closeBtn, close);
  }

  closeBtn.onclick = close;
  overlay.addEventListener("click", e => { if (e.target.id === "friend-overlay") close(); });

  return { open };
}
