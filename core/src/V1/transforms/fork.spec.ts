/**
 * Test basic fork transforms.
 *
 * A 'fork' transform creates a "new" ibgib datum by taking an existing
 * source ibgib record (src), clones it, appends the source to the list
 * of ancestors, and clears the ibgibs past (if any).
 *
 * Sometimes you want a thing to be unique when it is created (forked).
 * When this is done, you give that first address a special name, kinda
 * like the OPPOSITE of a HEAD revision. This is called the temporal
 * junction point (from Back to the Future II), or just tpj. It's like
 * the "name" of the ibgib's timeline.
 *
 * NOTE:
 *   This only tests the node implementation, and manual testing
 *   is required for browser until I get some kind of browser testing
 *   going.
 */
import { expect } from 'chai';
import { IbGib_V1, IbGibRel8ns_V1, Rel8n } from '../types';
import { fork } from './fork';
import { TransformOpts_Fork, IbGibAddr, Ib, TransformResult } from '../../types';
import { pretty, clone, delay, getIbGibAddr } from '../../helper';
import { ROOT, ROOT_ADDR } from '../constants';
import { Factory_V1 } from '../factory';
import { mut8 } from './mut8';

describe(`when forking the root`, async () => {

    const src = ROOT;

    it(`should create a new ibgib`, async () => {
        const { newIbGib } = await fork({ src });
        expect(newIbGib).to.not.be.null;
    });

    it(`should have no rel8ns (because forked from the root)`, async () => {
        const { newIbGib } = await fork({ src });
        expect(newIbGib.rel8ns).to.be.undefined;
    });

    describe(`should respect param`, () => {
        it(`noTimestamp`, async () => {
            const { newIbGib } = await fork({ src, noTimestamp: true });
            if (newIbGib?.data) {
                expect(newIbGib.data!.timestamp).to.be.undefined;
            } else {
                // data being falsy is passing so no expect statement needed
            }
        });

        it(`destIb`, async () => {
            // just an example, ib can be any value/metadata per use case
            // in this example, we have a canonical form tag [tagName]
            // this way, we can just pass around the address (tag like ^ABCD123)
            // and operate on it (the metadata) without having to send the
            // entire data record.
            const destIb = 'tag like';
            const { newIbGib } = await fork({ src, destIb });
            expect(newIbGib.ib).to.equal(destIb);
        });

        it(`dna`, async () => {
            // NOTE: more extensive dna testing is below in other tests
            const destIb = "This will be the new ib";
            const { newIbGib, dnas} = await fork({ src, dna: true, destIb });
            expect(dnas).to.not.be.null;
        });

        it(`uuid`, async () => {
            const { newIbGib } = await fork({ src, uuid: true });
            expect(newIbGib?.data).to.not.be.null;
            expect(newIbGib!.data?.uuid).to.not.be.undefined;
        });

        describe(`tpj...`, () => {
            it(`timestamp`, async () => {
                const { newIbGib } = await fork({ src, tpj: {timestamp: true} });
                expect(newIbGib?.data).to.not.be.null;
                expect(newIbGib!.data?.timestamp).to.not.be.undefined;
                const testDate = new Date(newIbGib!.data!.timestamp);
                expect(testDate).to.not.be.null;
                expect(testDate).to.not.be.undefined;
                expect(testDate.toString()).to.not.equal("Invalid Date");
                // counting on environment (node) to be consistent with invalid dates in the future
                const invalidDate = new Date("asdf");
                expect(invalidDate.toString()).to.equal("Invalid Date");
            });
            it(`uuid`, async () => {
                const { newIbGib } = await fork({ src, tpj: {uuid: true} });
                expect(newIbGib?.data).to.not.be.null;
                expect(newIbGib!.data?.uuid).to.not.be.undefined;
            });
            it(`timestamp && uuid`, async () => {
                const { newIbGib } = await fork({ src, tpj: {timestamp: true, uuid: true} });
                expect(newIbGib?.data).to.not.be.null;
                expect(newIbGib!.data?.timestamp).to.not.be.undefined;
                const testDate = new Date(newIbGib!.data!.timestamp);
                expect(testDate).to.not.be.null;
                expect(testDate).to.not.be.undefined;
                expect(testDate.toString()).to.not.equal("Invalid Date");
                expect(newIbGib!.data?.uuid).to.not.be.undefined;
            });
        });

        it(`cloneRel8ns (setting should be ignored since forking root)`, async () => {
            const { newIbGib } = await fork({ src, cloneRel8ns: true, noTimestamp: true });
            expect(newIbGib?.rel8ns).to.be.undefined;
        });

        it(`cloneData (setting should be ignored since forking root)`, async () => {
            const { newIbGib } = await fork({ src, cloneData: true, noTimestamp: true });
            expect(newIbGib?.data).to.be.undefined;
        });
    });

    describe(`...and creating dna`, () => {
        describe(`should have well-formed dna, like...`, async () => {
            const destIb = "This will be the new ib";
            const { newIbGib, dnas } = await fork({ src, dna: true, destIb });
            const forkDna = dnas![0];

            it(`ib should be fork`, () => {
                expect(forkDna.ib).to.equal('fork');
            });
            it(`should descend from fork^gib primitive`, () => {
                expect(forkDna?.rel8ns).to.not.be.null;
                const forkDnaRel8ns: IbGibRel8ns_V1 = forkDna?.rel8ns!;
                expect(forkDnaRel8ns.ancestor).to.not.be.null;
                expect(forkDnaRel8ns.ancestor!.length).to.equal(1);
                expect(forkDnaRel8ns.ancestor![0]).to.equal('fork^gib');
            });

            const forkDnaData: TransformOpts_Fork<IbGib_V1> = forkDna.data!;

            it(`should have well-formed common transform opts`, () => {
                expect(forkDna.data).to.not.be.null;
                expect(forkDnaData.dna).to.be.true;
                expect(forkDnaData.srcAddr).to.equal(ROOT_ADDR);
                expect(forkDnaData.src).to.be.undefined;
            });

            it(`should have well-formed data specific to fork transform`, () => {
                expect(forkDnaData.type).to.equal("fork");
                expect(forkDnaData.destIb).to.equal(destIb);
            });

            it(`should produce pure dna function, and non-unique dna (without timestamps, tpj, or uuid) (1s delay)`, async () => {
                // we're going to do another fork with the same options gotten from the dna
                // (kinda like translating a foreign language translation back into the
                // original language and making sure it says the same thing)
                // we should produce an entirely new ibGib, because the first newIbGib was timestamped.
                // but the dna "produced" (recreated) should be exactly the same as our initial dna.

                // timestamp should be different (at least 1 second) making newIbGib2 unique
                await delay(1100);

                // NOTE: we're getting the new fork args from the **generated dna**, NOT from our initial
                // fork args. This ensures that we're saving all of the required data in the dna record.
                const forkOpts2: TransformOpts_Fork<IbGib_V1> = clone(forkDnaData);
                forkOpts2.src = ROOT;
                const { newIbGib: newIbGib2, dnas: dnas2 } = await fork(forkOpts2);
                expect(newIbGib2).to.not.be.null;
                expect(dnas2).to.not.be.null;
                const forkDna2 = dnas2![0];

                // dna itself should be exactly the same
                expect(forkDna2).to.deep.equal(forkDna);

                // the ibGibs **created** should NOT be the same because of timestamping
                // (and later on, other factors would change like identity and other rel8ns)
                expect(newIbGib2.gib).to.not.equal(newIbGib.gib);

            });
        });
    }); // dna

});


    // await delay(500);

