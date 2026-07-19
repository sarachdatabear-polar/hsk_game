// src/ui/friend-screen.js
// DOM controller for the friend-compare overlay. Untested by design (DOM wiring),
// like main.js; all logic lives in the pure seam src/friend-compare.js.
//
// A friend's card arrives as a pasted code or a deep link, so `theirName` is
// UNTRUSTED input — every place it reaches innerHTML goes through escapeHtml.
import { encodeFriendCard, decodeFriendCard, friendShareLink, buildFriendCompare } from "../friend-compare.js";
import { t } from "../i18n.js";

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, ch => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));
}

export function createFriendCompare({ $, openDialog, closeDialog, getMyCard, getOrigin, share }) {
  const overlay = $("#friend-overlay");
  const panel = $("#friend-panel");
  const closeBtn = $("#friend-popup-close");

  function close() { closeDialog(overlay); }

  function shareMarkup() {
    const code = encodeFriendCard(getMyCard());
    return `<div class="fr-section">
        <div class="fr-label">${t("friend.yourCode")}</div>
        <input id="fr-code" class="fr-code" type="text" readonly value="${escapeHtml(code)}" aria-label="${t("friend.yourCode")}">
        <button id="fr-share" class="btn-primary fr-btn" type="button">${t("friend.share")}</button>
      </div>
      <div class="fr-section">
        <div class="fr-label">${t("friend.pasteLabel")}</div>
        <input id="fr-in" class="fr-code" type="text" inputmode="text" autocomplete="off"
          placeholder="${t("friend.pastePlaceholder")}" aria-label="${t("friend.pasteLabel")}">
        <button id="fr-go" class="btn-primary fr-btn" type="button">${t("friend.compareBtn")}</button>
        <div id="fr-result" class="fr-result" role="status" aria-live="polite"></div>
      </div>`;
  }

  function compareMarkup(theirs) {
    const cmp = buildFriendCompare(getMyCard(), theirs);
    const name = escapeHtml(cmp.theirName) || t("friend.them");
    const lead = cmp.lead === "mine" ? t("friend.leadMine")
      : cmp.lead === "theirs" ? t("friend.leadTheirs")
      : t("friend.leadTie");
    const rows = cmp.rows.map(r => `<div class="fr-row fr-${r.winner}">
        <span class="fr-metric">${t("friend.metric." + r.key)}</span>
        <span class="fr-mine">${r.mine.toLocaleString()}</span>
        <span class="fr-theirs">${r.theirs.toLocaleString()}</span>
      </div>`).join("");
    return `<div class="fr-lead">${lead}</div>
      <div class="fr-row fr-head"><span class="fr-metric"></span>
        <span class="fr-mine">${t("friend.you")}</span><span class="fr-theirs">${name}</span></div>
      ${rows}`;
  }

  function wireShareView() {
    panel.innerHTML = shareMarkup();
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
    $("#fr-in").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("#fr-go").click(); } });
  }

  function showCompare(theirs) {
    panel.innerHTML = compareMarkup(theirs) +
      `<button id="fr-back" class="fr-btn" type="button">${t("friend.compareAnother")}</button>`;
    $("#fr-back").onclick = wireShareView;
  }

  // open() with no arg → share view; open(card) → straight to a compare (deep link).
  function open(incoming) {
    if (incoming) showCompare(incoming); else wireShareView();
    openDialog(overlay, closeBtn, close);
  }

  closeBtn.onclick = close;
  overlay.addEventListener("click", e => { if (e.target.id === "friend-overlay") close(); });

  return { open };
}
