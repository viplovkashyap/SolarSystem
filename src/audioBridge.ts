import * as audio from "./audio";

let unlocked = false;

/** Unlock the WebAudio context on the first user gesture (called from Canvas + UI). */
export function audioUnlockOnce() {
  if (unlocked) return;
  unlocked = true;
  audio.unlock();
}

export function initGestureListeners() {
  const fn = () => {
    audioUnlockOnce();
    window.removeEventListener("pointerdown", fn);
    window.removeEventListener("keydown", fn);
  };
  window.addEventListener("pointerdown", fn);
  window.addEventListener("keydown", fn);
}
