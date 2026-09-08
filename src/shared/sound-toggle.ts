export type ToggleableSound = {
  enabled: boolean;
  start: () => Promise<void>;
  stop: () => void;
};

export const SOUND_OFF = "слушать";
export const SOUND_ON = "тишина";

export function syncSoundButton(el: HTMLButtonElement, enabled: boolean) {
  el.textContent = enabled ? SOUND_ON : SOUND_OFF;
  el.setAttribute("aria-pressed", enabled ? "true" : "false");
}

export function autoStartSound(sound: ToggleableSound, onStarted?: () => void) {
  const kick = async (e: Event) => {
    if ((e.target as HTMLElement | null)?.closest?.(".sound, #sound")) return;
    if (sound.enabled) return;
    await sound.start();
    onStarted?.();
  };
  window.addEventListener("pointerdown", kick, { capture: true });
}

export function bindSoundToggle(el: HTMLButtonElement, sound: ToggleableSound) {
  syncSoundButton(el, sound.enabled);
  el.addEventListener("click", async () => {
    if (sound.enabled) sound.stop();
    else await sound.start();
    syncSoundButton(el, sound.enabled);
  });
  autoStartSound(sound, () => syncSoundButton(el, sound.enabled));
}

export function muteWhenHidden(sound: { setMuted?: (muted: boolean) => void }) {
  document.addEventListener("visibilitychange", () => {
    sound.setMuted?.(document.hidden);
  });
}