describe(`when forking a regular ibgib`, () => {

    let src: IbGib_V1;
    let srcAddr: IbGibAddr;

    beforeEach(async () => {
        // This will be the src we're working off of.
        const beforeResult = await fork({ src: ROOT, uuid: true });
        src = beforeResult.newIbGib;

        expect(src).to.not.be.null;
    });

    it(`should create a new ibgib`, async () => {
        const { newIbGib } = await fork({ src });
        expect(newIbGib).to.not.be.null;
    });

    it(`should have src ib^gib address in ancestor rel8n`, async () => {
        const { newIbGib } = await fork({ src });
        expect(newIbGib?.rel8ns).to.not.be.null;
        expect(newIbGib?.rel8ns).to.not.be.undefined;
        expect(newIbGib?.rel8ns!.ancestor).to.not.be.null;
        expect(newIbGib?.rel8ns!.ancestor).to.not.be.undefined;
        expect(newIbGib?.rel8ns!.ancestor!.length).to.equal(1);
        srcAddr = getIbGibAddr({ibGib: src});
        expect(newIbGib?.rel8ns!.ancestor![0]).to.equal(srcAddr);
    });

    // TODO: TEST FORK cloneRel8ns option ONCE REL8 IS IMPLEMENTED
    // it(`cloneRel8ns`, async () => {
    //     const testData = {x: 1, y: 2, deeper: { zzz: 333 }};
    //     const { newIbGib: grandparent } = await fork({ src, cloneData: true});
    //     const { newIbGib: parent } = await mut8({ src: grandparent, dataToAddOrPatch: testData });
    //     const { newIbGib } = await fork({ src: parent, cloneData: true});

    //     expect(newIbGib).to.not.be.null;
    //     expect(newIbGib!.rel8ns).to.not.be.null;
    //     expect(newIbGib!.rel8ns).to.not.be.undefined;
    //     expect(newIbGib!.rel8ns!.ancestor).to.not.be.null;
    //     expect(newIbGib!.rel8ns!.ancestor).to.not.be.undefined;
    //     const parentAddr = getIbGibAddr({ibGib: parent});
    //     expect(newIbGib!.rel8ns!.ancestor![newIbGib!.rel8ns!.ancestor!.length-1]).to.equal(parentAddr);
    //     expect(newIbGib!.data).to.not.be.undefined;
    //     expect(newIbGib!.data).to.deep.equal(testData);
    // });

    it(`cloneData`, async () => {
        // adding uuid/timestamp for testing hack
        // need to reconsider inability to rename/remove timestamp data
        // seems silly since bad actors can always do this and security is
        // really through other means.
        const testData = {x: 1, y: 2, deeper: { zzz: 333 }, uuid: 'tbd', timestamp: 'tbd'};
        const { newIbGib: grandparent } = await fork({ src, cloneData: true, noTimestamp: true });
        testData.uuid = grandparent.data!.uuid;
        testData.timestamp = grandparent.data!.timestamp;
        const { newIbGib: parent } =
            await mut8({
                src: grandparent,
                dataToAddOrPatch: testData,
                noTimestamp: true
            });
        const { newIbGib } = await fork({ src: parent, cloneData: true, noTimestamp: true });

        expect(newIbGib).to.not.be.null;
        expect(newIbGib!.rel8ns).to.not.be.null;
        expect(newIbGib!.rel8ns).to.not.be.undefined;
        expect(newIbGib!.rel8ns!.ancestor).to.not.be.null;
        expect(newIbGib!.rel8ns!.ancestor).to.not.be.undefined;
        const parentAddr = getIbGibAddr({ibGib: parent});
        expect(newIbGib!.rel8ns!.ancestor![newIbGib!.rel8ns!.ancestor!.length-1]).to.equal(parentAddr);
        expect(newIbGib!.data).to.not.be.undefined;
        expect(newIbGib!.data).to.deep.equal(testData);
    });

    // it(`should clone data`, async () => {
    // });
});

