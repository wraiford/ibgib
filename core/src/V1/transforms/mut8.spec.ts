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
import { TransformOpts_Mut8, IbGibAddr } from '../../types';
import { pretty, clone, delay, getIbGibAddr } from '../../helper';
import { ROOT, ROOT_ADDR } from '../constants';
import { fork } from './fork';
import { mut8 } from './mut8';
import { Factory_V1 as factory } from '../factory';

const PRIMITIVE_IBGIBS = [factory.root()].concat(factory.primitives({ibs: [
    'a', '7', 'tag',
    'any string/value that isnt hashed with a gib is a primitive',
    // e.g. 6 -> 6^ -> 6^gib are all equivalent ib^gib addresses,
]}));

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

describe(`can't mut8 primitives (including the root)`, async () => {
    for (const src of PRIMITIVE_IBGIBS) {

        it(`should fail to mut8 ib (ib: ${src.ib})`, async () => {
            let errored = false;
            try {
                const _ignored = await mut8({ src, mut8Ib: 'changed ' + src.ib});
            } catch (error) {
                errored = true;
            }
            expect(errored).to.be.true;
        });

        it(`should fail to mut8 add or patch data (ib: ${src.ib})`, async () => {
            let errored = false;
            try {
                const _ignored = await mut8({ src, dataToAddOrPatch: { a: "aaaaa" }});
            } catch (error) {
                errored = true;
            }
            expect(errored).to.be.true;
        });

        it(`should fail to mut8 rename data (ib: ${src.ib})`, async () => {
            let errored = false;
            try {
                const _ignored = await mut8({ src, dataToRename: { a: "aaaaa" }});
            } catch (error) {
                errored = true;
            }
            expect(errored).to.be.true;
        });

        it(`should fail to mut8 remove data (ib: ${src.ib})`, async () => {
            let errored = false;
            try {
                const _ignored = await mut8({ src, dataToRemove: { a: "aaaaa" }});
            } catch (error) {
                errored = true;
            }
            expect(errored).to.be.true;
        });
    }
});

