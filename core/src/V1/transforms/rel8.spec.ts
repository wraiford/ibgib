/**
 * Test basic mut8 transforms.
 *
 * NOTE:
 *   This only tests the node implementation, and manual testing
 *   is required for browser until I get some kind of browser testing
 *   going.
 */

import { expect } from 'chai';

import { IbGib_V1, IbGibRel8ns_V1, Rel8n } from '../types';
import { TransformOpts_Rel8, IbGibAddr, IbGibRel8ns } from '../../types';
import { pretty, clone, delay, getIbGibAddr } from '../../helper';
import { ROOT, ROOT_ADDR } from '../constants';
import { fork } from './fork';
// import { mut8 } from './mut8';
import { rel8 } from './rel8';
import { Factory_V1 as factory } from '../factory';

const PRIMITIVE_IBGIBS = [
    factory.root(),
    ...factory.primitives({ibs: [
        'a', '7', 'tag',
        'any string/value that isnt hashed with a gib is a primitive',
        // e.g. 6 -> 6^ -> 6^gib are all equivalent ib^gib addresses,
    ]}),
];

const STR = 'string here';
const RENAME_ME_KEY = 'rename me please';
const RENAMED_KEY = 'renamed successfully';
const RENAME_VALUE = 'hey heres a value';
const DATA_SIMPLE_XY = { x: 1, y: 2 };
const DATA_SIMPLE_XY_STR = { x: 1, y: 2, str: STR };
const DATA_COMPLEX_XY_NESTED = {
    xyObj: DATA_SIMPLE_XY,
    nested1: { [RENAME_ME_KEY]: RENAME_VALUE },
};
const NEW_IB = 'new ib here yo';

const DATAS_SIMPLE = [
    DATA_SIMPLE_XY,
    DATA_SIMPLE_XY_STR,
];

const SIMPLE_REL8N_NAMES: string[] = [
    // just some possible example rel8n names
    'child', 'container', 'folder', 'identity', 'tag', 'liked'
];

/**
 * Generates a simple rel8ns to Add/Remove mapping from the given rel8nNames.
 *
 * @param rel8nNames list of rel8nnames that will be mapped to all of the sample test primitives
 *
 * @example
 * For example, if you pass in ['child', 'tag'], then this will build an object
 * from PRIMITIVE_IBGIBS.
 * {
 *   child: ['ib^gib', 'a^gib', '7^gib', 'tag^gib'...],
 *   tag: ['ib^gib', 'a^gib', '7^gib', 'tag^gib'...],
 * }
 */
function buildRel8nsToAddOrRemoveFromPrimitives(rel8nNames: string[]): IbGibRel8ns {
    const result: IbGibRel8ns = {};
    rel8nNames.forEach(rel8nName => {
        result[rel8nName] = PRIMITIVE_IBGIBS.map(x => getIbGibAddr({ibGib: x}));
    });
    return result;
}

describe(`can't rel8 primitives to others`, async () => {
    for (const src of PRIMITIVE_IBGIBS) {

        it(`should fail to add rel8ns`, async () => {
            let errored = false;
            try {
                const rel8nsToAddByAddr = buildRel8nsToAddOrRemoveFromPrimitives(SIMPLE_REL8N_NAMES);
                const _ignored = await rel8({ src, rel8nsToAddByAddr });
            } catch (error) {
                errored = true;
            }
            expect(errored).to.be.true;
        });

        it(`should fail to remove rel8ns`, async () => {
            let errored = false;
            try {
                const rel8nsToRemoveByAddr = buildRel8nsToAddOrRemoveFromPrimitives(SIMPLE_REL8N_NAMES);
                const _ignored = await rel8({ src, rel8nsToRemoveByAddr });
            } catch (error) {
                errored = true;
            }
            expect(errored).to.be.true;
        });

        it(`should fail to add and remove rel8ns`, async () => {
            let errored = false;
            try {
                const rel8nsToAddByAddr =
                    buildRel8nsToAddOrRemoveFromPrimitives(SIMPLE_REL8N_NAMES);
                const rel8nsToRemoveByAddr =
                    buildRel8nsToAddOrRemoveFromPrimitives([SIMPLE_REL8N_NAMES[0]]); // just the first, no real reason
                const _ignored = await rel8({ src, rel8nsToAddByAddr, rel8nsToRemoveByAddr });
            } catch (error) {
                errored = true;
            }
            expect(errored).to.be.true;
        });

    }
});

