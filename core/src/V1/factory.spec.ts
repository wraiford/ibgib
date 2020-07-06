
import { expect } from 'chai';
import { IbGib_V1, IbGibRel8ns_V1, Rel8n } from './types';
import { fork } from './transforms/fork';
import { TransformOpts_Fork, IbGibAddr, Ib, TransformResult, IbGibRel8ns } from '../types';
import { pretty, clone, delay, getIbGibAddr } from '../helper';
import { ROOT, ROOT_ADDR } from './constants';
import { Factory_V1 as factory } from './factory';
import { mut8 } from './transforms/mut8';

const PRIMITIVE_IBS: string[] = [
    'a', '7', 'tag',
    'any string/value that isnt hashed with a gib is a primitive',
    // e.g. 6 -> 6^ -> 6^gib are all equivalent ib^gib addresses,
];


const DATA_SIMPLE_XY = { x: 1, y: 2 };

const SIMPLE_REL8N_NAMES: string[] = [
    // just some possible example rel8n names
    'child', 'container', 'folder', 'identity', 'tag', 'liked'
];


describe(`when using factory`, async () => {

    it(`primitives() should make multiple ibgibs`, async () => {
        const primitiveIbGibs = factory.primitives({ibs: PRIMITIVE_IBS});
        expect(primitiveIbGibs).to.not.be.null;
        expect(primitiveIbGibs.length).to.equal(PRIMITIVE_IBS.length);
    });

    describe(`firstGen`, () => {
        it(`should make an ibgib`, async () => {
            const testIb = 'some ib here';
            const { newIbGib } = await factory.firstGen({
                ib: testIb,
                parentIbGib: ROOT,
            });
            expect(newIbGib).to.not.be.null;
            expect(newIbGib).to.not.be.undefined;
        });
        it(`should make ibgibs with initial data`, async () => {
            const testIb = 'some ib here';
            const { newIbGib, intermediateIbGibs } = await factory.firstGen({
                ib: testIb,
                parentIbGib: ROOT,
                data: DATA_SIMPLE_XY,
                noTimestamp: true,
            });
            expect(newIbGib.data, `newIbGib.data`).to.not.be.undefined;
            expect(newIbGib.data).to.deep.equal(DATA_SIMPLE_XY);

            // an intermediate ibGib should be created with 
            // the same ib, but not yet mutated with the data.
            expect(intermediateIbGibs, `intermediateIbGibs`).to.not.be.undefined;
            expect(intermediateIbGibs!.length).to.equal(1);
            expect(intermediateIbGibs![0].ib).to.equal(testIb);
            expect(intermediateIbGibs![0].data, `intermediateIbGibs[0].data`).to.be.undefined;
        });
        it(`should make ibgibs with initial data & rel8ns`, async () => {
            const primitiveIbgibAddrs =
                factory
                    .primitives({ibs: PRIMITIVE_IBS})
                    .map(ibGib => getIbGibAddr({ibGib}));

            const testRel8ns: IbGibRel8ns = {};
            SIMPLE_REL8N_NAMES.forEach(rel8nName => {
                testRel8ns[rel8nName] = primitiveIbgibAddrs;
            });
            const testIb = 'some ib here';
            const { newIbGib, intermediateIbGibs } = await factory.firstGen({
                ib: testIb,
                parentIbGib: ROOT,
                data: DATA_SIMPLE_XY,
                noTimestamp: true,
                rel8ns: testRel8ns,
            });
            expect(newIbGib.data, `newIbGib.data`).to.not.be.undefined;
            expect(newIbGib.data).to.deep.equal(DATA_SIMPLE_XY);
            expect(newIbGib.rel8ns, `newIbGib.rel8ns`).to.not.be.undefined;
            SIMPLE_REL8N_NAMES.forEach(rel8nName => {
                expect(newIbGib.rel8ns![rel8nName]).to.deep.equal(primitiveIbgibAddrs);
            }) 

            // an intermediate ibGib should be created with 
            // the same ib, but not yet mutated with the data.
            expect(intermediateIbGibs, `intermediateIbGibs`).to.not.be.undefined;
            expect(intermediateIbGibs!.length).to.equal(2);
            expect(intermediateIbGibs![0].ib).to.equal(testIb);
            expect(intermediateIbGibs![1].ib).to.equal(testIb);
        });
    });

});