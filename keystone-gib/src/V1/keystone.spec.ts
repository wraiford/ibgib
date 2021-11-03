/**
 * Test keystone functionality.
 *
 * ## Notes
 *   * sometimes, a fake "gib" will be created, but in real code this will always be the hash of the `ib`, `data` and `rel8ns` fields of the ibgib datum.
 */

import { expect } from 'chai';
import { ChallengesConfig_Hash, KeystoneScopeBase } from './types';
import { getUUID, hash, pretty } from 'ts-gib/dist/helper';
import { Gib } from 'ts-gib/dist/types';
import {
    getKeystoneScope, getKeystoneIb,
    getKeystoneInfoFromIb, generateNewKeystone, getKeystoneIbScopeString, generateNewKeystone_Hash, generateKeystoneConfig
} from './keystone';
import { KEYSTONE_SCOPE_DELIMITER, UNDEFINED_TJP, MAX_KEYSTONE_IB_ADDL_METADATA, MAX_LENGTH_KEYSTONE_IB, MIN_LENGTH_KEYSTONE_IB, KEYSTONE_IB_DELIMITER } from './constants';
import { IBGIB_DELIMITER } from 'ts-gib/dist/V1/constants';

const SOME_LONG_STRING_NO_SPACES = 'wiuefhiowehfiuwehfiuwehfiuwehfiewuhfweiuhfweiufhweiufhweifuhwefiuhwefiuwehfiuwehfiweufhweiufhweiufhweifuherygerufygeuyweiufhweiufhweiufhweiufhwieufhiwuehfiuwehfwieugyuergvyuerwgvyuewgfiuwehfuh';
const SOME_STRING_WITH_SPACES = 'asdlfkj lsdkjf sldkjf';
const SOME_CHALLENGES_CONFIG: ChallengesConfig_Hash = {
    type: 'hash',
    poolSize: 10,
    minChallengesRequired: 1,
    maxChallengesRequired: 1,
    minChallengeSaltSize: 32,
    maxChallengeSaltSize: 32,
    // suggestedChallengeSecretMethod: {
    //     hashIterations: 5,
    //     notes: 'just some notes here',
    // }
};

const SOME_SECRET_A = '12345';

/**
 * Example subscopes for keystone scopes. These could be either/both
 * data and/or rel8n path subscopes.
 */
const SOME_SUBSCOPES = [ 'name', 'address', 'past', 'ancestor', ];

const ALL_KEYSTONE_SCOPE_BASES = Object.keys(KeystoneScopeBase).map(x => KeystoneScopeBase[x]);