describe(`when mutating a regular ibgib`, async () => {

    describe(`with simple, 1-level, non-nested data and ib`, () => {
        for (const primitive of PRIMITIVE_IBGIBS) { for (const testData of DATAS_SIMPLE) {
            // console.log(`doing testdata: ${primitive.ib}.data ~ ${pretty(testData)}`);
            it(`should add/rename/patch simple data (${primitive.ib}) and ib`, async () => {

                let { newIbGib: src } = await fork({src: primitive, noTimestamp: true});

                // #region add data

                // we now have a non-primitive source and wish to
                // add some internal data to it.

                let { newIbGib: dataAddedIbGib } = await mut8({src, dataToAddOrPatch: testData, noTimestamp: true});
                let dataAddedAddr: IbGibAddr = getIbGibAddr({ibGib: dataAddedIbGib});
                expect(dataAddedIbGib).to.not.be.null;
                expect(dataAddedIbGib.data).to.not.be.undefined;
                expect(dataAddedIbGib.data).to.not.be.null;
                expect(dataAddedIbGib.data).to.deep.equal(testData);

                // #endregion

                // #region rename

                const newNameForX = "new name for x here";
                const valueForX = dataAddedIbGib.data!.x;
                const dataToRename = { x: newNameForX }

                let { newIbGib: dataRenamedIbGib } =
                    await mut8({src: dataAddedIbGib, dataToRename, noTimestamp: true});
                expect(dataRenamedIbGib).to.not.be.null;
                expect(dataRenamedIbGib.data).to.not.be.undefined;
                expect(dataRenamedIbGib.data).to.not.be.null;

                // the data should have the new key name that we did
                expect(Object.keys(dataRenamedIbGib.data!)).to.include(newNameForX);

                // the data value for that new key name should be the same as before, since we didn't change it
                expect(dataRenamedIbGib.data![newNameForX]).to.equal(valueForX);

                // the most recent past of the dataRenamed ibGib should be the src's (dataAddedIbGib) address
                expect(dataRenamedIbGib.rel8ns!.past![dataRenamedIbGib.rel8ns!.past!.length-1]).to.equal(dataAddedAddr);

                //#endregion

                // #region patch

                const newValueForX = 42;
                const dataToPatch = { x: newValueForX }

                let { newIbGib: dataPatchedIbGib } =
                    await mut8({src: dataAddedIbGib, dataToAddOrPatch: dataToPatch, noTimestamp: true});
                expect(dataPatchedIbGib).to.not.be.null;
                expect(dataPatchedIbGib.data).to.not.be.undefined;
                expect(dataPatchedIbGib.data).to.not.be.null;

                // value should be changed to the new value
                expect(dataPatchedIbGib.data!.x).to.equal(newValueForX);

                // the most recent past of the dataRenamed ibGib should be the src's (dataAddedIbGib) address
                expect(dataPatchedIbGib.rel8ns!.past![dataPatchedIbGib.rel8ns!.past!.length-1]).to.equal(dataAddedAddr);

                //#endregion

                // #region remove

                const dataToRemove = { x: '' }; // just want mapping, value is ignored

                let { newIbGib: dataRemovedIbGib } =
                    await mut8({src: dataAddedIbGib, dataToRemove, noTimestamp: true});
                expect(dataRemovedIbGib).to.not.be.null;
                expect(dataRemovedIbGib.data).to.not.be.undefined;
                expect(dataRemovedIbGib.data).to.not.be.null;

                // the data value for that new key name should be the same as before, since we didn't change it
                expect(dataRemovedIbGib.data!.x).to.be.undefined;

                // the most recent past of the dataRemovedIbGib should be the src's address
                expect(dataRemovedIbGib.rel8ns!.past![dataRemovedIbGib.rel8ns!.past!.length-1]).to.equal(dataAddedAddr);

                //#endregion

                // #region ib

                let { newIbGib: ibMut8dIbGib } =
                    await mut8({src: dataAddedIbGib, mut8Ib: NEW_IB, noTimestamp: true});
                expect(ibMut8dIbGib).to.not.be.null;
                expect(ibMut8dIbGib.ib).to.equal(NEW_IB);

                //#endregion
            });


        }} // double for..of statement
    })

    describe(`...and creating dna`, async () => {
        const { newIbGib: src, dnas: forkDnas } = await fork({ src: ROOT, dna: true });
        // these are used later when reapplying dnas to test pure functionality
        let addDna: IbGib_V1, dataAddedIbGib1: IbGib_V1,
            patchDna: IbGib_V1, dataPatchedIbGib1: IbGib_V1,
            renameDna: IbGib_V1, dataRenamedIbGib1: IbGib_V1,
            removeDna: IbGib_V1, dataRemovedIbGib1: IbGib_V1;

        describe(`should have well-formed dna...`, async () => {

            // #region data added

            const srcAddr = getIbGibAddr({ibGib: src});
            const dataToAdd = DATA_SIMPLE_XY;
            const { newIbGib: dataAddedIbGib, dnas: Mut8AddDnas } =
                await mut8({src, dna: true, dataToAddOrPatch: dataToAdd});
            dataAddedIbGib1 = dataAddedIbGib; // for later testing pure functionality
            const dataAddedAddr = getIbGibAddr({ibGib: dataAddedIbGib});

            let mut8Dna = Mut8AddDnas![0];
            addDna = mut8Dna;

            describe(`when data added mut8 executed`, () => {
                it(`ib should be mut8`, () => {
                    expect(mut8Dna.ib).to.equal('mut8');
                });
                it(`should descend from mut8^gib primitive`, () => {
                    expect(mut8Dna?.rel8ns).to.not.be.null;
                    const mut8DnaRel8ns: IbGibRel8ns_V1 = mut8Dna?.rel8ns!;
                    expect(mut8DnaRel8ns.ancestor).to.not.be.null;
                    expect(mut8DnaRel8ns.ancestor!.length).to.equal(1);
                    expect(mut8DnaRel8ns.ancestor![0]).to.equal('mut8^gib');
                });

                const mut8DnaData: TransformOpts_Mut8<IbGib_V1> = mut8Dna.data!;

                it(`should have well-formed common transform opts`, () => {
                    expect(mut8DnaData).to.not.be.null;
                    expect(mut8DnaData).to.not.be.undefined;
                    expect(mut8DnaData.dna).to.be.true;
                    expect(mut8DnaData.srcAddr).to.equal(srcAddr);
                    expect(mut8DnaData.src).to.be.undefined;
                });

                it(`should have well-formed data specific to type of mut8`, () => {
                    expect(mut8DnaData.type).to.equal("mut8");
                    expect(mut8DnaData.dataToAddOrPatch).to.deep.equal(dataToAdd);
                });
            })

            // #endregion

            // #region data patched

            const dataToPatch = {z: '3'};
            const { newIbGib: dataPatchedIbGib, dnas: patchedDnas } =
                await mut8({src: dataAddedIbGib, dna: true, dataToAddOrPatch: dataToPatch});
            dataPatchedIbGib1 = dataPatchedIbGib; // for later testing pure functionality

            mut8Dna = patchedDnas![0];
            patchDna = mut8Dna;

            describe(`data patched`, () => {
                it(`ib should be mut8`, () => {
                    expect(mut8Dna.ib).to.equal('mut8');
                });
                it(`should descend from mut8^gib primitive`, () => {
                    expect(mut8Dna?.rel8ns).to.not.be.null;
                    const mut8DnaRel8ns: IbGibRel8ns_V1 = mut8Dna?.rel8ns!;
                    expect(mut8DnaRel8ns.ancestor).to.not.be.null;
                    expect(mut8DnaRel8ns.ancestor!.length).to.equal(1);
                    expect(mut8DnaRel8ns.ancestor![0]).to.equal('mut8^gib');
                });

                const mut8DnaData: TransformOpts_Mut8<IbGib_V1> = mut8Dna.data!;

                it(`should have well-formed common transform opts`, () => {
                    expect(mut8DnaData).to.not.be.null;
                    expect(mut8DnaData).to.not.be.undefined;
                    expect(mut8DnaData.dna).to.be.true;
                    expect(mut8DnaData.srcAddr).to.equal(dataAddedAddr);
                    expect(mut8DnaData.src).to.be.undefined;
                });

                it(`should have well-formed data specific to type of mut8`, () => {
                    expect(mut8DnaData.type).to.equal("mut8");
                    expect(mut8DnaData.dataToAddOrPatch).to.deep.equal(dataToPatch);
                });
            });

            // #endregion

            // #region data renamed

            const dataToRename = {x: RENAMED_KEY};
            const { newIbGib: dataRenamedIbGib, dnas: renamedDnas } =
                await mut8({src: dataAddedIbGib, dna: true, dataToRename});
            dataRenamedIbGib1 = dataRenamedIbGib; // for later testing pure functionality

            mut8Dna = renamedDnas![0];
            renameDna = mut8Dna;

            describe(`data renamed`, () => {
                it(`ib should be mut8`, () => {
                    expect(mut8Dna.ib).to.equal('mut8');
                });
                it(`should descend from mut8^gib primitive`, () => {
                    expect(mut8Dna?.rel8ns).to.not.be.null;
                    const mut8DnaRel8ns: IbGibRel8ns_V1 = mut8Dna?.rel8ns!;
                    expect(mut8DnaRel8ns.ancestor).to.not.be.null;
                    expect(mut8DnaRel8ns.ancestor!.length).to.equal(1);
                    expect(mut8DnaRel8ns.ancestor![0]).to.equal('mut8^gib');
                });

                const mut8DnaData: TransformOpts_Mut8<IbGib_V1> = mut8Dna.data!;

                it(`should have well-formed common transform opts`, () => {
                    expect(mut8DnaData).to.not.be.null;
                    expect(mut8DnaData).to.not.be.undefined;
                    expect(mut8DnaData.dna).to.be.true;
                    expect(mut8DnaData.srcAddr).to.equal(dataAddedAddr);
                    expect(mut8DnaData.src).to.be.undefined;
                });

                it(`should have well-formed data specific to type of mut8`, () => {
                    expect(mut8DnaData.type).to.equal("mut8");
                    expect(mut8DnaData.dataToRename).to.deep.equal(dataToRename);
                });
            });

            // #endregion

            // #region test remove dna

            const dataToRemove = {y: ''}; // value is ignored when removing, just want mapping to key
            const { newIbGib: dataRemovedIbGib, dnas: removedDnas } =
                await mut8({src: dataAddedIbGib, dna: true, dataToRemove});
            dataRemovedIbGib1 = dataRemovedIbGib; // for later testing pure functionality

            mut8Dna = removedDnas![0];
            removeDna = mut8Dna;

            describe(`data removed`, () => {
                it(`ib should be mut8`, () => {
                    expect(mut8Dna.ib).to.equal('mut8');
                });
                it(`should descend from mut8^gib primitive`, () => {
                    expect(mut8Dna?.rel8ns).to.not.be.null;
                    const mut8DnaRel8ns: IbGibRel8ns_V1 = mut8Dna?.rel8ns!;
                    expect(mut8DnaRel8ns.ancestor).to.not.be.null;
                    expect(mut8DnaRel8ns.ancestor!.length).to.equal(1);
                    expect(mut8DnaRel8ns.ancestor![0]).to.equal('mut8^gib');
                });

                const mut8DnaData: TransformOpts_Mut8<IbGib_V1> = mut8Dna.data!;

                it(`should have well-formed common transform opts`, () => {
                    expect(mut8DnaData).to.not.be.null;
                    expect(mut8DnaData).to.not.be.undefined;
                    expect(mut8DnaData.dna).to.be.true;
                    expect(mut8DnaData.srcAddr).to.equal(dataAddedAddr);
                    expect(mut8DnaData.src).to.be.undefined;
                });

                it(`should have well-formed data specific to type of mut8`, () => {
                    expect(mut8DnaData.type).to.equal("mut8");
                    expect(mut8DnaData.dataToRemove).to.deep.equal(dataToRemove);
                });
            });

            // #endregion

            // #region pure dna functionality (placed here for code reuse, but slightly icky)

            // we're going to repeat our transforms but using the dnas generated in the previous steps.
            // (kinda like translating a foreign language translation back into the
            // original language and making sure it says the same thing)
            // we should produce an entirely new ibGib, because the first newIbGib was timestamped.
            // but the dna "produced" (recreated) should be exactly the same as our initial dna.

            // timestamp should be different (at least 1 second) making newIbGib2 unique

            // these are the vars from above.
            // let addDna: IbGib_V1, dataAddedIbGib1: IbGib_V1,
            //     patchedDna: IbGib_V1, dataPatchedIbGib1: IbGib_V1,
            //     renamedDna: IbGib_V1, dataRenamedIbGib1: IbGib_V1,
            //     removedDna: IbGib_V1, dataRemovedIbGib1: IbGib_V1;
            it(`should be pure add mutation (expect delay)`, async () => {
                await delay(500);
                const optsClone: TransformOpts_Mut8<IbGib_V1> = clone(addDna!.data);
                optsClone.src = src;
                const { newIbGib: newIbGib2, dnas: dnas2 } = await mut8(optsClone);
                expect(newIbGib2).to.not.be.null;
                expect(dnas2).to.not.be.null;
                const dna2 = dnas2![0];

                // dna itself should be exactly the same
                expect(dna2).to.deep.equal(addDna);

                // the ibGibs **created** should NOT be the same because of timestamping
                // (and later on, other factors would change like identity and other rel8ns)
                expect(newIbGib2.gib).to.not.equal(dataAddedIbGib1.gib);
            });
            it(`should be pure patch mutation (expect delay)`, async () => {
                await delay(500);
                const optsClone: TransformOpts_Mut8<IbGib_V1> = clone(patchDna!.data);
                optsClone.src = dataAddedIbGib1;
                const { newIbGib: newIbGib2, dnas: dnas2 } = await mut8(optsClone);
                expect(newIbGib2).to.not.be.null;
                expect(dnas2).to.not.be.null;
                const dna2 = dnas2![0];

                // dna itself should be exactly the same
                expect(dna2).to.deep.equal(patchDna);

                // the ibGibs **created** should NOT be the same because of timestamping
                // (and later on, other factors would change like identity and other rel8ns)
                expect(newIbGib2.gib).to.not.equal(dataPatchedIbGib1.gib);
            });
            it(`should be pure rename mutation (expect delay)`, async () => {
                await delay(500);
                const optsClone: TransformOpts_Mut8<IbGib_V1> = clone(renameDna!.data);
                optsClone.src = dataAddedIbGib1;
                const { newIbGib: newIbGib2, dnas: dnas2 } = await mut8(optsClone);
                expect(newIbGib2).to.not.be.null;
                expect(dnas2).to.not.be.null;
                const dna2 = dnas2![0];

                // dna itself should be exactly the same
                expect(dna2).to.deep.equal(renameDna);

                // the ibGibs **created** should NOT be the same because of timestamping
                // (and later on, other factors would change like identity and other rel8ns)
                expect(newIbGib2.gib).to.not.equal(dataRenamedIbGib1.gib);
            });
            it(`should be pure remove mutation (expect delay)`, async () => {
                await delay(500);
                const optsClone: TransformOpts_Mut8<IbGib_V1> = clone(removeDna!.data);
                optsClone.src = dataAddedIbGib1;
                const { newIbGib: newIbGib2, dnas: dnas2 } = await mut8(optsClone);
                expect(newIbGib2).to.not.be.null;
                expect(dnas2).to.not.be.null;
                const dna2 = dnas2![0];

                // dna itself should be exactly the same
                expect(dna2).to.deep.equal(removeDna);

                // the ibGibs **created** should NOT be the same because of timestamping
                // (and later on, other factors would change like identity and other rel8ns)
                expect(newIbGib2.gib).to.not.equal(dataRemovedIbGib1.gib);
            });

            // #endregion
        });

    }); // dna

    describe(`with more complex data`, () => {
        for (const primitive of PRIMITIVE_IBGIBS) {
            it(`should add/rename/patch (${primitive.ib})`, async () => {

                let { newIbGib: src } = await fork({src: primitive, noTimestamp: true});

                // #region add data

                // we now have a non-primitive source and wish to
                // add some internal data to it.

                let { newIbGib: dataAddedIbGib } = await mut8({
                    src,
                    dataToAddOrPatch: DATA_COMPLEX_XY_NESTED,
                    noTimestamp: true
                });
                let dataAddedAddr: IbGibAddr = getIbGibAddr({ibGib: dataAddedIbGib});
                expect(dataAddedIbGib).to.not.be.null;
                expect(dataAddedIbGib.data).to.not.be.undefined;
                expect(dataAddedIbGib.data).to.not.be.null;
                expect(dataAddedIbGib.data).to.deep.equal(DATA_COMPLEX_XY_NESTED);

                // #endregion

                // #region rename

                // since it's freezing already, I suppose today I'll have to code offline...or off stream that is.
                const valueForX = dataAddedIbGib.data!.x;
                const dataToRename = {
                    nested1: { [RENAME_ME_KEY]: RENAMED_KEY }
                };

                let { newIbGib: dataRenamedIbGib } =
                    await mut8({src: dataAddedIbGib, dataToRename, noTimestamp: true});
                // let dataRenamedAddr: IbGibAddr = getIbGibAddr({ibGib: dataRenamedIbGib});
                expect(dataRenamedIbGib).to.not.be.null;
                expect(dataRenamedIbGib.data).to.not.be.undefined;
                expect(dataRenamedIbGib.data).to.not.be.null;

                // the data should have the new key name that we did
                expect(dataRenamedIbGib.data!.nested1).to.not.be.undefined;
                expect(dataRenamedIbGib.data!.nested1![RENAME_ME_KEY]).to.be.undefined;
                expect(dataRenamedIbGib.data!.nested1![RENAMED_KEY]).to.not.be.undefined;

                // the data value for that new key name should be the same as before, since we didn't change it
                expect(dataRenamedIbGib.data!.nested1![RENAMED_KEY]).to.equal(RENAME_VALUE);

                // the most recent past of the dataRenamed ibGib should be the src's (dataAddedIbGib) address
                expect(dataRenamedIbGib.rel8ns!.past![dataRenamedIbGib.rel8ns!.past!.length-1]).to.equal(dataAddedAddr);

                //#endregion

                // #region patch

                const newValueForX = 42;
                const dataToPatch = { xyObj: { x: newValueForX } };

                let { newIbGib: dataPatchedIbGib } =
                    await mut8({src: dataAddedIbGib, dataToAddOrPatch: dataToPatch, noTimestamp: true});
                expect(dataPatchedIbGib).to.not.be.null;
                expect(dataPatchedIbGib.data).to.not.be.undefined;
                expect(dataPatchedIbGib.data).to.not.be.null;
                expect(dataPatchedIbGib.data!.xyObj).to.not.be.undefined;

                // value should be changed to the new value
                expect(dataPatchedIbGib.data!.xyObj!.x).to.equal(newValueForX);

                // the most recent past of the dataRenamed ibGib should be the src's (dataAddedIbGib) address
                expect(dataPatchedIbGib.rel8ns!.past![dataPatchedIbGib.rel8ns!.past!.length-1]).to.equal(dataAddedAddr);

                //#endregion

                // #region remove

                const dataToRemove = { xyObj: { x: '' } }; // just want mapping, value is ignored

                let { newIbGib: dataRemovedIbGib } =
                    await mut8({src: dataAddedIbGib, dataToRemove, noTimestamp: true});
                expect(dataRemovedIbGib).to.not.be.null;
                expect(dataRemovedIbGib.data).to.not.be.undefined;
                expect(dataRemovedIbGib.data).to.not.be.null;

                // the data value for that new key name should be the same as before, since we didn't change it
                expect(dataRemovedIbGib.data!.xyObj).to.not.be.undefined;
                expect(dataRemovedIbGib.data!.xyObj!.x).to.be.undefined;

                // the most recent past of the dataRemovedIbGib should be the src's address
                expect(dataRemovedIbGib.rel8ns!.past![dataRemovedIbGib.rel8ns!.past!.length-1]).to.equal(dataAddedAddr);

                //#endregion
            });
        }
    })

});
