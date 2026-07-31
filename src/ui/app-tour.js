"use strict";

export function createAppTour({ root, t, onNavigate, onStep, onComplete }) {
  const title = root.querySelector(".app-tour-title");
  const body = root.querySelector(".app-tour-body");
  const count = root.querySelector(".app-tour-count");
  const next = root.querySelector(".app-tour-next");
  const skip = root.querySelector(".app-tour-skip");
  let step = 0;
  let replay = false;

  const steps = [
    { screen: "home", title: "onboarding.tour.homeTitle", body: "onboarding.tour.homeBody" },
    { screen: "cat-journey", title: "onboarding.tour.catTitle", body: "onboarding.tour.catBody" },
    { screen: "progress", title: "onboarding.tour.profileTitle", body: "onboarding.tour.profileBody" },
  ];

  function render() {
    const item = steps[step];
    onNavigate(item.screen);
    onStep(step);
    title.textContent = t(item.title);
    body.textContent = t(item.body);
    count.textContent = t("onboarding.tour.count", { current: step + 1, total: steps.length });
    next.textContent = step === steps.length - 1
      ? t("onboarding.tour.finish") : t("common.continue");
    skip.textContent = t("onboarding.tour.skip");
    root.hidden = false;
  }

  function finish() {
    root.hidden = true;
    onComplete({ replay });
  }

  next.onclick = () => {
    if (step >= steps.length - 1) finish();
    else { step += 1; render(); }
  };
  skip.onclick = finish;

  function start({ initialStep = 0, isReplay = false } = {}) {
    step = Math.max(0, Math.min(steps.length - 1, initialStep));
    replay = isReplay;
    render();
  }

  return { start, hide: () => { root.hidden = true; } };
}