describe(`getKeystoneScope`, () => {

    it(`should get scope, no subscopes`, async() => {
        for (let base of ALL_KEYSTONE_SCOPE_BASES) {
            let scope = getKeystoneScope({base});
            expect(scope).to.not.be.null;
            expect(scope).to.not.be.undefined;
            expect(scope).to.equal(base);
        }
    });

    it(`should get scope + 1 subscope`, async() => {
        for (let base of ALL_KEYSTONE_SCOPE_BASES) {
        for (let subScope of SOME_SUBSCOPES) {
            let scope = getKeystoneScope({base, subscopes: [subScope]});
            expect(scope).to.not.be.null;
            expect(scope).to.not.be.undefined;
            expect(scope).to.equal(`${base}${KEYSTONE_SCOPE_DELIMITER}${subScope}`);
        } }
    });

    it(`should get scope + all subscopes`, async() => {
        for (let base of ALL_KEYSTONE_SCOPE_BASES) {
            let scope = getKeystoneScope({base, subscopes: SOME_SUBSCOPES});
            expect(scope).to.not.be.null;
            expect(scope).to.not.be.undefined;
            console.error(`scope: ${scope}`);
            let scopeAndSubscopes = scope.split(KEYSTONE_SCOPE_DELIMITER);
            expect(scopeAndSubscopes).to.include(base);
            SOME_SUBSCOPES.forEach(sub => { expect(scopeAndSubscopes).to.include(sub); });
        }
    });

    describe(`with invalid arg`, async () => {
    describe(`should throw if`, async () => {
        it(`base contains invalid characters`, async() => {
            try {
                getKeystoneScope({
                    base: <any>`any${KEYSTONE_IB_DELIMITER}`,
                });
                throw new Error(`didn't throw`);
            } catch (error) {
                expect(error.message).to.include('invalid base');
                expect(error.message).to.include('KEYSTONE_IB_DELIMITER');
            }
            try {
                getKeystoneScope({
                    base: <any>`any${KEYSTONE_SCOPE_DELIMITER}`,
                });
                throw new Error(`didn't throw`);
            } catch (error) {
                expect(error.message).to.include('invalid base');
                expect(error.message).to.include('KEYSTONE_SCOPE_DELIMITER');
            }
        });
        it(`base is not in go-list`, async() => {
            try {
                getKeystoneScope({
                    base: <any>`someBase`,
                });
                throw new Error(`didn't throw`);
            } catch (error) {
                expect(error.message).to.include('invalid base');
                expect(error.message).to.include('go-list');
            }
        });
        it(`subscope contains invalid characters or is falsy `, async() => {
            const subscope1 = 'data/name';
            const subscope2 = 'data/age';
            const invalidSubscopes = [
                {invalid: `oops${KEYSTONE_IB_DELIMITER}`, errorMsgContains: 'KEYSTONE_IB_DELIMITER'},
                {invalid: `oops${KEYSTONE_SCOPE_DELIMITER}`, errorMsgContains: 'KEYSTONE_SCOPE_DELIMITER'},
                {invalid: null, errorMsgContains: 'null'},
                {invalid: undefined, errorMsgContains: 'undefined'},
                {invalid: '', errorMsgContains: 'empty string'},
            ];
            for (let x of invalidSubscopes) {
                try {
                    getKeystoneScope({
                        base: 'any',
                        subscopes: [subscope1, subscope2, <any>x.invalid]
                    });
                    throw new Error(`didn't throw`);
                } catch (error) {
                    expect(error.message).to.include('invalid subscope');
                    expect(error.message).to.include(x.errorMsgContains);
                }
            }
        });
    });
    });

});

