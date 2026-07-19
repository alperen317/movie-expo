import { signalWeight } from './tasteProfile';

export interface PersonRef {
  id: number;
  name: string;
}

export interface PersonSignal {
  rating: number | null;
  topCast: PersonRef[];
  director: PersonRef | null;
}

export interface PersonAffinity extends PersonRef {
  weight: number;
  /** Distinct titles the person appeared in across the signals. */
  appearances: number;
}

// A director stamps a film far more than any single cast member, so their
// share of a title's signal weight is doubled.
const DIRECTOR_MULTIPLIER = 2;

// One shared title says little ("you watched one Nolan film"); require at
// least two before a person can headline a row.
const MIN_APPEARANCES = 2;

// Derives "favorite people" from the user's highest-signal titles. Ratings
// reuse the taste-profile weighting (8+ counts double, low ratings subtract),
// so someone the user keeps watching *and* hating never surfaces.
export function buildPersonAffinities(
  signals: PersonSignal[],
  options: { minAppearances?: number; limit?: number } = {},
): PersonAffinity[] {
  const { minAppearances = MIN_APPEARANCES, limit = 5 } = options;

  const byPerson = new Map<number, PersonAffinity>();
  const add = (person: PersonRef, weight: number) => {
    const existing = byPerson.get(person.id);
    if (existing) {
      existing.weight += weight;
      existing.appearances += 1;
    } else {
      byPerson.set(person.id, { ...person, weight, appearances: 1 });
    }
  };

  for (const signal of signals) {
    const weight = signalWeight(signal.rating);
    if (signal.director) add(signal.director, weight * DIRECTOR_MULTIPLIER);
    for (const member of signal.topCast) add(member, weight);
  }

  return [...byPerson.values()]
    .filter((person) => person.weight > 0 && person.appearances >= minAppearances)
    .sort((a, b) => b.weight - a.weight || b.appearances - a.appearances)
    .slice(0, limit);
}
