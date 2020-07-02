import { fork } from './transforms/fork';
import { Ib, IbGib, IbGibRel8ns } from '../types';
import { IbGib_V1 } from './types';
import { IB, GIB } from './constants';

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
    }: {
        ib: Ib,
        parentIbGib: IbGib,
        data?: TData,
        rel8ns?: IbGibRel8ns,
    }) {
        let result = await fork({
            src: parentIbGib,
            destIb: ib,
            tpj: { timestamp: true },
        });
        throw new Error(`firstGen not implemented yet`);
        // result = await mut8({
        //     src: result,
        //     dataToAddOrPatch: data,
        // });
        // result = await rel8({
        //     src: result,
        //     rel8nsToAddByAddr: rel8ns,
        // });
        return result;
    }
}
