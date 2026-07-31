"use strict";

import {
  chooseAccountPath,
  noteAccountVerified,
  noteCodeSent,
  startOnboardingQuest,
} from "../onboarding.js";
import { canSendCode, codeLooksValid } from "../account.js";

// The first-run form owns only presentation and its short-lived OTP fields.
// Persistent onboarding state and game/auth edges stay with main.js.
export function createOnboardingScreen({
  root,
  t,
  getState,
  saveState,
  getLocale,
  setLocale,
  getLevel,
  setLevel,
  isOnline,
  sendCode,
  verifyCode,
  getDisplayName,
  onSignedIn,
  onStartQuest,
  notify,
}) {
  let email = "";
  let verifyType = "email";
  let lastSentAt = 0;
  let busy = false;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(label, className, action) {
    const node = el("button", className, label);
    node.type = "button";
    node.onclick = async () => {
      if (busy || node.disabled) return;
      busy = true;
      node.disabled = true;
      try { await action(); }
      finally { busy = false; if (node.isConnected) node.disabled = false; }
    };
    return node;
  }

  function save(next) {
    saveState(next);
    render();
  }

  function languagePicker() {
    const wrap = el("div", "onboarding-block");
    wrap.appendChild(el("div", "sect", t("onboarding.language")));
    const chips = el("div", "chips");
    for (const [locale, label] of [["en", "English"], ["th", "ไทย"]]) {
      const chip = button(label, "chip", () => { setLocale(locale); render(); });
      const selected = getLocale() === locale;
      chip.classList.toggle("on", selected);
      chip.setAttribute("aria-pressed", String(selected));
      chips.appendChild(chip);
    }
    wrap.appendChild(chips);
    return wrap;
  }

  function welcome() {
    root.appendChild(languagePicker());
    const actions = el("div", "onboarding-actions");
    if (isOnline()) {
      const create = button(t("onboarding.createAccount"), "start-btn welcome-start", () => {
        save(chooseAccountPath(getState(), "account"));
      });
      create.id = "onboarding-create-account";
      actions.appendChild(create);
      const tryFirst = button(t("onboarding.tryFirst"), "big onboarding-secondary", () => {
        save(chooseAccountPath(getState(), "try-first"));
      });
      tryFirst.id = "onboarding-try-first";
      actions.appendChild(tryFirst);
    } else {
      actions.appendChild(button(t("onboarding.playOffline"), "start-btn welcome-start", () => {
        save(chooseAccountPath(getState(), "offline"));
      }));
    }
    root.appendChild(actions);
    root.appendChild(el("p", "welcome-hint onboarding-free", t("onboarding.freePromise")));
  }

  function labelledInput(labelText, type, value) {
    const label = el("label", "onboarding-field");
    label.appendChild(el("span", "onboarding-label", labelText));
    const input = el("input", "account-input");
    input.type = type;
    input.value = value;
    label.appendChild(input);
    return { label, input };
  }

  function account() {
    root.appendChild(el("button", "back onboarding-back", t("common.back")));
    root.lastChild.type = "button";
    root.lastChild.onclick = () => save(chooseAccountPath({ ...getState(), stage: "welcome" }, "unknown"));
    root.appendChild(el("h3", "onboarding-heading", t("onboarding.accountTitle")));
    root.appendChild(el("p", "welcome-blurb onboarding-copy", t("onboarding.accountBlurb")));
    const field = labelledInput(t("onboarding.emailLabel"), "email", email);
    field.input.autocomplete = "email";
    field.input.inputMode = "email";
    root.appendChild(field.label);
    root.appendChild(button(t("account.sendCode"), "start-btn welcome-start", async () => {
      const value = field.input.value.trim();
      const gate = canSendCode(value, lastSentAt, Date.now());
      if (!gate.ok) {
        notify(t(gate.reason === "invalid-email" ? "account.err.badEmail" : "account.resendWait", {
          s: Math.ceil((gate.waitMs || 0) / 1000),
        }));
        return;
      }
      const result = await sendCode(value);
      if (!result.ok) {
        notify(t("account.err." + (result.reason === "offline" ? "offline" : "network")));
        return;
      }
      email = value;
      verifyType = result.verifyType;
      lastSentAt = Date.now();
      notify(t("account.codeSent"));
      save(noteCodeSent(getState()));
    }));
    root.appendChild(el("p", "welcome-hint onboarding-free", t("onboarding.noPassword")));
  }

  function verify() {
    // A reload cannot safely restore an email that was deliberately kept out
    // of local storage. Return to the email step rather than presenting a
    // code field with no destination.
    if (!email) {
      saveState({ ...getState(), stage: "account" });
      account();
      return;
    }
    const change = el("button", "back onboarding-back", t("account.changeEmail"));
    change.type = "button";
    change.onclick = () => save({ ...getState(), stage: "account" });
    root.appendChild(change);
    root.appendChild(el("h3", "onboarding-heading", t("onboarding.verifyTitle")));
    root.appendChild(el("p", "welcome-blurb onboarding-copy", t("account.codeFor", { email })));
    const field = labelledInput(t("onboarding.codeLabel"), "text", "");
    field.input.inputMode = "numeric";
    field.input.autocomplete = "one-time-code";
    field.input.maxLength = 10;
    root.appendChild(field.label);
    root.appendChild(button(t("account.verify"), "start-btn welcome-start", async () => {
      const code = field.input.value.trim();
      if (!codeLooksValid(code)) { notify(t("account.err.badCode")); return; }
      const result = await verifyCode(email, code, verifyType, getLocale(), getDisplayName() || undefined);
      if (!result.ok) {
        const reason = result.reason === "bad-code" ? "badCode" : result.reason === "offline" ? "offline" : "network";
        notify(t("account.err." + reason));
        return;
      }
      await onSignedIn(result.session);
      notify(t("account.signedIn"));
      save(noteAccountVerified(getState()));
    }));
  }

  function level() {
    root.appendChild(el("h3", "onboarding-heading", t("onboarding.levelTitle")));
    root.appendChild(el("p", "welcome-blurb onboarding-copy", t("onboarding.levelBlurb")));
    const chips = el("div", "chips onboarding-levels");
    chips.id = "welcome-level-chips";
    for (let level = 1; level <= 6; level += 1) {
      const chip = button(`HSK${level}`, "chip", () => { setLevel(level); render(); });
      chip.dataset.wlv = String(level);
      const selected = getLevel() === level;
      chip.classList.toggle("on", selected);
      chip.setAttribute("aria-pressed", String(selected));
      chips.appendChild(chip);
    }
    root.appendChild(chips);
    root.appendChild(el("p", "welcome-hint", t("onboarding.levelHint")));
    const start = button(t("onboarding.startQuest"), "start-btn welcome-start", () => {
      const next = startOnboardingQuest(getState());
      saveState(next);
      onStartQuest();
    });
    start.id = "welcome-start";
    root.appendChild(start);
    root.appendChild(el("p", "welcome-hint onboarding-free", t("onboarding.questPromise")));
  }

  function render() {
    root.replaceChildren();
    const stage = getState().stage;
    if (stage === "account") account();
    else if (stage === "verify") verify();
    else if (stage === "level") level();
    else welcome();
  }

  return { render };
}
