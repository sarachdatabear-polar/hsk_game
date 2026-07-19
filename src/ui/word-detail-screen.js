// src/ui/word-detail-screen.js
// DOM controller for the word-detail panel. Untested by design (DOM wiring),
// like main.js; the logic seam is buildWordDetail (src/ui/word-detail.js).
// main.js constructs this once at boot and calls open(word) from triggers.
import { buildWordDetail } from "./word-detail.js";
import { t } from "../i18n.js";

export function createWordDetail({ $, openDialog, closeDialog, examples, getLocale }) {
  const overlay = $("#word-overlay");
  const titleEl = $("#word-dialog-title");
  const panel = $("#word-panel");
  const closeBtn = $("#word-popup-close");

  function close() { closeDialog(overlay); }

  function render(vm) {
    const tierLabel = t(vm.tier === "core" ? "wd.core" : "wd.extended");
    const meta = `HSK${vm.level} · ${tierLabel}`;
    const papers = t("wd.appearsInPapers", { n: vm.examLine.n, total: vm.examLine.total });
    const hsk3 = vm.hsk3Band ? `<div class="wd-hsk3">${t("wd.alsoInHsk3", { band: vm.hsk3Band })}</div>` : "";
    const ex = vm.example ? `<div class="wd-example">
        <div class="wd-example-label">${t("fc.inSentence")}</div>
        <div class="wd-example-cn">${vm.example.cn}</div>
        <div class="wd-example-tr">${vm.example.tr}</div>
      </div>` : "";
    return `<div class="wd-py">${vm.pinyin}</div>
      <div class="wd-en">${vm.english}</div>
      <div class="wd-th">${vm.thai}</div>
      <div class="wd-meta">${meta}</div>
      <div class="wd-papers">${papers}</div>${hsk3}${ex}`;
  }

  function open(word) {
    if (!word) return;
    const vm = buildWordDetail(word, examples, getLocale());
    titleEl.textContent = vm.hanzi;
    panel.innerHTML = render(vm);
    openDialog(overlay, closeBtn, close);
  }

  closeBtn.onclick = close;
  overlay.addEventListener("click", e => { if (e.target.id === "word-overlay") close(); });

  return { open };
}
