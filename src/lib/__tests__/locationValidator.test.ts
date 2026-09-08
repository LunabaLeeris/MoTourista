import {
    validateCoordinates,
    isValidCoordinates
} from '../locationValidator'

describe('locationValidator', () => {
    describe('validateCoordinates', () => {
        it('accepts valid coordinates within geographic ranges', () => {
            expect(() => validateCoordinates(14.5995, 120.9842)).not.toThrow();
            expect(() => validateCoordinates(0, 0)).not.toThrow();
            expect(() => validateCoordinates(90, 180)).not.toThrow();
            expect(() => validateCoordinates(-90, -180)).not.toThrow();
        });

        it('throws error when latitude is missing or NaN', () => {
            expect(() => validateCoordinates(NaN, 120)).toThrow(
                'Valid latitude between -90 and 90 is required.'
            );
            // @ts-ignore
            expect(() => validateCoordinates(undefined, 120)).toThrow(
                'Valid latitude between -90 and 90 is required.'
            );
            // @ts-ignore
            expect(() => validateCoordinates(null, 120)).toThrow(
                'Valid latitude between -90 and 90 is required.'
            );
        });

        it('throws error when latitude is out of bounds', () => {
            expect(() => validateCoordinates(90.1, 120)).toThrow(
                'Valid latitude between -90 and 90 is required.'
            );
            expect(() => validateCoordinates(-90.1, 120)).toThrow(
                'Valid latitude between -90 and 90 is required.'
            );
        });

        it('throws error when longitude is missing or NaN', () => {
            expect(() => validateCoordinates(14.5, NaN)).toThrow(
                'Valid longitude between -180 and 180 is required.'
            );
            // @ts-ignore
            expect(() => validateCoordinates(14.5, undefined)).toThrow(
                'Valid longitude between -180 and 180 is required.'
            );
            // @ts-ignore
            expect(() => validateCoordinates(14.5, null)).toThrow(
                'Valid longitude between -180 and 180 is required.'
            );
        });

        it('throws error when longitude is out of bounds', () => {
            expect(() => validateCoordinates(14.5, 180.1)).toThrow(
                'Valid longitude between -180 and 180 is required.'
            );
            expect(() => validateCoordinates(14.5, -180.1)).toThrow(
                'Valid longitude between -180 and 180 is required.'
            );
        });
    });

    describe('isValidCoordinates', () => {
        it('returns true for valid coordinates', () => {
            expect(isValidCoordinates(14.5995, 120.9842)).toBe(true);
            expect(isValidCoordinates(0, 0)).toBe(true);
            expect(isValidCoordinates(-90, -180)).toBe(true);
            expect(isValidCoordinates(90, 180)).toBe(true);
        });

        it('returns false for out-of-range or invalid coordinates', () => {
            expect(isValidCoordinates(91, 120)).toBe(false);
            expect(isValidCoordinates(-91, 120)).toBe(false);
            expect(isValidCoordinates(14, 181)).toBe(false);
            expect(isValidCoordinates(14, -181)).toBe(false);
            expect(isValidCoordinates(NaN, 120)).toBe(false);
            expect(isValidCoordinates(14, NaN)).toBe(false);
            expect(isValidCoordinates(null, null)).toBe(false);
            expect(isValidCoordinates(undefined, undefined)).toBe(false);
        });
    });

})
