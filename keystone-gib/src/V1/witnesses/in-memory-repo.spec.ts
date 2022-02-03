import { expect } from 'chai';
import { IbGibWitnessScheduler } from './scheduler';
import { Factory_V1 } from 'ts-gib/dist/V1';
import { CanGetIbGibOptions, GetIbGibOptions, CanPutIbGibOptions, PutIbGibOptions, IbGib } from 'ts-gib';
import { getIbGibAddr } from 'ts-gib/dist/helper';
import { InMemoryRepo } from './in-memory-repo';


const testRepo = new InMemoryRepo();

describe(`when creating InMemoryRepo`, () => {

    it(`should create without exception`, async () => {
        let repo = new InMemoryRepo();
    });

    describe(`when witness ibgib`, () => {
        it(`should NOT store self (repo) ibgib`, async () => {
            const repo = new InMemoryRepo();
            await repo.updateGib();
            const other = repo;

            // witnesses self
            await repo.witness({other});
            const otherAddr = getIbGibAddr({ibGib: other});
            const gotten = repo.ibGibs[otherAddr];
            expect(gotten).to.be.undefined;
            // throw new Error('commented out')
        });
        it(`should store primitive ibgib`, async () => {
            const repo = new InMemoryRepo();
            const ib = 'some ib here';
            const other = Factory_V1.primitive({ib});
            const otherAddr = getIbGibAddr({ibGib: other});

            await repo.witness({other});
            const gotten = repo.ibGibs[otherAddr];
            const gottenAddr = getIbGibAddr({ibGib: gotten});
            expect(gottenAddr).to.equal(otherAddr);
            expect(gotten).to.not.be.undefined;
            expect(gotten).to.not.be.null;
            expect(gotten.gib).to.not.be.null;
            expect(gotten.gib).to.not.be.undefined;
            expect(gotten.gib).to.equal(other.gib)
        });
    });
});