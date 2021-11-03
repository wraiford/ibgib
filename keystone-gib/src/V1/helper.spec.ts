/**
 * Test helper functions.
 */

import { expect } from 'chai';
import { generateExpirationString } from './helper';
import { ExpirationInfo } from './types';

const SOME_STRING = "This is some stringy stuff...";
const SOME_STRING_HASH = "5DC14EA1027B956AD6BA51F11372DF823FCF3429B5F2063F1DDA358E0F4F2992";
const SOME_OTHER_STRING = "This is quite a different string of stuff.";

describe(`generateExpirationString`, () => {

    it(`should generate a UTC string`, async () => {
        const TEST_EXPIRATIONS: ExpirationInfo[] = [
            {ms: 60000},
            {seconds: 60},
            {minutes: 1},
            {hours: 1},
            {days: 1},
            {weeks: 1},
            {months: 1},
            {years: 1},
            {seconds: 1, minutes: 1, days: 1, hours: 1},
        ];

        // console.log('now: ' + (new Date(Date.now())).toUTCString());
        for (let exp of TEST_EXPIRATIONS) {
            const strExp = generateExpirationString(exp);
            expect(strExp).to.not.be.null;
            expect(strExp).to.not.be.undefined;

            const date = new Date(strExp);
            // console.log(`${JSON.stringify(exp)} test date string: ${date.toUTCString()}`);
            expect(date).to.not.be.null;
            expect(date).to.not.be.undefined;
            expect(date).to.not.equal('Invalid Date');
        }
    });
});