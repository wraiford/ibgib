import { TransformOpts, IbGib, Gib, Ib, IbGibAddr } from "../../types";
import { clone, getIbGibAddr } from "../../helper";
import { sha256v1 } from "../sha256v1";
import { IbGib_V1 } from "../types";
import { IBGIB_DELIMITER, GIB } from "../constants";

export async function buildDna<TSrc extends IbGib_V1, TOpts extends TransformOpts<TSrc>, >(
opts: TOpts,
): Promise<IbGib_V1> {
const transformData: TOpts = clone(opts);
let lc = `[buildDna]`;
if (!transformData.srcAddr) {
    if (transformData.src) {
        transformData.srcAddr = getIbGibAddr({ibGib: opts.src});
    } else {
        throw new Error(`${lc} src required when building dna`);
    }
}
// remove all references to actual objects in this, we just
// want the data. ATOW, src is a reference to the src object
// and we only want the srcAddr
delete transformData.src;

// dna is never timestamped or uniquely identified hmm...
// or rel8d to anything...hmmm
// so much dna, best to minimize though of course we dont
// want to prematurely optimize...but there's a looooot of dna.
// best to share/reuse as much as possible.
const result: IbGib_V1 = {
    ib: transformData.type!,
    data: transformData,
    rel8ns: { ancestor: [
        `${transformData.type!.toString()}${IBGIB_DELIMITER}${GIB}` // e.g. fork^gib
    ] }
};

result.gib = await sha256v1(result);

return result;
}

export function isPrimitive({ibGib, gib}: {ibGib?: IbGib_V1, gib?: Gib}): boolean {
    if (ibGib) {
        return isPrimitive({gib: ibGib.gib});
    } else if (gib) {
        return gib === GIB;
    } else {
        // falsy gib means it's primitive or a programming error...hmm
        return true;
    }
}

// export function isValidAddr({
//     ibGib,
//     ib, gib,
//     addr
// }: {
//     ibGib?: IbGib_V1,
//     ib?: Ib,
//     gib?: Gib,
//     addr?: IbGibAddr,
// }): boolean {
//     if (ibGib && !addr) {
//         { ib, gib } = getIbGibAddr({ibGib});
//         d
//     }
//     if (addr) {

//     }
// }