import {
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
      const result = parseCriteriaTuples(criteriaData);

      expect(result).toEqual([
        ['paresan', 5],
        ['coffee_spot', 3],
      ]);
    });

    it('parses total visits milestone criteria with wildcard "*"', () => {
      const criteriaData = [['*', 10]];
      const result = parseCriteriaTuples(criteriaData);

      expect(result).toEqual([['*', 10]]);
    });

    it('handles legacy object format {"tag_id": "paresan", "threshold": 5}', () => {
      const legacyData = { tag_id: 'paresan', threshold: 5 };
      const result = parseCriteriaTuples(legacyData);

      expect(result).toEqual([['paresan', 5]]);
    });

    it('returns empty array when criteriaData is null or undefined', () => {
      expect(parseCriteriaTuples(null)).toEqual([]);
      expect(parseCriteriaTuples(undefined)).toEqual([]);
    });

    it('safely filters out invalid or empty items in tuple array', () => {
      const invalidData = [
        ['paresan', 5],
        ['', 10], // empty tag
        'not-an-array',
        [null, 2],
      ];
      const result = parseCriteriaTuples(invalidData);

      expect(result).toEqual([['paresan', 5]]);
    });

    it('ensures threshold is at least 1', () => {
      const zeroThreshold = [['paresan', 0]];
      const result = parseCriteriaTuples(zeroThreshold);

      expect(result).toEqual([['paresan', 1]]);
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
