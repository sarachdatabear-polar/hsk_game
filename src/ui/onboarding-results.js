"use strict";

export function createOnboardingResults({ root, t, onSave, onContinue }) {
  function button(label, className, action) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = className;
    node.textContent = label;
    node.onclick = action;
    return node;
  }

  function render({ visible, offerSave }) {
    root.hidden = !visible;
    if (!visible) { root.replaceChildren(); return; }
    const title = document.createElement("h3");
    title.textContent = offerSave
      ? t("onboarding.results.saveTitle")
      : t("onboarding.results.readyTitle");
    const body = document.createElement("p");
    body.textContent = offerSave
      ? t("onboarding.results.saveBody")
      : t("onboarding.results.readyBody");
    const actions = document.createElement("div");
    actions.className = "onboarding-result-actions";
    if (offerSave) {
      actions.appendChild(button(t("onboarding.results.save"), "big primary", onSave));
      actions.appendChild(button(t("onboarding.results.continueFree"), "big", onContinue));
    } else {
      actions.appendChild(button(t("onboarding.results.tour"), "big primary", onContinue));
    }
    root.replaceChildren(title, body, actions);
  }

  return { render };
}
