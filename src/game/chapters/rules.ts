/** Zasady rozdziału: cele, przejścia, przegrana — wszystko, co nie jest wspólną walką. */
import type { PlayerSim } from '../Sim';
import type { ActKind, ObjSnap, CitySnap } from '../types';

export interface ActChoice {
  kind: ActKind;
  target: number;
}

export interface ChapterRules {
  readonly chapter: 1 | 2;
  /** numer „wejścia” do obszaru — klient wysyła go z pozycją; stare pozycje są ignorowane */
  readonly seq: number;
  /** pierwsze rozstawienie świata */
  init(): void;
  /** akcje specyficzne dla rozdziału (null = brak, sprawdzaj dalej ogólne) */
  chooseAct(p: PlayerSim): ActChoice | null;
  /** czy akcja może teraz postępować (np. Polak musi stać na czatach) */
  canProgress(p: PlayerSim, kind: ActKind, dt: number): boolean;
  /** zakończenie akcji specyficznej dla rozdziału; true = obsłużona */
  completeAct(p: PlayerSim, kind: ActKind, target: number): boolean;
  /** cios w obiekty rozdziału (np. kłódka); true = coś trafiono */
  onAttack(p: PlayerSim, x: number, y: number, face: 1 | -1, range: number): boolean;
  update(dt: number): void;
  /** obaj gracze leżą */
  onAllDown(): void;
  /** czy w tym obszarze może przyjechać policja */
  policeAllowed(): boolean;
  snap(): { o?: ObjSnap; city?: CitySnap };
}
