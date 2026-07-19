import { buildPersonAffinities, PersonSignal } from './personSignal';

const NOLAN = { id: 1, name: 'Christopher Nolan' };
const BALE = { id: 2, name: 'Christian Bale' };
const CAINE = { id: 3, name: 'Michael Caine' };

function signal(overrides: Partial<PersonSignal> = {}): PersonSignal {
  return { rating: null, topCast: [], director: null, ...overrides };
}

describe('buildPersonAffinities', () => {
  it('returns empty for no signals', () => {
    expect(buildPersonAffinities([])).toEqual([]);
  });

  it('requires a minimum number of appearances', () => {
    const result = buildPersonAffinities([signal({ director: NOLAN, rating: 9 })]);
    expect(result).toEqual([]);
  });

  it('counts appearances across titles and keeps recurring people', () => {
    const result = buildPersonAffinities([
      signal({ director: NOLAN, topCast: [BALE] }),
      signal({ director: NOLAN, topCast: [BALE] }),
    ]);
    expect(result.map((person) => person.id)).toEqual([NOLAN.id, BALE.id]);
    expect(result[0].appearances).toBe(2);
  });

  it('weights directors above cast members', () => {
    const result = buildPersonAffinities([
      signal({ director: NOLAN, topCast: [BALE] }),
      signal({ director: NOLAN, topCast: [BALE] }),
    ]);
    const nolan = result.find((person) => person.id === NOLAN.id)!;
    const bale = result.find((person) => person.id === BALE.id)!;
    expect(nolan.weight).toBeGreaterThan(bale.weight);
  });

  it('lets loved titles boost and hated titles bury a person', () => {
    const result = buildPersonAffinities([
      signal({ topCast: [BALE], rating: 9 }),
      signal({ topCast: [BALE], rating: 9 }),
      signal({ topCast: [CAINE], rating: 2 }),
      signal({ topCast: [CAINE], rating: 2 }),
    ]);
    expect(result.map((person) => person.id)).toEqual([BALE.id]);
  });

  it('applies the limit after sorting by weight', () => {
    const people = Array.from({ length: 6 }, (_, index) => ({
      id: index + 10,
      name: `Person ${index}`,
    }));
    const signals = people.flatMap((person) => [
      signal({ topCast: [person], rating: person.id }),
      signal({ topCast: [person], rating: person.id }),
    ]);
    const result = buildPersonAffinities(signals, { limit: 3 });
    expect(result).toHaveLength(3);
  });
});
