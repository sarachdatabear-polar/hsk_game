"use strict";

const ICON_HREF = "assets/ui-icons.svg";

export function iconSvg(id) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("asset-icon");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `${ICON_HREF}#${id}`);
  svg.appendChild(use);
  return svg;
}

export function setIconLabel(el, icon, label) {
  el.replaceChildren();
  const wrap = document.createElement("span");
  wrap.className = "icon-text";
  if (icon) wrap.appendChild(iconSvg(icon));
  const text = document.createElement("span");
  text.textContent = label;
  wrap.appendChild(text);
  el.appendChild(wrap);
}

export function setIconOnly(el, icon) {
  el.replaceChildren(iconSvg(icon));
}

export function setPill(el, icon, text) {
  el.replaceChildren(iconSvg(icon), document.createTextNode(` ${text}`));
}
