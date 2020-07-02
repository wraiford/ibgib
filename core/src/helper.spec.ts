/**
 * Test helper functions.
 */

import { expect } from 'chai';
import * as h from './helper';

const SOME_STRING = "This is some stringy stuff...";
const SOME_STRING_HASH = "5DC14EA1027B956AD6BA51F11372DF823FCF3429B5F2063F1DDA358E0F4F2992";
const SOME_OTHER_STRING = "This is quite a different string of stuff.";

describe(`when cloning`, () => {

    it(`should copy deep objects`, async () => {
        const objSimple = { a: SOME_STRING };
        const objADeep = {
            levelOne: {
                levelTwo: {
                    buckle: "your shoe",
                    three: "four",
                    objSimple: objSimple,
                }
            }
        };
        const cloneADeep = h.clone(objADeep);
        expect(cloneADeep?.levelOne?.levelTwo?.buckle).to.equal("your shoe");
        expect(cloneADeep?.levelOne?.levelTwo?.three).to.equal("four");
        expect(cloneADeep?.levelOne?.levelTwo?.objSimple).to.deep.equal(objSimple);

        cloneADeep.levelOne.levelTwo.objSimple.a = SOME_OTHER_STRING;

        // original should **still** be the first value
        expect(objSimple.a).to.equal(SOME_STRING);
        // clone should be changed.
        expect(cloneADeep.levelOne.levelTwo.objSimple.a).to.equal(SOME_OTHER_STRING);
    });
});

describe(`when getting timestamp`, () => {
    it(`should get the current date as UTCString`, async () => {
        // implementation detail hmm....
        const timestamp = h.getTimestamp();
        const date = new Date(timestamp);
        const dateAsUTCString = date.toUTCString();
        expect(timestamp).to.equal(dateAsUTCString);
    });
});

describe(`when hashing (helper)`, () => {
    it(`should hash consistently with implicit sha256`, async () => {
        const hash = await h.hash({s: SOME_STRING}) || "";
        expect(hash.toUpperCase()).to.equal(SOME_STRING_HASH);
    });
    it(`should hash consistently with explicit sha256`, async () => {
        const hash = await h.hash({s: SOME_STRING, algorithm: "SHA-256"}) || "";
        expect(hash.toUpperCase()).to.equal(SOME_STRING_HASH);
    });
});

describe(`when generating UUIDs`, () => {
    it(`shouldn't duplicate UUIDs`, async () => {
        const ids: string[] = [];
        for (let i = 0; i < 100; i++) {
            const id = await h.getUUID();
            expect(ids).not.to.contain(id);
            ids.push(id);
        }
    });
});