describe(`getKeystoneIb`, () => {
    it(`should create space-delimited ib, scope, no subscope, metadata or keystone tjp gib`, async () => {
        for (let base of ALL_KEYSTONE_SCOPE_BASES) {
            let scope = getKeystoneScope({base});
            let keystoneTjpGib = UNDEFINED_TJP;
            let keystoneIb = getKeystoneIb({scope});
            expect(keystoneIb).to.not.be.null;
            expect(keystoneIb).to.not.be.undefined;
            expect(keystoneIb).to.equal(`keystone ${scope} ${keystoneTjpGib}`);
        }
    });
    it(`should create space-delimited ib, scope + subscope, no metadata or keystone tjp gib`, async () => {
        for (let base of ALL_KEYSTONE_SCOPE_BASES) {
        for (let subScope of SOME_SUBSCOPES) {
            let scope = getKeystoneScope({base, subscopes: [subScope]});

            // not sure if I need a real tjp gib here for testing...
            let keystoneTjpGib = UNDEFINED_TJP;
            let keystoneIb = getKeystoneIb({scope});
            expect(keystoneIb).to.not.be.null;
            expect(keystoneIb).to.not.be.undefined;
            expect(keystoneIb).to.equal(`keystone ${scope} ${keystoneTjpGib}`);
        } }
    });
    it(`should create space-delimited ib, scope + subscope + keystone tjp gib, no metadata`, async () => {
        for (let base of ALL_KEYSTONE_SCOPE_BASES) {
        for (let subScope of SOME_SUBSCOPES) {
            let scope = getKeystoneScope({base, subscopes: [subScope]});

            // not sure if I need a real tjp gib here for testing...
            let keystoneTjpGib = await hash({s: 'some string'});
            let keystoneIb = getKeystoneIb({scope, keystoneTjpGib});
            expect(keystoneIb).to.not.be.null;
            expect(keystoneIb).to.not.be.undefined;
            expect(keystoneIb).to.equal(`keystone ${scope} ${keystoneTjpGib}`);
        } }
    });
    it(`should create space-delimited ib, scope + subscope + keystone tjp gib + metadata`, async () => {
        for (let base of ALL_KEYSTONE_SCOPE_BASES) {
        for (let subScope of SOME_SUBSCOPES) {
            let scope = getKeystoneScope({base, subscopes: [subScope]});

            // not sure if I need a real tjp gib here for testing...
            let keystoneTjpGib = await hash({s: 'some string'});
            let addlMetadata = 'someOtherGibWhateverStandard=DEF789&OtherQueryParamOrWhatever=1';
            let keystoneIb = getKeystoneIb({scope, keystoneTjpGib, addlMetadata});
            expect(keystoneIb).to.not.be.null;
            expect(keystoneIb).to.not.be.undefined;
            expect(keystoneIb).to.equal(`keystone ${scope} ${keystoneTjpGib} ${addlMetadata}`);
        } }
    });

    describe(`with invalid arg`, async () => {
    describe(`should throw if`, async () => {
        it(`scope contains invalid characters`, async() => {
            try {
                getKeystoneIb({
                    scope: <any>`any${IBGIB_DELIMITER}`,
                });
                throw new Error(`didn't throw`);
            } catch (error) {
                expect(error.message).to.include('invalid scope');
                expect(error.message).to.include('IBGIB_DELIMITER');
            }
            try {
                getKeystoneIb({
                    scope: <any>`any${KEYSTONE_IB_DELIMITER}`,
                });
                throw new Error(`didn't throw`);
            } catch (error) {
                expect(error.message).to.include('invalid scope');
                expect(error.message).to.include('KEYSTONE_IB_DELIMITER');
            }
        });
        it(`keystoneTjpGib contains invalid characters`, async() => {
            try {
                getKeystoneIb({
                    scope: 'any',
                    keystoneTjpGib: `abc123hash${IBGIB_DELIMITER}`,
                });
                throw new Error(`didn't throw`);
            } catch (error) {
                expect(error.message).to.include('invalid keystoneTjpGib');
                expect(error.message).to.include('IBGIB_DELIMITER');
            }
            try {
                getKeystoneIb({
                    scope: 'any',
                    keystoneTjpGib: `abc123hash${KEYSTONE_IB_DELIMITER}`,
                });
                throw new Error(`didn't throw`);
            } catch (error) {
                expect(error.message).to.include('invalid keystoneTjpGib');
                expect(error.message).to.include('KEYSTONE_IB_DELIMITER');
            }
        });
        it(`addlMetadata contains invalid characters`, async() => {
            try {
                getKeystoneIb({
                    scope: 'any',
                    keystoneTjpGib: `abc123hash`,
                    addlMetadata: `key=value&${IBGIB_DELIMITER}`,
                });
                throw new Error(`didn't throw`);
            } catch (error) {
                expect(error.message).to.include('invalid addlMetadata');
                expect(error.message).to.include('IBGIB_DELIMITER');
            }
            try {
                getKeystoneIb({
                    scope: 'any',
                    keystoneTjpGib: `abc123hash`,
                    addlMetadata: `key=value&${KEYSTONE_IB_DELIMITER}`,
                });
                throw new Error(`didn't throw`);
            } catch (error) {
                expect(error.message).to.include('invalid addlMetadata');
                expect(error.message).to.include('KEYSTONE_IB_DELIMITER');
            }
        });
    });
    });
});

