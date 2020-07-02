/**
 * Test basic hashing that is used when calculating V1 gib hashes
 * using sha256.
 *
 * NOTE:
 *   This only tests the node implementation, and manual testing
 *   is required for browser until I get some kind of browser testing
 *   going.
 */
import { expect } from 'chai';
import { IbGib_V1, IbGibRel8ns_V1 } from './types';
import { sha256v1, hashToHexCopy } from './sha256v1';
import { IbGibWithDataAndRel8ns, IbGibRel8ns } from '../types';

// #region Test Data

const enum TestIbs {
    ib = "ib",
    some_test_string_here = "Some test string here.",
}
let testHashes_sha256_strings: { [key: string]: string | undefined } = {
    [TestIbs.ib]: "765DBB8C38A58A5DC019D7B3133DFFB251D643CB291328AD8E86D4F05655E68B",
    [TestIbs.some_test_string_here]: "E9D61315933F1E8ABCEAA51B2CDD711FBF63C82CBF8C359603907E6DED73DB30"
};

const ROOT_IBGIB_ADDR = "ib^gib";
const EMPTY_REL8NS: any = { };
const EMPTY_DATA: any = { };
const UNDEFINED_DATA: undefined = undefined;
const UNDEFINED_REL8NS: undefined = undefined;
const NULL_DATA: null = null;
const NULL_REL8NS: null = null;

const FALSY_REL8NS = [ EMPTY_REL8NS, UNDEFINED_REL8NS, NULL_REL8NS ];
const FALSY_DATA = [ EMPTY_DATA, UNDEFINED_DATA, NULL_DATA ];
const FALSY_DATA_REL8NS: {r: IbGibRel8ns, d: any}[] = [];
FALSY_REL8NS.forEach(r => {
    FALSY_DATA.forEach(d => {
        FALSY_DATA_REL8NS.push({d, r});
    })
})

interface DATA_FLAT_XY { x: number; y: number; }
const DATA_FLAT_XY: DATA_FLAT_XY = { x: 1, y: 2 };
const DATA_FLAT_XY_HASH = "689A8F1DB95402580476E38C264278CE7B1E664320CFB4E9AE8D3A908CF09964";
interface DATA_FLAT_XS { x: number; s: string; }
const DATA_FLAT_XS: DATA_FLAT_XS = { x: 1, s: "string here" };
const DATA_FLAT_XS_HASH = "ACEB0CC65033DD85216F20CB333FA363F4AF5D601B8FBC053F9C0F10A4D6945F";
const REL8NS_SIMPLE: IbGibRel8ns_V1 = {
    past: [ ROOT_IBGIB_ADDR ],
    ancestor: [ ROOT_IBGIB_ADDR ],
    dna: [ ROOT_IBGIB_ADDR ],
    identity: [ ROOT_IBGIB_ADDR ],
}
const REL8NS_SIMPLE_HASH = "54E74D958F5413212BFD9A5A692B77B5EAC070E82AEAF860D0EE2CCB6113FAFF";

/**
 * A little dogfooding interface for testing
 */
interface TestData {
    type: "falsy_data_rel8ns" | "simple_data_rel8ns";
    ibgib: IbGibWithDataAndRel8ns;
    ibHash: string;
    dataHash: string;
    rel8nsHash: string;
    salt?: string;
}

const TEST_IBGIBS: TestData[] = [
    ...FALSY_DATA_REL8NS.map(x => {
        return <TestData>{
            type: "falsy_data_rel8ns",
            ibgib: {
                ib: TestIbs.ib,
                gib: testHashes_sha256_strings.ib,
                rel8ns: x.r,
            },
            ibHash: testHashes_sha256_strings.ib,
            dataHash: "",
            rel8nsHash: "",
        }
    }),
    {
        type: "simple_data_rel8ns",
        ibgib: {
            ib: TestIbs.ib,
            gib: "6B4084CBE160723E10DC14E9B3FC5AFCE537BB41FC00150C5403C2A62D6BE759",
            rel8ns: REL8NS_SIMPLE,
            data: DATA_FLAT_XY,
        },
        ibHash: testHashes_sha256_strings[TestIbs.ib]!,
        rel8nsHash: REL8NS_SIMPLE_HASH,
        dataHash: DATA_FLAT_XY_HASH,
    },
    {
        type: "simple_data_rel8ns",
        ibgib: {
            ib: TestIbs.ib,
            gib: "A11967196EB5E5F1EC95A5BFA7DD9765B9B060DDAE736F597180BF9D6B53F4ED",
            rel8ns: REL8NS_SIMPLE,
            data: DATA_FLAT_XS,
        },
        ibHash: testHashes_sha256_strings[TestIbs.ib]!,
        rel8nsHash: REL8NS_SIMPLE_HASH,
        dataHash: DATA_FLAT_XS_HASH,
    },
]