describe(`when forking a multiple regular ibgibs, NON LINKED REL8NS`, () => {

    const ibs: Ib[] = ["a", "b", "c", "d"];
    let srcForks: { [ib: string]: TransformResult<IbGib_V1> } = {};
    let srcIbGibs: { [ib: string]: IbGib_V1 } = {};

    beforeEach(async () => {
        // These will be the srcs we're working off of.
        // a forked from root, b forked from a, etc.
        let prevIbGib: IbGib_V1 | undefined;
        for (let ib of ibs) {
            const forkResult = await fork({ src: prevIbGib || ROOT, destIb: ib });
            srcForks[ib] = forkResult;
            srcIbGibs[ib] = forkResult.newIbGib;
            prevIbGib = forkResult.newIbGib;
        }
    });
    afterEach(() => {
        srcForks = {};
        srcIbGibs = {};
    })

    it(`should create a new ibgib`, async () => {
        ibs.forEach(ib => {
            const ibGib = srcIbGibs[ib];
            expect(ibGib).not.to.be.null;
            expect(ibGib).not.to.be.undefined;
            expect(ibGib.ib).to.equal(ib);
        })
    });

    it(`should have src ib^gib (address) in ancestor rel8n`, async () => {
        const getPrev: (ib: Ib) => IbGib_V1 | null = (ib) => {
            switch (ib) {
                case "a": return null;
                case "b": return srcIbGibs.a;
                case "c": return srcIbGibs.b;
                case "d": return srcIbGibs.c;
                default: throw new Error("unknown ib")
            }
        };
        // the first one forks from the root, so the rel8ns should be undefined which is tested elsewhere
        ibs.filter(ib => ib !== "a").forEach(ib => {
            const newIbGib = srcIbGibs[ib]!;
            const prevIbGib = getPrev(ib)!;
            expect(newIbGib?.rel8ns).to.not.be.null;
            expect(newIbGib?.rel8ns).to.not.be.undefined;
            expect(newIbGib?.rel8ns!.ancestor).to.not.be.null;
            expect(newIbGib?.rel8ns!.ancestor).to.not.be.undefined;
            expect(newIbGib?.rel8ns!.ancestor!.length).to.be.greaterThan(0);
            const prevIbGibAddr = getIbGibAddr({ibGib: prevIbGib});
            expect(newIbGib?.rel8ns!.ancestor![newIbGib!.rel8ns!.ancestor!.length-1]).to.equal(prevIbGibAddr);
        })
    });

    // TODO: need to implement mut8 before the clone data can be tested
    // it(`should clone data`, async () => {
    //     throw new Error('not implemented yet');
    //     const testData = { yo: "there" }
    //     const { newIbGib } = await fork({ src });
    //     expect(newIbGib?.rel8ns).to.not.be.null;
    //     expect(newIbGib?.rel8ns).to.not.be.undefined;
    //     expect(newIbGib?.rel8ns!.ancestor).to.not.be.null;
    //     expect(newIbGib?.rel8ns!.ancestor).to.not.be.undefined;
    //     expect(newIbGib?.rel8ns!.ancestor!.length).to.equal(1);
    //     srcAddr = getIbGibAddr({ibGib: src});
    //     expect(newIbGib?.rel8ns!.ancestor![0]).to.equal(srcAddr);
    // });
});

