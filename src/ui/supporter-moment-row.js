// src/ui/supporter-moment-row.js
// Quiet supporter line on the results screen (go-live step 7 "placement").
// DOM wiring only — all show/deny decisions live in the pure policy module
// src/monetization/supporter-moment.js; untested by design like the other
// src/ui/ factories. Rendering the row is what consumes the daily budget
// (recordSupporterMomentShown), so a denied render leaves the budget intact.
import { t } from "../i18n.js";
import {
  defaultSupporterMoment,
  shouldShowSupporterMoment,
  recordSupporterMomentShown,
} from "../monetization/supporter-moment.js";

export function createSupporterMomentRow({ $, store, isSupporter, supporterOn, goShopSupporter, getToday }) {
  // facts = { streakSaved, bossDefeated, leveledUp } for the round just ended.
  function render(facts) {
    const host = $("#r-supporter");
    if (!host) return;
    const state = Object.assign(defaultSupporterMoment(), store.get("supporterMoment", {}));
    const d = shouldShowSupporterMoment(state, {
      ...facts,
      isSupporter: isSupporter(),
      supporterOn: supporterOn(),
    }, getToday());
    if (!d.show) { host.hidden = true; return; }
    host.innerHTML = "";
    const line = document.createElement("span");
    line.className = "supporter-line";
    line.textContent = t("results.supporterLine");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip buy-chip";
    btn.textContent = t("results.supporterCta");
    btn.onclick = goShopSupporter;
    host.appendChild(line);
    host.appendChild(btn);
    host.hidden = false;
    store.set("supporterMoment", recordSupporterMomentShown(state, getToday()));
  }
  return { render };
}
