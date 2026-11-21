/** Wspólny stan sterowania: klawiatura + dotykowy joystick/przyciski. */
export const controls = {
  // z dotyku
  touchX: 0,
  touchY: 0,
  touchAtk: false,
  /** BIJ wciąż przytrzymany (ładowany cios) */
  touchAtkHeld: false,
  touchAct: false,
  touchJump: false,
  touchActive: false,
};

export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
