export function bindWhisper(el: HTMLElement) {
  let until = 0;
  let busyUntil = 0;

  function hide() {
    el.classList.remove("is-on");
    el.classList.add("is-off");
  }

  function show(text: string, duration = 9000) {
    el.textContent = text;
    el.classList.remove("is-off");
    el.classList.add("is-on");
    until = performance.now() + duration;
    busyUntil = until + 400;
  }

  function tick(now: number) {
    if (until && now > until) {
      hide();
      until = 0;
    }
  }

  function busy(now = performance.now()) {
    return now < busyUntil;
  }

  return { show, hide, tick, busy };
}

export function isChromeTarget(el: EventTarget | null) {
  return Boolean((el as HTMLElement | null)?.closest?.("a, button"));
}
