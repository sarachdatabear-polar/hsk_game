"use strict";

import { canSendCode, codeLooksValid } from "../account.js";

export function createSupporterOfferSheet({
  root, t, openDialog, closeDialog, isOwned, isSignedIn, getPrice,
  sendCode, verifyCode, getLocale, getDisplayName, onSignedIn,
  onCheckout, onRestore, notify,
}) {
  const panel = root.querySelector(".supporter-sheet-panel");
  let phase = "offer";
  let email = "";
  let verifyType = "email";
  let lastSentAt = 0;
  let busy = false;

  function node(tag, className, text) {
    const item = document.createElement(tag);
    if(className) item.className = className;
    if(text !== undefined) item.textContent = text;
    return item;
  }

  function action(label, className, handler) {
    const button = node("button", className, label);
    button.type = "button";
    button.onclick = async () => {
      if(busy || button.disabled) return;
      busy = true;
      button.disabled = true;
      try { await handler(button); }
      finally { busy = false; if(button.isConnected) button.disabled = false; }
    };
    return button;
  }

  function closeButton() {
    const close = action(t("common.close"), "supporter-sheet-close", () => closeDialog(root));
    close.setAttribute("aria-label", t("common.close"));
    return close;
  }

  function compactSummary() {
    const summary = node("div", "supporter-sheet-summary");
    summary.append(node("strong", "", t("supporter.sheet.title")), node("span", "", t("supporter.sheet.price", { price:getPrice() })));
    return summary;
  }

  function offer() {
    panel.append(closeButton());
    panel.appendChild(node("div", "supporter-sheet-eyebrow", t("supporter.sheet.eyebrow")));
    panel.appendChild(node("h2", "", isOwned() ? t("supporter.sheet.active") : t("supporter.sheet.title")));
    if(isOwned()) {
      panel.appendChild(node("p", "supporter-sheet-lead", t("supporter.sheet.activeBody")));
    } else {
      panel.appendChild(node("p", "supporter-sheet-lead", t("supporter.sheet.lead")));
      const list = node("ul", "supporter-benefits");
      for(const text of [
        t("supporter.sheet.benefitGuides"),
        t("supporter.sheet.benefitCoins"),
        t("supporter.sheet.benefitBadge"),
        t("supporter.sheet.benefitAds"),
        t("supporter.sheet.benefitRestore"),
      ]) list.appendChild(node("li", "", text));
      panel.appendChild(list);
      panel.appendChild(node("p", "supporter-sheet-price", t("supporter.sheet.price", { price:getPrice() })));
      panel.appendChild(node("p", "supporter-sheet-trust", t("supporter.sheet.secure")));
      panel.appendChild(action(
        isSignedIn() ? t("supporter.sheet.checkout", { price:getPrice() }) : t("supporter.sheet.email"),
        "big primary supporter-sheet-primary",
        button => isSignedIn() ? onCheckout(button) : (phase = "email", render()),
      ));
    }
    panel.appendChild(action(t("iap.restore"), "supporter-sheet-link", async () => {
      await onRestore();
      render();
    }));
    const links = node("div", "supporter-sheet-links");
    const privacy = node("a", "", t("settings.privacy"));
    privacy.href = "privacy.html"; privacy.target = "_blank"; privacy.rel = "noopener";
    const help = node("a", "", t("supporter.sheet.help"));
    help.href = "mailto:sarach.northbear@gmail.com?subject=Lucky%20Cat%20Supporter%20help";
    links.append(privacy, help);
    panel.appendChild(links);
    panel.appendChild(action(t("supporter.sheet.notNow"), "supporter-sheet-not-now", () => closeDialog(root)));
  }

  function labelledInput(labelText, type, value) {
    const label = node("label", "supporter-sheet-field");
    label.appendChild(node("span", "", labelText));
    const input = node("input", "account-input");
    input.type = type; input.value = value;
    label.appendChild(input);
    return { label, input };
  }

  function emailStep() {
    panel.append(closeButton(), compactSummary());
    panel.appendChild(node("h2", "", t("supporter.sheet.saveTitle")));
    panel.appendChild(node("p", "supporter-sheet-lead", t("supporter.sheet.saveBody")));
    const field = labelledInput(t("onboarding.emailLabel"), "email", email);
    field.input.autocomplete = "email"; field.input.inputMode = "email";
    panel.appendChild(field.label);
    panel.appendChild(action(t("account.sendCode"), "big primary supporter-sheet-primary", async () => {
      const value = field.input.value.trim();
      const gate = canSendCode(value, lastSentAt, Date.now());
      if(!gate.ok){ notify(t(gate.reason === "invalid-email" ? "account.err.badEmail" : "account.resendWait", { s:Math.ceil((gate.waitMs || 0)/1000) })); return; }
      const result = await sendCode(value);
      if(!result.ok){ notify(t("account.err." + (result.reason === "offline" ? "offline" : "network"))); return; }
      email = value; verifyType = result.verifyType; lastSentAt = Date.now(); phase = "verify";
      notify(t("account.codeSent")); render();
    }));
    panel.appendChild(action(t("common.back"), "supporter-sheet-link", () => { phase = "offer"; render(); }));
  }

  function verifyStep() {
    panel.append(closeButton(), compactSummary());
    panel.appendChild(node("h2", "", t("onboarding.verifyTitle")));
    panel.appendChild(node("p", "supporter-sheet-lead", t("account.codeFor", { email })));
    const field = labelledInput(t("onboarding.codeLabel"), "text", "");
    field.input.inputMode = "numeric"; field.input.autocomplete = "one-time-code"; field.input.maxLength = 10;
    panel.appendChild(field.label);
    panel.appendChild(action(t("account.verify"), "big primary supporter-sheet-primary", async () => {
      const code = field.input.value.trim();
      if(!codeLooksValid(code)){ notify(t("account.err.badCode")); return; }
      const result = await verifyCode(email, code, verifyType, getLocale(), getDisplayName() || undefined);
      if(!result.ok){
        const reason = result.reason === "bad-code" ? "badCode" : result.reason === "offline" ? "offline" : "network";
        notify(t("account.err." + reason)); return;
      }
      await onSignedIn(result.session);
      phase = "offer";
      notify(t("supporter.sheet.accountReady"));
      render();
    }));
    panel.appendChild(action(t("account.changeEmail"), "supporter-sheet-link", () => { phase = "email"; render(); }));
  }

  function render() {
    panel.replaceChildren();
    root.setAttribute("aria-label", t("supporter.sheet.title"));
    if(phase === "email") emailStep();
    else if(phase === "verify") verifyStep();
    else offer();
    if(root.classList.contains("on")) requestAnimationFrame(() => panel.querySelector("input")?.focus());
  }

  function open() {
    phase = "offer";
    render();
    openDialog(root, panel.querySelector(".supporter-sheet-primary") || panel.querySelector("button"), () => closeDialog(root));
  }

  return { open, render };
}
