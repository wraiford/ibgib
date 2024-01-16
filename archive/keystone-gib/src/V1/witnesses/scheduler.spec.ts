import { expect } from 'chai';
import { IbGibWitnessScheduler } from './scheduler';
import { IbGibData_V1, IbGib_V1, Factory_V1 } from 'ts-gib/dist/V1';
import { CanGetIbGibOptions, GetIbGibOptions, CanPutIbGibOptions, PutIbGibOptions, IbGib, IbGibAddr } from 'ts-gib';
import { getIbGibAddr, getUUID } from 'ts-gib/dist/helper';
import { InMemoryRepo } from './in-memory-repo';
// import { WitnessBase_V1, WitnessData_V1, WitnessOpts } from '../witness';
import { Witness_V1, WitnessOpts } from "../witness";
import { WitnessBase_V1, WitnessData_V1 } from "../bases/witness-base";

interface TestData extends WitnessData_V1 {
    lastAddr: IbGibAddr | undefined;
    id: string | undefined;
}

/**
 * This test witness simply stores the most recent address it has witnessed.
 */
class TestWitness_RememberLastAddr extends WitnessBase_V1<TestData> {
    lastAddr: IbGibAddr | undefined;
    id: string | undefined;

    async init(): Promise<void> {
        this.id = await getUUID();
    }

    async witnessImpl({other}: WitnessOpts): Promise<void> {
        const otherAddr = getIbGibAddr({ibGib: other});
        this.lastAddr = otherAddr;
    }

    get data(): TestData | undefined {
        const data: TestData = super.data || {
            isWitness: true,
            code: super.code,
            v: super.v,
            lastAddr: this.lastAddr,
            id: this.id,
        };

        data.lastAddr = this.lastAddr;
        data.id = this.id;

        return data;
    }

}

const testRepo = new InMemoryRepo();

