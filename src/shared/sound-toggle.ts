export type ToggleableSound = {
  enabled: boolean;
  start: () => Promise<void>;
  stop: () => void;
};

export const SOUND_OFF = "звук / выкл";
export const SOUND_ON = "звук / вкл";

export function syncSoundButton(el: HTMLButtonElement, enabled: boolean) {
  el.textContent = enabled ? SOUND_ON : SOUND_OFF;
  el.setAttribute("aria-pressed", enabled ? "true" : "false");
}

export function bindSoundToggle(el: HTMLButtonElement, sound: ToggleableSound) {
  syncSoundButton(el, sound.enabled);
  el.addEventListener("click", async () => {
    if (sound.enabled) sound.stop();
    else await sound.start();
    syncSoundButton(el, sound.enabled);
  });
}

export function muteWhenHidden(sound: { setMuted?: (muted: boolean) => void }) {
  document.addEventListener("visibilitychange", () => {
    sound.setMuted?.(document.hidden);
  });
}
