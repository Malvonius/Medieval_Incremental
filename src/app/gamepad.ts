/**
 * Gamepad-Steuerung über die Gamepad-API (Standard-Mapping):
 * Steuerkreuz bewegt den Fokus (im Kachelraster als Pfeiltaste, sonst zum vorigen/nächsten
 * fokussierbaren Element), A klickt, B entspricht Escape, X treibt Steuern ein.
 * Abfrage per requestAnimationFrame nur, solange ein Gamepad verbunden ist.
 */
const BUTTON = { a: 0, b: 1, x: 2, up: 12, down: 13, left: 14, right: 15 } as const;
const REPEAT_MS = 180;
const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

const ARROWS: Readonly<Record<number, string>> = {
  [BUTTON.up]: "ArrowUp",
  [BUTTON.down]: "ArrowDown",
  [BUTTON.left]: "ArrowLeft",
  [BUTTON.right]: "ArrowRight",
};

function moveFocus(direction: 1 | -1): void {
  const root = document.querySelector("[role=dialog]") ?? document.body;
  const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null && !el.closest("[inert]"));
  if (items.length === 0) return;
  const i = items.indexOf(document.activeElement as HTMLElement);
  const next = items[(i + direction + items.length) % items.length];
  next?.focus();
}

function press(button: number, onCollect: () => void): void {
  const active = document.activeElement as HTMLElement | null;
  const arrow = ARROWS[button];
  if (arrow) {
    // Im Kachelraster übernimmt dessen eigene Pfeilnavigation, sonst linear durch die Seite.
    if (active?.closest("[data-tile-grid]")) {
      active.dispatchEvent(new KeyboardEvent("keydown", { key: arrow, bubbles: true }));
    } else {
      moveFocus(button === BUTTON.up || button === BUTTON.left ? -1 : 1);
    }
  } else if (button === BUTTON.a) {
    active?.click();
  } else if (button === BUTTON.b) {
    (active ?? document.body).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  } else if (button === BUTTON.x) {
    onCollect();
  }
}

/** Startet die Abfrage; gibt eine Aufräumfunktion zurück. */
export function startGamepad(onCollect: () => void): () => void {
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") return () => {};
  const lastPress = new Map<number, number>();
  let frame = 0;

  const poll = (now: number): void => {
    const pads = navigator.getGamepads().filter((p): p is Gamepad => p !== null);
    for (const pad of pads) {
      for (const button of Object.values(BUTTON)) {
        const pressed = pad.buttons[button]?.pressed ?? false;
        if (!pressed) {
          lastPress.delete(button);
          continue;
        }
        const last = lastPress.get(button);
        // Erster Druck sofort, gehaltene Richtungstasten wiederholen sich.
        if (last === undefined || (ARROWS[button] && now - last > REPEAT_MS)) {
          lastPress.set(button, now);
          press(button, onCollect);
        }
      }
    }
    frame = pads.length > 0 ? requestAnimationFrame(poll) : 0;
  };

  const onConnect = (): void => {
    if (frame === 0) frame = requestAnimationFrame(poll);
  };
  window.addEventListener("gamepadconnected", onConnect);
  onConnect();
  return () => {
    window.removeEventListener("gamepadconnected", onConnect);
    cancelAnimationFrame(frame);
  };
}