describe(`generateNewKeystone`, () => {
    it(`should create without exception`, async () => {
        let resKeystone = await generateNewKeystone({
            keySecret: SOME_SECRET_A,
            challengesConfig: SOME_CHALLENGES_CONFIG,
            scope: 'any',
            type: 'hash',
            expiration: { minutes: 1, },
        });

        expect(resKeystone).to.not.be.null;
        expect(resKeystone).to.not.be.undefined;

        // console.log(pretty(resKeystone));
    });

    describe(`with invalid arg`, async () => {
    describe(`should throw if`, async () => {

        it(`args is falsy`, async () => {
            try {
                let resKeystone = await generateNewKeystone(<any>null);
                throw new Error('did NOT throw expected error.');
            } catch (error) {
                expect(error.message).to.include('args required');
            }
        });

        it(`args.type isn't hash`, async () => {
            try {
                let resKeystone = await generateNewKeystone({
                    keySecret: SOME_SECRET_A,
                    challengesConfig: SOME_CHALLENGES_CONFIG,
                    scope: 'any',
                    type: <any>'not supported type here',
                    expiration: { minutes: 1, },
                });
                throw new Error('did NOT throw expected error.');
            } catch (error) {
                expect(error.message).to.include('invalid args.type');
                expect(error.message).to.include(`only type 'hash' implemented`);
            }
        });

    });
    });
});

describe(`generateNewKeystone_Hash`, () => {

    describe(`with invalid arg`, async () => {
    describe(`should throw if`, async () => {

        it(`type isn't hash`, async () => {
            try {
                let resKeystone = await generateNewKeystone_Hash({
                    keySecret: SOME_SECRET_A,
                    challengesConfig: SOME_CHALLENGES_CONFIG,
                    scope: 'any',
                    type: <any>`not supported type here, i.e. ain't "hash"`,
                    expiration: { minutes: 1, },
                });
                throw new Error('did NOT throw expected error.');
            } catch (error) {
                expect(error.message).to.include('invalid type');
                expect(error.message).to.include(`only hash in v1`);
            }
        });

        it(`keySecret is falsy`, async () => {
            try {
                let resKeystone = await generateNewKeystone_Hash({
                    keySecret: <any>null,
                    challengesConfig: SOME_CHALLENGES_CONFIG,
                    scope: 'any',
                    type: 'hash',
                    expiration: { minutes: 1, },
                });
                throw new Error('did NOT throw expected error.');
            } catch (error) {
                expect(error.message).to.include('keySecret required');
            }
        });

        it(`challengesConfig is falsy`, async () => {
            try {
                let resKeystone = await generateNewKeystone({
                    keySecret: SOME_SECRET_A,
                    challengesConfig: <any>null,
                    scope: 'any',
                    type: 'hash',
                    expiration: { minutes: 1, },
                });
                throw new Error('did NOT throw expected error.');
            } catch (error) {
                expect(error.message).to.include('challengesConfig required');
            }
        });

        it(`addlMetadata is too long`, async () => {
            try {
                let resKeystone = await generateNewKeystone({
                    keySecret: SOME_SECRET_A,
                    challengesConfig: SOME_CHALLENGES_CONFIG,
                    scope: 'any',
                    type: 'hash',
                    expiration: { minutes: 1, },
                    addlMetadata: SOME_LONG_STRING_NO_SPACES.substring(0, MAX_KEYSTONE_IB_ADDL_METADATA + 1),
                });
                throw new Error('did NOT throw expected error.');
            } catch (error) {
                expect(error.message).to.include('invalid addlMetadata');
                expect(error.message).to.include('too long.');
            }
        });

        it(`addlMetadata has a space`, async () => {
            try {
                let resKeystone = await generateNewKeystone({
                    keySecret: SOME_SECRET_A,
                    challengesConfig: SOME_CHALLENGES_CONFIG,
                    scope: 'any',
                    type: 'hash',
                    expiration: { minutes: 1, },
                    addlMetadata: SOME_STRING_WITH_SPACES,
                });
                throw new Error('did NOT throw expected error.');
            } catch (error) {
                expect(error.message).to.include('invalid addlMetadata');
                expect(error.message).to.include('cannot include a space');
            }
        });

        it(`expiration.format is not UTC`, async () => {
            try {

                let resKeystone = await generateNewKeystone({
                    keySecret: SOME_SECRET_A,
                    challengesConfig: SOME_CHALLENGES_CONFIG,
                    scope: 'any',
                    type: 'hash',
                    expiration: { minutes: 1, format: <any>'NOT_UTC' },
                });
                throw new Error('did NOT throw expected error.');
            } catch (error) {
                expect(error.message).to.include('invalid expiration.format');
                expect(error.message).to.include('only UTC in v1');
            }
        });

        it(`should have an ib with tjp gib`, async () => {
            let resKeystone = await generateNewKeystone({
                keySecret: SOME_SECRET_A,
                challengesConfig: SOME_CHALLENGES_CONFIG,
                scope: 'any',
                type: 'hash',
                expiration: { minutes: 1, },
            });

            expect(resKeystone).to.not.be.null;
            expect(resKeystone).to.not.be.undefined;

            // console.log(pretty(resKeystone));
        });

    });
    });

});

