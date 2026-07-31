"use strict";

// Small, contextual teaching moments layered over the real Word Quest. The
// game owns clock/freeze behavior; this module owns only guide presentation.
export function createOnboardingQuestGuide({ root, t, openDialog, closeDialog }) {
  const image = root.querySelector("img");
  const eyebrow = root.querySelector(".oq-eyebrow");
  const title = root.querySelector(".oq-title");
  const body = root.querySelector(".oq-body");
  const button = root.querySelector(".oq-next");
  const status = document.querySelector("#onboarding-quest-status");
  let statusTimer = 0;

  function card({ eyebrowText, titleText, bodyText, buttonText, onNext }) {
    eyebrow.textContent = eyebrowText;
    title.textContent = titleText;
    body.textContent = bodyText;
    button.textContent = buttonText;
    button.onclick = onNext;
  }

  function showFirstWord(word, onTip, onDone) {
    image.alt = "";
    card({
      eyebrowText: t("onboarding.quest.guide"),
      titleText: t("onboarding.quest.wordTitle", { word: word.h }),
      bodyText: t("onboarding.quest.wordBody", { pinyin: word.p }),
      buttonText: t("common.continue"),
      onNext: () => {
        onTip(1);
        card({
          eyebrowText: t("onboarding.quest.guide"),
          titleText: t("onboarding.quest.answersTitle"),
          bodyText: t("onboarding.quest.answersBody"),
          buttonText: t("onboarding.quest.letsPlay"),
          onNext: () => {
            onTip(2);
            closeDialog(root, false);
            onDone();
          },
        });
      },
    });
    openDialog(root, button, null);
  }

  function announce(message) {
    clearTimeout(statusTimer);
    status.textContent = message;
    status.hidden = false;
    statusTimer = setTimeout(() => { status.hidden = true; }, 3000);
  }

  function showOutcome(correct) {
    announce(t(correct ? "onboarding.quest.correctTip" : "onboarding.quest.reviewTip"));
  }

  function showProgress(learned, target) {
    announce(t("onboarding.quest.progressTip", { learned, target }));
  }

  function hide() {
    clearTimeout(statusTimer);
    status.hidden = true;
    closeDialog(root, false);
  }

  return { showFirstWord, showOutcome, showProgress, hide };
}
