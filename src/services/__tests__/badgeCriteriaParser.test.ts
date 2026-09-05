import {
  BadgeCriteriaTuple,
  parseCriteriaTuples,
  calculateTotalTarget,
  parseProgressData,
} from '../badgeCriteriaParser';

describe('badgeCriteriaParser', () => {
  describe('parseCriteriaTuples', () => {
    it('parses standard 2-length tuple array correctly', () => {
      const criteriaData = [
        ['paresan', 5],
        ['coffee_spot', 3],
      ];
      const result: BadgeCriteriaTuple[] = parseCriteriaTuples(criteriaData);

      expect(result).toEqual([
        ['paresan', 5],
        ['coffee_spot', 3],
      ]);
    });

    it('parses total visits milestone criteria with wildcard "*"', () => {
      const criteriaData = [['*', 10]];
      const result: BadgeCriteriaTuple[] = parseCriteriaTuples(criteriaData);

      expect(result).toEqual([['*', 10]]);
    });

    it('returns empty array when criteriaData is null, undefined, or non-array (e.g. legacy object)', () => {
      expect(parseCriteriaTuples(null)).toEqual([]);
      expect(parseCriteriaTuples(undefined)).toEqual([]);
      expect(parseCriteriaTuples({ tag_id: 'paresan', threshold: 5 })).toEqual([]);
      expect(parseCriteriaTuples('invalid')).toEqual([]);
    });

    it('safely filters out invalid or empty items in tuple array', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const invalidData = [
        ['paresan', 5],
        ['', 10], // empty tag
        'not-an-array',
        [null, 2],
      ];
      const result = parseCriteriaTuples(invalidData);

      expect(result).toEqual([['paresan', 5]]);
      warnSpy.mockRestore();
    });

    it('ensures threshold is at least 1', () => {
      const zeroThreshold = [['paresan', 0]];
      const result = parseCriteriaTuples(zeroThreshold);

      expect(result).toEqual([['paresan', 1]]);
    });

    it('skips criteria tuple when tag_id does not exist in validTagIds and logs a warning', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const criteriaData = [
        ['paresan', 5],
        ['non_existent_tag', 3],
        ['*', 10], // wildcard milestone criteria is always preserved
      ];
      const validTags = new Set(['paresan', 'coffee_spot']);
      const result = parseCriteriaTuples(criteriaData, validTags);

      expect(result).toEqual([
        ['paresan', 5],
        ['*', 10],
      ]);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('tag_id "non_existent_tag" does not exist in tags table')
      );

      warnSpy.mockRestore();
    });
  });

  describe('calculateTotalTarget', () => {
    it('sums thresholds across all criteria tuples', () => {
      const tuples: [string, number][] = [
        ['paresan', 5],
        ['coffee_spot', 3],
        ['talyer', 2],
      ];
      expect(calculateTotalTarget(tuples)).toBe(10);
    });

    it('returns 1 as fallback when tuples array is empty', () => {
      expect(calculateTotalTarget([])).toBe(1);
    });
  });

  describe('parseProgressData', () => {
    it('parses stored progress_data objects with tag_id and current', () => {
      const storedProgress = [
        { tag_id: 'paresan', current: 4 },
        { tag_id: 'coffee_spot', current: 1 },
      ];
      const result = parseProgressData(storedProgress);

      expect(result).toEqual([
        { tag_id: 'paresan', current: 4 },
        { tag_id: 'coffee_spot', current: 1 },
      ]);
    });

    it('returns empty array if input is not an array', () => {
      expect(parseProgressData(null)).toEqual([]);
      expect(parseProgressData({})).toEqual([]);
      expect(parseProgressData('invalid')).toEqual([]);
    });

    it('defaults missing tag_id to "*" and missing current to 0', () => {
      const incomplete = [{}];
      const result = parseProgressData(incomplete);

      expect(result).toEqual([{ tag_id: '*', current: 0 }]);
    });
  });
});