describe(`generateKeystoneConfig`, () => {

    describe(`with invalid arg`, async () => {
    describe(`should throw if`, async () => {

        it(`challengesConfig is falsy`, async () => {
            try {
                let config = await generateKeystoneConfig({
                    challengesConfig: <any>null,
                });
                throw new Error('did NOT throw expected error.');
            } catch (error) {
                expect(error.message).to.include('challengesConfig required');
            }
        });

        it(`type isn't hash`, async () => {
            try {
                let config = await generateKeystoneConfig({
                    challengesConfig: {
                        type: <any>'not "hash" here',
                        poolSize: 1,
                    }
                });
                throw new Error('did NOT throw expected error.');
            } catch (error) {
                expect(error.message).to.include('invalid type');
                expect(error.message).to.include(`only hash in v1`);
            }
        });

        it(`keystoneSecretMetadata is more than one level deep`, async () => {
            throw new Error("not implemented")
        });

    });
    });

});

describe(`getKeystoneInfoFromIb`, () => {

    it(`should always have valid scope and tjpGib`, async () => {
        const scope = 'any';
        const tjpGib = await hash({s: 'would actually be a hash of ib + data + rel8ns'});
        const keystoneIb = `keystone ${scope} ${tjpGib}`;
        const info = getKeystoneInfoFromIb({keystoneIb});
        expect(info.scope).to.equal(scope);
        expect(info.tjpGib).to.equal(tjpGib);
    });

    it(`should sometimes have valid subscopes`, async () => {
        const scopeBase = 'mut8';
        const subscope1 = 'data/name';
        const subscope2 = 'data/age';
        const scope = `${scopeBase}${KEYSTONE_SCOPE_DELIMITER}${subscope1}${KEYSTONE_SCOPE_DELIMITER}${subscope2}`;
        const tjpGib = await hash({s: 'would actually be a hash of ib + data + rel8ns'});
        const keystoneIb = `keystone ${scope} ${tjpGib}`;
        const info = getKeystoneInfoFromIb({keystoneIb});
        expect(info.scope).to.equal(scope, 'scope');
        expect(info.scopeBase).to.equal(scopeBase, 'scopeBase');
        expect(info.subscopes).to.not.be.undefined;
        expect(info.subscopes).to.not.be.null;
        expect(info.subscopes).to.not.be.empty;
        expect(info.subscopes).to.include(subscope1, 'subscope1');
        expect(info.subscopes).to.include(subscope2, 'subscope2');
        expect(info.tjpGib).to.equal(tjpGib, 'tjpGib');
    });

    it(`should sometimes have valid addlMetadata`, async () => {
        const scopeBase = 'mut8';
        const subscope1 = 'data/name';
        const subscope2 = 'data/age';
        const scope = `${scopeBase}${KEYSTONE_SCOPE_DELIMITER}${subscope1}${KEYSTONE_SCOPE_DELIMITER}${subscope2}`;
        const tjpGib = await hash({s: 'would actually be a hash of ib + data + rel8ns'});
        const addlMetadata = `foo=bar&baz=biz`;
        const keystoneIb = `keystone ${scope} ${tjpGib} ${addlMetadata}`;

        // addlMetadata can be of any form except can't contain
        // KEYSTONE_IB_DELIMITER (space atow)
        // metadata doesn't have to be query string style, but can be.
        const info = getKeystoneInfoFromIb({keystoneIb});
        expect(info.addlMetadata).to.not.be.undefined;
        expect(info.addlMetadata).to.not.be.null;
        expect(info.addlMetadata).to.equal(addlMetadata);
    });

    describe(`with invalid arg`, async () => {
        it(`should throw if empty ib`, async() => {
            try {
                getKeystoneInfoFromIb({keystoneIb: ''});
                throw new Error(`didn't throw`);
            } catch (error) {
                expect(error.message).to.include('keystoneIb required');
            }
        });

        it(`should throw if ib too long`, async() => {
            try {
                getKeystoneInfoFromIb({
                    keystoneIb:
                        [...Array(MAX_LENGTH_KEYSTONE_IB+1)].map(x => 'a').reduce((a,b)=>a+b)
                });
                throw new Error(`didn't throw`);
            } catch (error) {
                expect(error.message).to.include('too long');
            }
        });

        it(`should throw if ib too short`, async() => {
            try {
                getKeystoneInfoFromIb({
                    keystoneIb:
                        [...Array(MIN_LENGTH_KEYSTONE_IB-1)].map(x => 'a').reduce((a,b)=>a+b)
                });
                throw new Error(`didn't throw`);
            } catch (error) {
                expect(error.message).to.include('too short');
            }
        });

        it(`should throw if ib too few pieces`, async() => {
            try {
                getKeystoneInfoFromIb({
                    keystoneIb:
                        'keystone_any_faketjp' // this should be space-delimited
                });
                throw new Error(`didn't throw`);
            } catch (error) {
                expect(error.message).to.include('unknown keystone ib format');
            }
        });
    });
});

