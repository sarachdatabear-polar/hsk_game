"use strict";

import {
  BOND_TIERS,
  CAT_BACKGROUNDS,
  activeClaimOf,
  bondPointsOf,
  bondProgressOf,
  completeCatJourney,
  goalDaysCountOf,
  journeyReturnNotificationPlan,
  journeyStatus,
  memoryRecordsOf,
  minutesUntilReturn,
  normalizeCatJourney,
  noteGoalDay,
  selectCatBackground,
  startCatJourney,
  unlockedBackgrounds,
} from "../cat-journey.js";
import { keepsakeById, memoryById, memoryForJourney } from "../cat-memories.js";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function createCatJourneyScreen({
  $, store, analytics, show, t, todayStr,
  getXp, getDailyInfo, getMasteredCount, getJourneyWordKey = () => "",
  getWordByKey = () => null, getWordMeaning = () => "", playWord = null,
  syncReturnReminder = () => {},
  now = () => Date.now(),
}) {
  let state = normalizeCatJourney(store.get("catJourney", null));
  let memoriesOpen = false;
  let backgroundsOpen = false;
  let highlightedMemoryId = "";
  let refreshTimer = 0;
  let memoryLimit = 20;

  function persist(next) {
    state = normalizeCatJourney(next);
    store.set("catJourney", state);
  }

  function facts() {
    const daily = getDailyInfo();
    const today = todayStr();
    const withGoal = noteGoalDay(state, today, daily.goalMet);
    if (!same(withGoal, state)) persist(withGoal);
    const points = bondPointsOf({
      masteredWords: getMasteredCount(),
      totalXp: getXp(),
      dailyGoalDays: goalDaysCountOf(state),
    });
    const bond = bondProgressOf(points);
    const status = journeyStatus(state, { today, goalMet: daily.goalMet, now: now() });
    return { daily, today, points, bond, status };
  }

  function statusCopy(status, daily, minutes) {
    if (status === "ready") return t("cat.status.ready");
    if (status === "exploring") return t("cat.status.exploring", { n: minutes });
    if (status === "returned") return t("cat.status.returned");
    if (status === "done") return t("cat.status.done");
    return t("cat.status.needsGoal", {
      done: Math.min(daily.todayResolved, daily.goal),
      goal: daily.goal,
    });
  }

  function catAssetFor(status) {
    if (status === "ready") return "assets/cat-journey-ready-v1.png";
    if (status === "returned") return "assets/cat-journey-return-v1.png";
    if (status === "done") return "assets/cat-rest-v1.png";
    return "assets/cat-thinking.png";
  }

  function renderBackgrounds(points) {
    const box = $("#cat-background-list");
    if (!box) return;
    box.innerHTML = "";
    const unlocked = new Set(unlockedBackgrounds(points).map(item => item.id));
    for (const item of CAT_BACKGROUNDS) {
      const earned = unlocked.has(item.id);
      const button = document.createElement("button");
      button.className = "cat-bg-choice";
      button.classList.toggle("on", state.selectedBackground === item.id);
      button.classList.toggle("locked", !earned);
      button.disabled = !earned;
      button.dataset.catBackground = item.id;
      button.setAttribute("aria-pressed", String(state.selectedBackground === item.id));
      button.setAttribute("aria-label", earned
        ? t("cat.bg.select", { name: t(item.nameKey) })
        : t("cat.bg.locked", { name: t(item.nameKey), n: item.unlockPoints }));
      const preview = document.createElement("span");
      preview.className = "cat-bg-preview";
      preview.style.backgroundImage = `url("assets/${item.file}"), url("assets/bg-home.webp")`;
      const label = document.createElement("span");
      label.className = "cat-bg-label";
      label.textContent = t(item.nameKey);
      const lock = document.createElement("small");
      lock.textContent = earned ? (state.selectedBackground === item.id ? t("cat.bg.selected") : "")
        : t("cat.bg.points", { n: item.unlockPoints });
      button.append(preview, label, lock);
      box.appendChild(button);
    }
  }

  function renderMemories() {
    const box = $("#cat-memory-list");
    if (!box) return;
    box.innerHTML = "";
    const allItems = memoryRecordsOf(state).slice().reverse();
    const items = allItems.slice(0, memoryLimit);
    $("#cat-memory-empty").hidden = allItems.length > 0;
    const more = $("#cat-memory-more");
    if (more) more.hidden = items.length >= allItems.length;
    for (const saved of items) {
      const memory = memoryById(saved.storyId || saved.id);
      const keepsake = keepsakeById(saved.keepsakeId || memory?.keepsakeId);
      const destination = CAT_BACKGROUNDS.find(item => item.id === saved.destinationId);
      const word = saved.wordKey ? getWordByKey(saved.wordKey) : null;
      const card = document.createElement("article");
      card.className = "cat-memory-card";
      card.classList.toggle("new", saved.id === highlightedMemoryId);
      card.tabIndex = 0;
      let icon;
      if (keepsake?.asset) {
        icon = document.createElement("img");
        icon.className = "asset-icon";
        icon.src = `assets/${keepsake.asset}`;
        icon.alt = "";
      } else {
        icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("class", "asset-icon");
        icon.setAttribute("aria-hidden", "true");
        const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.setAttribute("href", `assets/ui-icons.svg#${keepsake?.icon || "book"}`);
        icon.appendChild(use);
      }
      const copy = document.createElement("div");
      const title = document.createElement("b");
      title.textContent = t(memory?.titleKey || "cat.memory.archived.title");
      const story = document.createElement("p");
      story.textContent = t(memory?.storyKey || "cat.memory.archived.story");
      const meta = document.createElement("div");
      meta.className = "cat-memory-meta";
      const day = document.createElement("time");
      day.dateTime = saved.day;
      day.textContent = saved.day;
      if (destination) {
        const place = document.createElement("span");
        place.textContent = t("cat.memory.from", { place: t(destination.nameKey) });
        meta.appendChild(place);
      }
      meta.appendChild(day);
      copy.append(title, story, meta);
      if (word) {
        const wordRow = document.createElement("div");
        wordRow.className = "cat-memory-word";
        const wordCopy = document.createElement("span");
        const hanzi = document.createElement("b");
        hanzi.lang = "zh";
        hanzi.textContent = word.h;
        const detail = document.createElement("small");
        detail.textContent = [word.p, getWordMeaning(word)].filter(Boolean).join(" · ");
        wordCopy.append(hanzi, detail);
        wordRow.appendChild(wordCopy);
        if (playWord) {
          const play = document.createElement("button");
          play.type = "button";
          play.className = "cat-memory-audio";
          play.setAttribute("aria-label", t("cat.memory.playWord", { word: word.h }));
          const audioIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          audioIcon.setAttribute("class", "asset-icon");
          audioIcon.setAttribute("aria-hidden", "true");
          const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
          use.setAttribute("href", "assets/ui-icons.svg#sound");
          audioIcon.appendChild(use);
          play.appendChild(audioIcon);
          play.onclick = () => playWord(saved.wordKey);
          wordRow.appendChild(play);
        }
        copy.appendChild(wordRow);
      }
      card.append(icon, copy);
      box.appendChild(card);
    }
  }

  function scheduleRefresh(status, visible) {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = 0;
    }
    if (status !== "exploring" || !visible) return;
    refreshTimer = window.setTimeout(() => {
      refreshTimer = 0;
      render();
    }, 30000);
  }

  function render() {
    const root = $("#s-cat-journey");
    if (!root) return;
    const { daily, points, bond, status } = facts();
    const unlocked = unlockedBackgrounds(points);
    if (!unlocked.some(item => item.id === state.selectedBackground)) {
      persist(selectCatBackground(state, "bg-home", points));
    }
    const background = CAT_BACKGROUNDS.find(item => item.id === state.selectedBackground)
      || CAT_BACKGROUNDS[0];
    const tierIndex = BOND_TIERS.findIndex(item => item.id === bond.current.id);
    if (tierIndex > state.lastSeenBondTier) {
      analytics.track("cat_bond_tier_unlocked", { bond_tier: bond.current.id });
      persist({ ...state, lastSeenBondTier: tierIndex });
    }

    root.dataset.journeyStatus = status;
    $("#cat-scene").style.backgroundImage = `url("assets/${background.file}"), url("assets/bg-home.webp")`;
    const cat = $("#cat-journey-character");
    cat.onerror = () => {
      cat.onerror = null;
      cat.src = "assets/cat-thinking.png";
    };
    cat.src = catAssetFor(status);
    cat.alt = t("cat.characterAlt");
    cat.hidden = status === "exploring";
    $("#cat-away").hidden = status !== "exploring";

    $("#cat-bond-tier").textContent = t(bond.current.nameKey);
    $("#cat-bond-points").textContent = t("cat.bondPoints", { n: points });
    $("#cat-bond-fill").style.width = `${bond.pct}%`;
    $("#cat-bond-fill").parentElement.setAttribute("aria-valuenow", String(bond.pct));
    $("#cat-bond-fill").parentElement.setAttribute("aria-valuetext", bond.next
      ? t("cat.bondNext", { n: bond.need - bond.into, name: t(bond.next.nameKey) })
      : t("cat.bondMax"));
    $("#cat-bond-next").textContent = bond.next
      ? t("cat.bondNext", { n: bond.need - bond.into, name: t(bond.next.nameKey) })
      : t("cat.bondMax");

    const goalPct = daily.goal ? Math.min(100, Math.round(100 * daily.todayResolved / daily.goal)) : 0;
    $("#cat-goal-fill").style.width = `${goalPct}%`;
    $("#cat-goal-meter").setAttribute("aria-valuenow", String(goalPct));
    $("#cat-goal-copy").textContent = daily.goalMet
      ? t("cat.goalComplete")
      : t("cat.goalProgress", { done: Math.min(daily.todayResolved, daily.goal), goal: daily.goal });

    const minutes = minutesUntilReturn(state, now());
    $("#cat-status-copy").textContent = statusCopy(status, daily, minutes);
    const primary = $("#cat-primary");
    // Exploring is a waiting state, but it should not be a dead end. The same
    // primary control routes back to study while the return timer continues.
    primary.disabled = false;
    primary.textContent = status === "ready" ? t("cat.cta.explore")
      : status === "returned" ? t("cat.cta.return")
      : status === "exploring" ? t("cat.cta.exploring")
      : status === "done" ? t("cat.cta.studyMore")
      : t("cat.cta.study");

    $("#cat-background-panel").hidden = !backgroundsOpen;
    $("#cat-memories-panel").hidden = !memoriesOpen;
    $("#cat-backgrounds-toggle").setAttribute("aria-expanded", String(backgroundsOpen));
    $("#cat-memories-toggle").setAttribute("aria-expanded", String(memoriesOpen));
    $("#cat-memory-count").textContent = String(memoryRecordsOf(state).length);
    renderBackgrounds(points);
    renderMemories();
    scheduleRefresh(status, root.classList.contains("on"));
  }

  function openMemories(source = "screen") {
    memoriesOpen = !memoriesOpen;
    if (memoriesOpen) {
      backgroundsOpen = false;
      analytics.track("cat_memory_opened", {
        memory_id: highlightedMemoryId || "journal",
        source,
      });
    }
    render();
    if (memoriesOpen) requestAnimationFrame(() => $("#cat-memories-panel")?.scrollIntoView({ block: "nearest" }));
  }

  function handlePrimary() {
    const { daily, today, bond, status } = facts();
    if (status === "ready") {
      persist(startCatJourney(state, {
        today,
        goalMet: daily.goalMet,
        now: now(),
        destinationId: state.selectedBackground,
        wordKey: getJourneyWordKey(),
      }));
      syncReturnReminder(journeyReturnNotificationPlan(state, now()));
      analytics.track("cat_journey_started", { bond_tier: bond.current.id });
      $("#cat-live").textContent = t("cat.announce.started");
      render();
      return;
    }
    if (status === "returned") {
      const active = activeClaimOf(state);
      if (!active) return;
      const savedMemories = memoryRecordsOf(state);
      const tierIndex = BOND_TIERS.findIndex(item => item.id === bond.current.id);
      const memory = memoryForJourney(active.day, savedMemories, { bondTier: tierIndex });
      if (!memory) return;
      persist(completeCatJourney(state, memory, now()));
      syncReturnReminder(journeyReturnNotificationPlan(state, now()));
      highlightedMemoryId = memory.id;
      memoriesOpen = true;
      backgroundsOpen = false;
      analytics.track("cat_journey_returned", { memory_id: memory.id });
      $("#cat-live").textContent = t("cat.announce.returned", { name: t(memory.titleKey) });
      render();
      requestAnimationFrame(() => $("#cat-memories-panel")?.scrollIntoView({ block: "nearest" }));
      return;
    }
    analytics.track("cat_study_cta_tapped", { source: "cat_screen", status });
    show("scope");
  }

  $("#cat-primary").onclick = handlePrimary;
  $("#cat-backgrounds-toggle").onclick = () => {
    backgroundsOpen = !backgroundsOpen;
    if (backgroundsOpen) memoriesOpen = false;
    render();
  };
  $("#cat-memories-toggle").onclick = () => openMemories("button");
  $("#cat-memory-more").onclick = () => {
    memoryLimit += 20;
    render();
  };
  $("#cat-background-list").onclick = event => {
    const button = event.target.closest("[data-cat-background]");
    if (!button || button.disabled) return;
    const { points } = facts();
    const next = selectCatBackground(state, button.dataset.catBackground, points, { at: now() });
    if (next.selectedBackground !== state.selectedBackground) {
      persist(next);
      analytics.track("cat_background_selected", { background_id: next.selectedBackground });
      $("#cat-live").textContent = t("cat.announce.background");
    }
    render();
  };

  function enter(source = "nav") {
    state = normalizeCatJourney(store.get("catJourney", state));
    highlightedMemoryId = "";
    memoryLimit = 20;
    analytics.track("cat_journey_viewed", {
      source,
      bond_tier: facts().bond.current.id,
      status: facts().status,
    });
    render();
  }

  function rehydrate() {
    state = normalizeCatJourney(store.get("catJourney", state));
    render();
  }

  return { enter, render, rehydrate };
}
