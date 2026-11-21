/** Pomocnicze funkcje do testów symulacji (bez Phasera). */
import type { CharId } from './constants';
import type { PlayerInput } from './types';
import { Sim } from './Sim';

export function input(x: number, y: number, extra: Partial<PlayerInput> = {}): PlayerInput {
  return { x, y, z: 0, face: -1, anim: 'idle', atk: 0, ak: 'n', act: false, ...extra };
}

/** Sim bez NPC — do testów konkretnych mechanik. */
export function emptySim(opts: { solo?: boolean; seed?: number; present?: Record<CharId, boolean> } = {}): Sim {
  const sim = new Sim(opts.present ?? { pole: true, romanian: true }, opts.solo ?? false, { seed: opts.seed ?? 1 });
  sim.npcs = [];
  return sim;
}

/** Kręci symulacją przez `secs` sekund z tymi samymi wejściami. */
export function run(sim: Sim, secs: number, inputs: Partial<Record<CharId, PlayerInput>>, dt = 1 / 60) {
  let last = sim.snapshot();
  const all = [...last.ev];
  for (let t = 0; t < secs; t += dt) {
    last = sim.update(dt, inputs);
    all.push(...last.ev);
  }
  return { snap: last, events: all };
}