describe(`when rel8ing a regular ibgib`, async () => {

    describe(`simple rel8ns to 1st gens (from primitives)`, () => {
        for (const primitive of PRIMITIVE_IBGIBS) {

            it(`should add/remove simple rel8ns`, async () => {

                let { newIbGib: src } = await fork({src: primitive, noTimestamp: true});

                // #region add rel8ns

                const rel8nsToAddByAddr = buildRel8nsToAddOrRemoveFromPrimitives(SIMPLE_REL8N_NAMES);

                // we now have a non-primitive 1st gen source and wish to
                // add rel8ns in it pointing to other ibGibs.

                const { newIbGib: rel8nsAddedIbGib } =
                    await rel8({src, rel8nsToAddByAddr, noTimestamp: true});
                expect(rel8nsAddedIbGib).to.not.be.null;
                expect(rel8nsAddedIbGib.rel8ns).to.not.be.undefined;
                expect(rel8nsAddedIbGib.rel8ns).to.not.be.null;
                const rel8nNames_AddedIbGib = Object.keys(rel8nsAddedIbGib.rel8ns!);
                SIMPLE_REL8N_NAMES.forEach(simpleRel8nName => {
                    expect(rel8nNames_AddedIbGib).to.include(simpleRel8nName);
                    const simpleRel8nAddrs = rel8nsAddedIbGib.rel8ns![simpleRel8nName]!;
                    expect(simpleRel8nAddrs).to.not.be.empty;
                    const expectedRel8nAddrs = rel8nsToAddByAddr[simpleRel8nName];
                    expect(expectedRel8nAddrs).to.not.be.empty;
                    expect(simpleRel8nAddrs).to.deep.equal(expectedRel8nAddrs);
                });

                // #endregion

                // #region Remove rel8ns

                const rel8nsToRemoveByAddr: IbGibRel8ns = {};
                SIMPLE_REL8N_NAMES.forEach(x => rel8nsToRemoveByAddr[x] = [
                    ROOT_ADDR, 'tag^gib'
                ]);

                const { newIbGib: rel8nsRemovedIbGib } =
                    await rel8({src: rel8nsAddedIbGib, rel8nsToRemoveByAddr, noTimestamp: true});
                expect(rel8nsRemovedIbGib).to.not.be.null;
                expect(rel8nsRemovedIbGib.rel8ns).to.not.be.undefined;
                expect(rel8nsRemovedIbGib.rel8ns).to.not.be.null;

                SIMPLE_REL8N_NAMES.forEach(simpleRel8nName => {
                    const rel8dAddrs = rel8nsRemovedIbGib.rel8ns![simpleRel8nName]!;
                    expect(rel8dAddrs).to.not.include.any.members([ROOT_ADDR, 'tag^gib']);
                    expect(rel8dAddrs).to.include.all.members(
                        PRIMITIVE_IBGIBS
                            .map(x => getIbGibAddr({ibGib: x}))
                            .filter(addr => addr !== ROOT_ADDR && addr !== 'tag^gib')
                    );
                });

                //#endregion

            });

            /**
              * we're going to perform the same transforms to two different, unique sources.
              * (in this case, differentiated by the ib).
              * for the src1, we're going to execute transforms via the normal calls.
              * then for src2, we'll make the call from the dna generated from the src1 transforms.
              * both should make the same transformations with regards to the rel8ns added/removed.
             */
            it(`should create pure, reproducible dna`, async () => {

                const ib1 = 'ib 1 yo';
                let { newIbGib: src1 } = await fork({src: primitive, noTimestamp: true, destIb: ib1});
                const ib2 = 'ib 2 here';
                let { newIbGib: src2 } = await fork({src: primitive, noTimestamp: true, destIb: ib2});
                const src2Addr = getIbGibAddr({ibGib: src2});

                // #region add rel8ns

                const rel8nsToAddByAddr = buildRel8nsToAddOrRemoveFromPrimitives(SIMPLE_REL8N_NAMES);

                // we now have a non-primitive 1st gen source and wish to
                // add rel8ns in it pointing to other ibGibs.

                const { newIbGib: rel8nsAddedIbGib, dnas: dnasRel8Add } =
                    await rel8({src: src1, rel8nsToAddByAddr, noTimestamp: true, dna: true});
                expect(dnasRel8Add).to.not.be.null;
                expect(dnasRel8Add).to.not.be.undefined;
                // ATOW dna only produces 1
                const rel8DnaAdd = dnasRel8Add![0];
                const rel8DnaDataAdd: TransformOpts_Rel8<IbGib_V1> = clone(rel8DnaAdd.data!);
                const rel8nNames_AddedIbGib = Object.keys(rel8nsAddedIbGib.rel8ns!);
                SIMPLE_REL8N_NAMES.forEach(simpleRel8nName => {
                    expect(rel8nNames_AddedIbGib).to.include(simpleRel8nName);
                    const simpleRel8nAddrs = rel8nsAddedIbGib.rel8ns![simpleRel8nName]!;
                    expect(simpleRel8nAddrs).to.not.be.empty;
                    const expectedRel8nAddrs = rel8nsToAddByAddr[simpleRel8nName];
                    expect(expectedRel8nAddrs).to.not.be.empty;
                    expect(simpleRel8nAddrs).to.deep.equal(expectedRel8nAddrs);
                });

                // rerun the same rel8 call, but get the args from the dna of the
                // previous call. Then check to ensure the same rel8ns were added.

                rel8DnaDataAdd.src = src2;
                rel8DnaDataAdd.srcAddr = src2Addr;
                const { newIbGib: rel8nsAddedIbGib2, dnas: _dnasRel8Add2 } =
                    await rel8(rel8DnaDataAdd);
                const rel8nNames_AddedIbGib2 = Object.keys(rel8nsAddedIbGib2.rel8ns!);
                SIMPLE_REL8N_NAMES.forEach(simpleRel8nName => {
                    expect(rel8nNames_AddedIbGib2).to.include(simpleRel8nName);
                    const simpleRel8nAddrs = rel8nsAddedIbGib2.rel8ns![simpleRel8nName]!;
                    expect(simpleRel8nAddrs).to.not.be.empty;
                    const expectedRel8nAddrs = rel8nsToAddByAddr[simpleRel8nName];
                    expect(expectedRel8nAddrs).to.not.be.empty;
                    expect(simpleRel8nAddrs).to.deep.equal(expectedRel8nAddrs);
                });

                // #endregion

                // #region Remove rel8ns

                const rel8nsToRemoveByAddr: IbGibRel8ns = {};
                SIMPLE_REL8N_NAMES.forEach(x => rel8nsToRemoveByAddr[x] = [
                    ROOT_ADDR, 'tag^gib'
                ]);

                const { newIbGib: rel8nsRemovedIbGib, dnas: dnasRel8Remove } =
                    await rel8({src: rel8nsAddedIbGib, rel8nsToRemoveByAddr, noTimestamp: true, dna: true});
                // ATOW dna only produces 1
                const rel8DnaRemove = dnasRel8Remove![0];
                const rel8DnaDataRemove: TransformOpts_Rel8<IbGib_V1> = clone(rel8DnaRemove.data!);
                const rel8nNames_RemoveIbGib = Object.keys(rel8nsRemovedIbGib.rel8ns!);

                SIMPLE_REL8N_NAMES.forEach(simpleRel8nName => {
                    const rel8dAddrs = rel8nsRemovedIbGib.rel8ns![simpleRel8nName]!;
                    expect(rel8dAddrs).to.not.include.any.members([ROOT_ADDR, 'tag^gib']);
                    expect(rel8dAddrs).to.include.all.members(
                        PRIMITIVE_IBGIBS
                            .map(x => getIbGibAddr({ibGib: x}))
                            .filter(addr => addr !== ROOT_ADDR && addr !== 'tag^gib')
                    );
                });

                // rerun the same (un)rel8 call, but get the args from the dna of the
                // previous call. Then check to see if the same rel8ns were removed.
                // it should remove the same rel8ns.

                rel8DnaDataRemove.src = rel8nsAddedIbGib2;
                rel8DnaDataRemove.srcAddr = undefined;
                const { newIbGib: rel8nsRemovedIbGib2, dnas: _dnasRel8Remove } =
                    await rel8(rel8DnaDataRemove);

                SIMPLE_REL8N_NAMES.forEach(simpleRel8nName => {
                    const rel8dAddrs = rel8nsRemovedIbGib2.rel8ns![simpleRel8nName]!;
                    expect(rel8dAddrs).to.not.include.any.members([ROOT_ADDR, 'tag^gib']);
                    expect(rel8dAddrs).to.include.all.members(
                        PRIMITIVE_IBGIBS
                            .map(x => getIbGibAddr({ibGib: x}))
                            .filter(addr => addr !== ROOT_ADDR && addr !== 'tag^gib')
                    );
                });

                //#endregion

            });
        }
    });

});