// #endregion

describe(`when hashing sha256v1`, () => {
    it(`should hash ibgibs with empty/null/undefined data/rel8ns consistently "forever"`, async () => {
        const ib: string = "ib";
        const gib: string = "gib ignored when hashing";
        const ibHash: string = await hashToHexCopy(ib) || "";
        const dataHash: string = "";
        const rel8nsHash: string = "";
        const all = (ibHash + rel8nsHash + dataHash).toUpperCase();
        const manualAllHash = (await hashToHexCopy(all))?.toUpperCase();
        expect(manualAllHash).to.equal("E975776B1A3E4468086E1D8C409116F6E098D13BEEDFE17AF668071B5D11CD55");

        const equivalents: IbGib_V1[] = [
            // #region empty rel8ns
            {
                ib, gib,
                rel8ns: EMPTY_REL8NS
            },
            {
                ib, gib,
                rel8ns: EMPTY_REL8NS,
                data: EMPTY_DATA,
            },
            {
                ib, gib,
                rel8ns: EMPTY_REL8NS,
                data: NULL_DATA,
            },
            {
                ib, gib,
                rel8ns: EMPTY_REL8NS,
                data: UNDEFINED_DATA,
            },
            // #endregion
            // #region null rel8ns
            {
                ib, gib,
                rel8ns: NULL_REL8NS,
                data: EMPTY_DATA,
            },
            {
                ib, gib,
                rel8ns: NULL_REL8NS,
                data: NULL_DATA,
            },
            {
                ib, gib,
                rel8ns: NULL_REL8NS,
                data: UNDEFINED_DATA,
            },
            // #endregion
            // #region undefined rel8ns
            {
                ib, gib,
                rel8ns: UNDEFINED_REL8NS,
                data: EMPTY_DATA,
            },
            {
                ib, gib,
                rel8ns: UNDEFINED_REL8NS,
                data: NULL_DATA,
            },
            {
                ib, gib,
                rel8ns: UNDEFINED_REL8NS,
                data: UNDEFINED_DATA,
            },
            // #endregion
        ]
        // someday change this to use the TEST_IBGIBS
        equivalents.forEach(async ibgib => {
            const result = (await sha256v1(ibgib, "")).toUpperCase();
            expect(result).to.equal(manualAllHash);
        });
    });

    it(`should hash ibgibs with non-null data/rel8ns consistently "forever"`, async () => {
        for (const x of TEST_IBGIBS.filter(x => x.type === "simple_data_rel8ns")) {
            const ibHash: string = await hashToHexCopy(x.ibgib.ib) || "";
            const dataHash: string = await hashToHexCopy(JSON.stringify(x.ibgib.data)) || "";
            expect(dataHash.toUpperCase()).to.equal(x.dataHash);
            const rel8nsHash: string = await hashToHexCopy(JSON.stringify(x.ibgib.rel8ns)) || "";
            expect(rel8nsHash.toUpperCase()).to.equal(x.rel8nsHash);
            const all = (ibHash + rel8nsHash + dataHash).toUpperCase();
            const manualAllHash = (await hashToHexCopy(all))?.toUpperCase();
            expect(manualAllHash).to.equal(x.ibgib.gib);

            const calculatedGibHash = (await sha256v1(x.ibgib, "")).toUpperCase();
            expect(calculatedGibHash).to.equal(x.ibgib.gib);
        }
    });

    // I have one large-ish sha256 function for gibbing purposes instead of my usual
    // breaking down into multiple smaller functions. This is specifically with having
    // function ibgibs in mind, where the textual code is in the ibgib format
    // (ib, gib, data, rel8ns).
    // (dream where metabootstrapping is better)
    // this is testing a function that is internal to the sha256v1 func.
    // terrible as can be duplicated (i.e. not DRY), but simple albeit fragile testing
    // for now.
    Object.keys(testHashes_sha256_strings).forEach(x => {
        it(`test internal hash function ib: ${x}`, async () => {
            const result = await hashToHexCopy(x);
            expect(result?.toUpperCase()).to.equal(testHashes_sha256_strings[x]);
        });
    });
});