describe(`getKeystoneIbScopeString`, () => {
    it(`should return scopeBase if its the only arg`, async () => {
        let scopeBase: KeystoneScopeBase = 'any';
        let scope = getKeystoneIbScopeString({scopeBase});
        expect(scope).to.equal(scopeBase);
    });

    it(`should concat scopeBase, 1 subscope`, async () => {
        let scopeBase: KeystoneScopeBase = 'any';
        let subscope1 = 'data/name';
        let scope = getKeystoneIbScopeString({scopeBase, subscopes: [subscope1]});
        let concatted =
            scopeBase + KEYSTONE_SCOPE_DELIMITER +
            subscope1;
        expect(scope).to.equal(concatted);
    });
    it(`should concat scopeBase, 2 subscopes`, async () => {
        let scopeBase: KeystoneScopeBase = 'any';
        let subscope1 = 'data/name';
        let subscope2 = 'data/dob';
        let scope = getKeystoneIbScopeString({scopeBase, subscopes: [subscope1, subscope2]});
        let concatted =
            scopeBase + KEYSTONE_SCOPE_DELIMITER +
            subscope1 + KEYSTONE_SCOPE_DELIMITER +
            subscope2;
        expect(scope).to.equal(concatted);
    });

    describe(`with invalid arg`, async () => {
        it(`should throw if empty scopeBase`, async() => {
            try {
                getKeystoneIbScopeString({scopeBase: <any>''});
            } catch (error) {
                expect(error.message).to.include('scopeBase required');
            }
        });

        it(`should throw, 1 subscopes, 1 falsy subscope`, async() => {
            for (let falsySubscope of ['', null, undefined]) {
                let scopeBase: KeystoneScopeBase = 'any';
                try {
                    getKeystoneIbScopeString({scopeBase, subscopes: [<any>falsySubscope]});
                } catch (error) {
                    expect(error.message).to.include('invalid subscope: falsy');
                }
            }
        });
        it(`should throw, 2 subscopes, 1 falsy subscope`, async() => {
            for (let falsySubscope of ['', null, undefined]) {
                let scopeBase: KeystoneScopeBase = 'any';
                let subscope1 = 'data';
                try {
                    getKeystoneIbScopeString({scopeBase, subscopes: [<any>falsySubscope, subscope1]});
                } catch (error) {
                    expect(error.message).to.include('invalid subscope: falsy');
                }
            }
        });
        it(`should throw, 3 subscopes, 1 falsy subscope`, async() => {
            for (let falsySubscope of ['', null, undefined]) {
                let scopeBase: KeystoneScopeBase = 'any';
                let subscope1 = 'data/name';
                let subscope2 = 'data/dob';
                // going to test different combinations for falsy subscope...probably overkilll
                try {
                    getKeystoneIbScopeString({scopeBase, subscopes: [
                        <any>falsySubscope, subscope1, subscope2
                    ]});
                } catch (error) {
                    expect(error.message).to.include('invalid subscope: falsy');
                }
                try {
                    getKeystoneIbScopeString({scopeBase, subscopes: [
                        subscope1, <any>falsySubscope, subscope2
                    ]});
                } catch (error) {
                    expect(error.message).to.include('invalid subscope: falsy');
                }
                try {
                    getKeystoneIbScopeString({scopeBase, subscopes: [
                        <any>falsySubscope, subscope2, subscope1
                    ]});
                } catch (error) {
                    expect(error.message).to.include('invalid subscope: falsy');
                }
            }
        });
        it(`should throw, scope includes delim`, async() => {
            let scopeBase: KeystoneScopeBase = <any>`any${KEYSTONE_SCOPE_DELIMITER}`;
            try {
                getKeystoneIbScopeString({scopeBase});
            } catch (error) {
                expect(error.message).to.include('invalid scopeBase');
                expect(error.message).to.include('contains delimiter');
            }
        });
        it(`should throw, subscope includes delim`, async() => {
            for (let subscopeWithDelim of [`any${KEYSTONE_SCOPE_DELIMITER}`, `any${KEYSTONE_SCOPE_DELIMITER}any`, `${KEYSTONE_SCOPE_DELIMITER}any`]) {
                let scopeBase: KeystoneScopeBase = 'any';
                let subscope1 = 'data/name';
                let subscope2 = 'data/dob';
                // going to test different combinations for falsy subscope...probably overkilll
                try {
                    getKeystoneIbScopeString({scopeBase, subscopes: [
                        <any>subscopeWithDelim, subscope1, subscope2
                    ]});
                    throw new Error(`didn't throw`);
                } catch (error) {
                    expect(error.message).to.include('invalid subscope');
                    expect(error.message).to.include('contains delimiter');
                }
                try {
                    getKeystoneIbScopeString({scopeBase, subscopes: [
                        subscope1, <any>subscopeWithDelim, subscope2
                    ]});
                    throw new Error(`didn't throw`);
                } catch (error) {
                    expect(error.message).to.include('invalid subscope');
                    expect(error.message).to.include('contains delimiter');
                }
                try {
                    getKeystoneIbScopeString({scopeBase, subscopes: [
                        <any>subscopeWithDelim, subscope2, subscope1
                    ]});
                    throw new Error(`didn't throw`);
                } catch (error) {
                    expect(error.message).to.include('invalid subscope');
                    expect(error.message).to.include('contains delimiter');
                }
            }
        });
    });
});
