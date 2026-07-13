import { parseCSV, parseCSVRecords } from './csv';

describe('parseCSV', () => {
  it('splits simple comma-separated rows', () => {
    const rows = parseCSV('a,b,c\n1,2,3\n');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields with embedded commas', () => {
    const rows = parseCSV('Name,Rating\n"Okja, the Movie",4.5\n');
    expect(rows).toEqual([
      ['Name', 'Rating'],
      ['Okja, the Movie', '4.5'],
    ]);
  });

  it('unescapes doubled quotes inside quoted fields', () => {
    const rows = parseCSV('Note\n"She said ""hi"""\n');
    expect(rows).toEqual([['Note'], ['She said "hi"']]);
  });

  it('ignores trailing blank lines', () => {
    const rows = parseCSV('a,b\n1,2\n\n');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('parseCSVRecords', () => {
  it('maps rows to objects keyed by header', () => {
    const records = parseCSVRecords('Name,Year\nTitanic,1998\nAvatar,2009\n');
    expect(records).toEqual([
      { Name: 'Titanic', Year: '1998' },
      { Name: 'Avatar', Year: '2009' },
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseCSVRecords('')).toEqual([]);
  });
});
