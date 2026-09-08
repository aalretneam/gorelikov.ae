export function bindBack(el: HTMLAnchorElement | null, delayMs?: number) {
  if (!el) return { show() {} };
  el.classList.add("back-arrow");
  el.href = "./";
  el.textContent = "←";
  el.setAttribute("aria-label", "лабиринт");
  if (typeof delayMs === "number") {
    window.setTimeout(() => el.classList.add("is-on"), Math.max(0, delayMs));
  }
  return {
    show() {
      el.classList.add("is-on");
    },
  };
}