describe(`when forking a multiple regular ibgibs, YES LINKED REL8NS opt`, () => {

    const ibs: Ib[] = ["a", "b", "c", "d"];
    let srcForks: { [ib: string]: TransformResult<IbGib_V1> } = {};
    let srcIbGibs: { [ib: string]: IbGib_V1 } = {};

    beforeEach(async () => {
        // These will be the srcs we're working off of.
        // a forked from root, b forked from a, etc.
        let prevIbGib: IbGib_V1 | undefined;
        for (let ib of ibs) {
            const forkResult = await fork({
                src: prevIbGib || ROOT,
                destIb: ib,
                linkedRel8ns: [Rel8n.ancestor],
            });
            srcForks[ib] = forkResult;
            srcIbGibs[ib] = forkResult.newIbGib;
            prevIbGib = forkResult.newIbGib;
        }
    });
    afterEach(() => {
        srcForks = {};
        srcIbGibs = {};
    })

    it(`should create a new ibgib`, async () => {
        ibs.forEach(ib => {
            const ibGib = srcIbGibs[ib];
            expect(ibGib).not.to.be.null;
            expect(ibGib).not.to.be.undefined;
            expect(ibGib.ib).to.equal(ib);
        })
    });

    it(`should have src ib^gib (address) in ancestor rel8n`, async () => {
        const getPrev: (ib: Ib) => IbGib_V1 | null = (ib) => {
            switch (ib) {
                case "a": return null;
                case "b": return srcIbGibs.a;
                case "c": return srcIbGibs.b;
                case "d": return srcIbGibs.c;
                default: throw new Error("unknown ib")
            }
        };
        // the first one forks from the root, so the rel8ns should be undefined which is tested elsewhere
        ibs.filter(ib => ib !== "a").forEach(ib => {
            const newIbGib = srcIbGibs[ib]!;
            const prevIbGib = getPrev(ib)!;
            expect(newIbGib?.rel8ns).to.not.be.null;
            expect(newIbGib?.rel8ns).to.not.be.undefined;
            expect(newIbGib?.rel8ns!.ancestor).to.not.be.null;
            expect(newIbGib?.rel8ns!.ancestor).to.not.be.undefined;
            expect(newIbGib?.rel8ns!.ancestor!.length).to.equal(1);
            const prevIbGibAddr = getIbGibAddr({ibGib: prevIbGib});
            expect(newIbGib?.rel8ns!.ancestor![0]).to.equal(prevIbGibAddr);
        })
    });

    // TODO: need to implement mut8 before the clone data can be tested
    // it(`should clone data`, async () => {
    //     throw new Error('not implemented yet');
    //     const testData = { yo: "there" }
    //     const { newIbGib } = await fork({ src });
    //     expect(newIbGib?.rel8ns).to.not.be.null;
    //     expect(newIbGib?.rel8ns).to.not.be.undefined;
    //     expect(newIbGib?.rel8ns!.ancestor).to.not.be.null;
    //     expect(newIbGib?.rel8ns!.ancestor).to.not.be.undefined;
    //     expect(newIbGib?.rel8ns!.ancestor!.length).to.equal(1);
    //     srcAddr = getIbGibAddr({ibGib: src});
    //     expect(newIbGib?.rel8ns!.ancestor![0]).to.equal(srcAddr);
    // });
});