describe(`when creating scheduler`, () => {

    it(`should create without exception`, async () => {
        let scheduler = new IbGibWitnessScheduler(testRepo);
        // expect(resKeystone).to.not.be.null;
        // expect(resKeystone).to.not.be.undefined;

        // console.log(pretty(resKeystone));
    });

    it(`should not add primitive to witnesses array`, async () => {
        let scheduler = new IbGibWitnessScheduler(testRepo);
        const s = <any>scheduler; // to inspect internal private properties

        const ib = 'primitive a';
        const a = Factory_V1.primitive({ib});
        await scheduler.witness({other: a});
        expect(s._witnesses.length).to.equal(0);
    });

    it(`should not add primitive to witnesses array but does remember test witness`, async () => {
        let scheduler = new IbGibWitnessScheduler(testRepo);
        const s = <any>scheduler; // to inspect internal private properties

        const ib = 'primitive a';
        const a = Factory_V1.primitive({ib});
        await scheduler.witness({other: a});
        expect(s._witnesses.length).to.equal(0);

        const wRememberLastAddr = new TestWitness_RememberLastAddr();
        await wRememberLastAddr.init();
        await wRememberLastAddr.updateGib();

        await scheduler.witness({other: wRememberLastAddr});
        expect(s._witnesses.length).to.equal(1);
    });

    it(`should add witness to witnesses array which then witnesses next scheduled ibgib`, async () => {
        let scheduler = new IbGibWitnessScheduler(testRepo);
        const s = <any>scheduler; // to inspect internal private properties

        // when scheduler witnesses the test witness, it should add it to the
        // internal list of witnesses that will observe future ibgibs scheduled.
        const wRememberLastAddr = new TestWitness_RememberLastAddr();
        await wRememberLastAddr.init();
        await wRememberLastAddr.updateGib();
        await scheduler.witness({other: wRememberLastAddr});

        // now the test witness is in the witnesses array
        expect(s._witnesses.length).to.equal(1);

        // witness some other ibgib, which when the scheduler witnesses it,
        // it should be witnessed also by our test witness
        const ib = 'primitive a';
        const a = Factory_V1.primitive({ib});
        const aAddr = getIbGibAddr(a);
        await scheduler.witness({other: a});

        // when the test witness witnesses another ibgib, it stores its address.
        // so in this case, it should be equal to our test primitive address
        expect(wRememberLastAddr.lastAddr).to.equal(aAddr);
    });

    it(`multiple witnesses should witness a single ibgib`, async () => {
        let scheduler = new IbGibWitnessScheduler(testRepo);
        const s = <any>scheduler; // to inspect internal private properties

        // when scheduler witnesses the test witness, it should add it to the
        // internal list of witnesses that will observe future ibgibs scheduled.
        const wRememberLastAddr = new TestWitness_RememberLastAddr();
        await wRememberLastAddr.init();
        await wRememberLastAddr.updateGib();
        await scheduler.witness({other: wRememberLastAddr});

        const wRememberLastAddr2 = new TestWitness_RememberLastAddr();
        await wRememberLastAddr2.init();
        await wRememberLastAddr2.updateGib();
        await scheduler.witness({other: wRememberLastAddr2});

        // both test witnesses should be in the witnesses array and should
        // witness future events
        expect(s._witnesses.length).to.equal(2);

        // the first witness should also have witnessed the adding of the second.
        expect(wRememberLastAddr.lastAddr).to.equal(wRememberLastAddr2.addr);

        // both should witness the following primitive ibgib
        const ib = 'primitive a';
        const a = Factory_V1.primitive({ib});
        const aAddr = getIbGibAddr(a);
        await scheduler.witness({other: a});

        // when the test witness witnesses another ibgib, it stores its address.
        // so in this case, it should be equal to our test primitive address
        // in both test witnesses
        expect(wRememberLastAddr.lastAddr).to.equal(aAddr);
        expect(wRememberLastAddr2.lastAddr).to.equal(aAddr);
    });

    it(`multiple witnesses should witness multiple ibgibs`, async () => {
        let scheduler = new IbGibWitnessScheduler(testRepo);
        const s = <any>scheduler; // to inspect internal private properties

        // when scheduler witnesses the test witness, it should add it to the
        // internal list of witnesses that will observe future ibgibs scheduled.
        const wRememberLastAddr = new TestWitness_RememberLastAddr();
        await wRememberLastAddr.init();
        await wRememberLastAddr.updateGib();
        await scheduler.witness({other: wRememberLastAddr});

        const wRememberLastAddr2 = new TestWitness_RememberLastAddr();
        await wRememberLastAddr2.init();
        await wRememberLastAddr2.updateGib();
        await scheduler.witness({other: wRememberLastAddr2});

        // both test witnesses should be in the witnesses array and should
        // witness future events
        expect(s._witnesses.length).to.equal(2);

        // the first witness should also have witnessed the adding of the second.
        expect(wRememberLastAddr.lastAddr).to.equal(wRememberLastAddr2.addr);

        // both should witness the following primitive ibgib
        const ibs = [ 'a', 'b', 'c', 'd', '1234', '5678', 'mary had a little lamb' ];
        for (const ib of ibs) {
            const x = Factory_V1.primitive({ib});
            const xAddr = getIbGibAddr(x);
            await scheduler.witness({other: x});

            // when the test witness witnesses another ibgib, it stores its address.
            // so in this case, it should be equal to our test primitive address
            // in both test witnesses
            expect(wRememberLastAddr.lastAddr).to.equal(xAddr);
            expect(wRememberLastAddr2.lastAddr).to.equal(xAddr);
        }
    });

    it(`witness does not witness itself`, async () => {
        let scheduler = new IbGibWitnessScheduler(testRepo);
        const s = <any>scheduler; // to inspect internal private properties

        // when scheduler witnesses the test witness, it should add it to the
        // internal list of witnesses that will observe future ibgibs scheduled.
        const wRememberLastAddr = new TestWitness_RememberLastAddr();
        await wRememberLastAddr.init();
        await wRememberLastAddr.updateGib();
        await scheduler.witness({other: wRememberLastAddr});

        // now the test witness is in the witnesses array
        expect(s._witnesses.length).to.equal(1);

        // witness some other ibgib, which when the scheduler witnesses it,
        // it should be witnessed also by our test witness
        const ib = 'primitive a';
        const a = Factory_V1.primitive({ib});
        const aAddr = getIbGibAddr(a);
        await scheduler.witness({other: a});

        // when the test witness witnesses another ibgib, it stores its address.
        // so in this case, it should be equal to our test primitive address
        expect(wRememberLastAddr.lastAddr).to.equal(aAddr);

        // witness should not witness itself, so its last address should not be
        // its own.
        await scheduler.witness({other: wRememberLastAddr});

        // should still be the primitive's addr, not its own
        expect(wRememberLastAddr.lastAddr).to.equal(aAddr);
        // expect(wRememberLastAddr.lastAddr).to.equal(wRememberLastAddr.addr);
    });

    // it(`random order "multi-threaded"`, async () => {
    //     throw new Error('test not implemented');
    // });

});