import { fork } from './transforms/fork';
import { mut8 } from './transforms/mut8';
import { rel8 } from './transforms/rel8';
import { Ib, IbGib, IbGibRel8ns, TransformResult, TemporalJunctionPointOptions } from '../types';
import { IbGib_V1 } from './types';
import { IB, GIB, ROOT } from './constants';

export class Factory_V1 {
    static root() {
        return Factory_V1.primitive({ ib: IB });
    }
    static primitive({
        ib
    }: {
        ib: Ib
    }): IbGib_V1 {
        return { ib, gib: GIB };
    }

    static primitives({
        ibs
    }: {
        ibs: Ib[]
    }) {
        return ibs.map(ib => Factory_V1.primitive({ ib }));
    }

    static async firstGen<TData = any>({
        ib = IB,
        parentIbGib = Factory_V1.root(),
        data,
        rel8ns,
        dna,
        tpj,
        linkedRel8ns,
        noTimestamp,
    }: {
        ib: Ib,
        parentIbGib: IbGib,
        data?: TData,
        rel8ns?: IbGibRel8ns,
        dna?: boolean,
        tpj?: TemporalJunctionPointOptions;
        linkedRel8ns?: string[],
        noTimestamp?: boolean,
    }) {
        const lc = `[firstGen]`;
        /** * Multiple transform steps will create multiple results. */
        const interimResults: TransformResult<IbGib_V1>[] = [];
        let src: IbGib_V1 = parentIbGib || ROOT;
        let resFork = await fork({
            src,
            destIb: ib,
            tpj,
            dna,
            linkedRel8ns,
            noTimestamp,
        });
        interimResults.push(resFork);
        src = resFork.newIbGib;

        if (data) {
            let resMut8 = await mut8({
                src,
                dataToAddOrPatch: data,
                dna,
                linkedRel8ns,
                noTimestamp,
            });
            interimResults.push(resMut8);
            src = resMut8.newIbGib;
        };

        if (rel8ns) {
            let resRel8 = await rel8({
                src,
                rel8nsToAddByAddr: rel8ns,
                dna,
                linkedRel8ns,
                noTimestamp,
            });
            interimResults.push(resRel8);
            // src = resRel8.newIbGib; // not needed because not used (this is the last step)
        }

        if (interimResults.length > 1) {
            const newIbGib = interimResults.slice(interimResults.length-1)[0].newIbGib;
            const result = <TransformResult<IbGib_V1>>{ 
                newIbGib,
                intermediateIbGibs: interimResults.slice(0, interimResults.length-1).map(x => x.newIbGib),
            };
            if (dna) {
                let dnas: IbGib_V1[] = [];
                interimResults.forEach(res => { dnas = dnas.concat(res.dnas!); });
                result.dnas = dnas;
            }
            return result;
        } else if (interimResults.length === 1) {
            // for some reason the caller just used this as a fork.
            return interimResults[0];
        } else {
            throw new Error(`${lc} hmm, I'm not sure...`);
        }
    }
}
