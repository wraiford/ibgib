import { AlertController, } from '@ionic/angular';
import { Plugins } from '@capacitor/core';
const { Modals } = Plugins;

import {
    IbGib_V1, IbGibRel8ns_V1,
    IBGIB_DELIMITER, GIB, IB,
    Factory_V1 as factory,
    sha256v1,
    IbGibData_V1,
} from 'ts-gib/dist/V1';
import { Ib, IbGibAddr, TransformResult, HashAlgorithm } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';
import * as cTsGib from 'ts-gib/dist/v1/constants';

import { EncryptionData_V1, IbGibSpace, OuterSpaceIbGib, SecretIbGib_V1 } from './types';
import { IbGibSpaceAny } from './spaces/space-base-v1';
import { CreateSecretModalComponent } from './create-secret-modal/create-secret-modal.component';
import * as c from './constants';
import { CreateEncryptionModalComponent } from './create-encryption-modal/create-encryption-modal.component';
import { CreateOuterspaceModalComponent } from './create-outerspace-modal/create-outerspace-modal.component';
import { CommonService } from '../services/common.service';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

/**
 * Naive synchronous validation for ibgib addresses.
 *
 * @returns error string array if validation errors found, else null
 */
export function validateIbGibAddr({
    addr,
    delimiter,
    version,
}: {
    addr: IbGibAddr,
    delimiter?: string,
    version?: string,
}): string[] | null {
    const lc = `[${validateIbGibAddr.name}]`;
    try {
        let errors: string[] = [];
        if (version) { console.warn(`${lc} version not implemented yet. Ignoring. (WARNING: 2d19db16ec0c4766b5d35248787671f3)`); }

        // validate as a whole
        if (!addr) {
            errors.push(`addr required. (ERROR: e9a54041aa0b41c1bb2324d9d2d42c7f)`);
            return errors;
        }
        delimiter = delimiter || IBGIB_DELIMITER;
        if (!addr.includes(delimiter)) { errors.push(`No delimiter (${delimiter}) found. (ERROR: 05e28dcb70ff44019edc53ed508bd1e8)`); }
        if (addr.startsWith(delimiter)) { errors.push(`addr starts with delim. (ERROR: d29f808c5a47452f9bb3ea684694c6eb)`); }

        // validate pieces...
        const { ib, gib } = h.getIbAndGib({ibGibAddr: addr, delimiter});

        // ...ib
        const resValidateIb = validateIb({ib, ibGibAddrDelimiter: delimiter, version});
        if (resValidateIb) { errors = errors.concat(resValidateIb); }

        // ...gib
        const resValidateGib = validateGib({gib, ibGibAddrDelimiter: delimiter, version});
        if (resValidateGib) { errors = errors.concat(resValidateGib); }

        // we're done
        return errors.length > 0 ? errors : null;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Naive validation of ib.
 *
 * @returns errors array if found, else null
 */
export function validateIb({
    ib,
    ibGibAddrDelimiter,
    version,
}: {
    ib: Ib,
    ibGibAddrDelimiter?: string,
    version?: string,
}): string[] | null {
    const lc = `[${validateIb.name}]`;
    try {
        const errors: string[] = [];
        if (version) { console.warn(`${lc} version not implemented yet. Ignoring. (WARNING: 71228ba4ed994aaa8149910e295ab087)`); }

        if (!ib) {
            errors.push(`ib required. (ERROR: a76d06c7b9c24db3a731a91dbe46acd5)`);
            return errors;
        }

        if (ib === IB) { return null; }

        ibGibAddrDelimiter = ibGibAddrDelimiter || IBGIB_DELIMITER;
        if (ib.includes(ibGibAddrDelimiter)) { errors.push(`ib contains ibGibAddrDelimiter (${ibGibAddrDelimiter}) (ERROR: 09e61b46c3e84874bc02b6918f1f2c39)`); }

        return errors.length > 0 ? errors : null;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export function validateGib({
    gib,
    ibGibAddrDelimiter,
    version,
}: {
    gib: Ib,
    ibGibAddrDelimiter?: string,
    version?: string,
}): string[] | null {
    const lc = `[${validateGib.name}]`;
    try {
        const errors: string[] = [];
        if (version) { console.warn(`${lc} version not implemented yet. Ignoring. (ERROR: 90ced1db69774702b92acb261bdaee23)`); }

        if (!gib) {
            errors.push(`gib required. (ERROR: e217de4035b04086827199f4bace189c)`);
            return errors;
        }

        // automatically valid if it's a primitive
        if (gib === GIB) { return null; }

        ibGibAddrDelimiter = ibGibAddrDelimiter || IBGIB_DELIMITER;
        if (gib.includes(ibGibAddrDelimiter)) { errors.push(`gib contains ibGibAddrDelimiter (${ibGibAddrDelimiter}). (ERROR: 1e584258d9e049ba9ce7e516f3ab97f1)`); }

        if (!gib.match(c.HEXADECIMAL_HASH_STRING_REGEXP_32) && !gib.match(c.HEXADECIMAL_HASH_STRING_REGEXP_64)) {
            errors.push('gib is neither a 32- or 64-char hash string. (ERROR: d47ff6d6e14b4c02a62107090c8dad39)');
        }

        return errors.length > 0 ? errors : null;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Binaries require special handling, since they do not conform to the
 * "normal" IbGib_V1 data structure per se. This stems from wanting to
 * be able to have binaries (jpgs, gifs, etc. especially) able to
 * sit on a server and be served as regular files.
 *
 * @returns string in expected template for binaries in this app.
 */
export function getBinAddr({binHash, binExt}: {binHash: string, binExt: string}): IbGibAddr {
    return `bin.${binExt}${IBGIB_DELIMITER}${binHash}`;
}
export function getBinHashAndExt({addr}: {addr: IbGibAddr}): { binHash: string, binExt: string } {
    const lc = `[${getBinHashAndExt.name}]`;
    try {
        if (!isBinary({addr})) { throw new Error(`not a bin address`); }
        const {ib, gib: binHash} = h.getIbAndGib({ibGibAddr: addr});
        const binExt = ib.split('.')[1]; // assumes ib formatting checked in `isBin` function!
        return { binHash, binExt };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export function isBinary({addr}: {addr: IbGibAddr}): boolean {
    const lc = `[${isBinary.name}]`;
    try {
        // probably overkill here, but...
        if (!addr) { throw new Error(`addr required`); }
        const {ib,gib} = h.getIbAndGib({ibGibAddr: addr});
        if (!ib) { return false; }
        if (!gib) { return false; }
        if (!ib.startsWith('bin.')) { return false; }
        if (gib.length !== 64) {
            console.warn(`${lc} gib length is not 64, so return false. But this may not be true if using another hash algorithm.`);
            return false;
        }
        const ibPieces = ib.split('.');
        if (ibPieces.length !== 2) { return false; }
        if (ibPieces[1] === "") { return false; }
        return true;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Just trying to centralize and standardize regular expressions here...
 */
export function getRegExp({
  min,
  max,
  chars,
  noSpaces,
}: {
  min?: number,
  max?: number,
  chars?: string,
  noSpaces?: boolean,
}): RegExp {
  min = min ?? 1;
  max = max ?? 999999999999;
  chars = chars ?? '';

  return noSpaces ?
    new RegExp(`^[\\w${chars}]{${min},${max}}$`) :
    new RegExp(`^[\\w\\s${chars}]{${min},${max}}$`);
}

export async function hash16816({
    s,
    algorithm,
}: {
    s: string,
    algorithm: HashAlgorithm,
}): Promise<string> {
    const lc = `[${hash16816.name}]`;
    try {
        let hash: string;
        for (let i = 0; i < 168; i++) {
            hash = await h.hash({s, algorithm});
        }
        return hash.slice(0, 16);
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Wrapper for alerting via atow capacitor modals.
 *
 * @returns FUNCTION that alerts (doesn't actually do the alert)
 */
export function getFnAlert(): ({title, msg}: {title: string, msg: string}) => Promise<void> {
    return async ({title, msg}: {title: string, msg: string}) => {
        await Modals.alert({title, message: msg});
    };
}

/**
 * Wrapper for prompting via atow capacitor modals.
 *
 * @returns FUNCTION that prompts (doesn't actually do the prompt)
 */
export function getFnPrompt(): ({title, msg}: {title: string, msg: string}) => Promise<string|null> {
    return async ({title, msg}: {title: string, msg: string}) => {
        const resPrompt = await Modals.prompt({title, message: msg});
        if (resPrompt.cancelled) {
            return null;
        } else {
            return resPrompt.value;
        }
    };
}

/**
 * Wrapper for confirming via atow capacitor modals.
 *
 * @returns FUNCTION that prompts (doesn't actually do the prompt)
 */
export function getFnConfirm():
    ({title, msg, okButtonTitle, cancelButtonTitle}:
        {title: string, msg: string, okButtonTitle?: string, cancelButtonTitle?: string}) => Promise<boolean> {

    return async ({title, msg, okButtonTitle, cancelButtonTitle}:
        {title: string, msg: string, okButtonTitle?: string, cancelButtonTitle?: string}) => {
            okButtonTitle = okButtonTitle || 'Ok';
            cancelButtonTitle = cancelButtonTitle || 'Cancel';
            const resConfirm = await Modals.confirm({
                title, message: msg, okButtonTitle, cancelButtonTitle
            });
            return resConfirm.value;
        }
}


/**
 * Klugy way to prompt for password.
 */
export function getFnPromptPassword_AlertController({
    alertController,
    // title,
    // msg,
}: {
    alertController: AlertController,
    // title: string,
    // msg: string,
}): (title: string, msg: string) => Promise<string|null> {
    const lc = `[${getFnPromptPassword_AlertController.name}]`;
    try {
        if (!alertController) { throw new Error('alertController required.'); }
        let fnPromptPassword =  async (title: string, msg: string) => {
          const alert = await alertController.create({
            header: title,
            message: msg,
            inputs: [
              { name: 'password', type: 'password', label: 'Password: ', },
            ],
            buttons: [ 'OK', 'Cancel' ],
          });
          await alert.present();
          let result = await alert.onDidDismiss();
          if (result?.data?.values?.password) {
            return result!.data!.values!.password;
          } else {
            return null;
          }
        };
        return fnPromptPassword;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Two spaces can be equivalent if they point to the same area.
 *
 * @returns true if the "same" space
 */
export function isSameSpace({
    a,
    b,
    mustHaveSameData,
}: {
    a: IbGibSpaceAny,
    b: IbGibSpaceAny,
    /**
     * If true, then only same exact internal data will do.
     * Be careful if they have last modified timestamps.
     */
    mustHaveSameData?: boolean,
}): boolean {
    const lc = `[${isSameSpace.name}]`;

    if (!a) { throw new Error(`${lc} a is falsy`)};
    if (!b) { throw new Error(`${lc} b is falsy`)};

    // try by data
    if (a.data && JSON.stringify(a.data) === JSON.stringify(b.data)) {
        return true;
    } else if (mustHaveSameData) {
        return false;
    }

    // try by uuid
    if (a.data?.uuid && b.data?.uuid) { return a.data!.uuid === b.data!.uuid; }

    // try by tjp
    if (a.rel8ns?.tjp?.length === 1 && b.rel8ns?.tjp?.length === 1) {
        return a.rel8ns.tjp[0] === b.rel8ns.tjp[0];
    }

    // try by gib (last resort), can't both be falsy or primitive (maybe overkill)
    if (!a.gib && !b.gib) {
        throw new Error(`${lc} Invalid spaces. both a.gib and b.gib are falsy, neither has uuid and neither has tjp.`);
    }
    if (a.gib === GIB && b.gib === GIB) { throw new Error(`${lc} both a and b are primitives`); }
    return a.gib === b.gib;
}

/**
 * syntactic sugar for `(new Date()).getTime().toString()`
 * @returns ticks string
 */
export function getTimestampInTicks(): string {
    return (new Date()).getTime().toString();
}

/**
 * Klugy way to show modal
 */
export function getFn_promptCreateSecretIbGib(
    common: CommonService,
): () => Promise<IbGib_V1 | undefined> {
    const lc = `[${getFn_promptCreateSecretIbGib.name}]`;
    return async () => {
        try {
            const modal = await common.modalController.create({
                component: CreateSecretModalComponent,
            });
            await modal.present();
            let resModal = await modal.onWillDismiss();
            if (resModal.data) {
                const resNewSecret = <TransformResult<SecretIbGib_V1>>resModal.data;
                await common.ibgibs.persistTransformResult({resTransform: resNewSecret});
                const addr = h.getIbGibAddr({ibGib: resNewSecret.newIbGib});
                if (logalot) { console.log(`${lc} created secret. addr: ${addr}`); }
                await common.ibgibs.rel8ToSpecialIbGib({
                    type: "secrets",
                    rel8nName: c.SECRET_REL8N_NAME,
                    ibGibsToRel8: [resNewSecret.newIbGib],
                });
                return resNewSecret.newIbGib;
            } else {
                // didn't create one
                console.warn(`${lc} didn't create at this time.`);
                return undefined;
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            return undefined;
        }
    }
}

/**
 * Klugy way to show modal
 */
export function getFn_promptCreateEncryptionIbGib(
    common: CommonService,
): () => Promise<IbGib_V1 | undefined> {
    const lc = `[${getFn_promptCreateEncryptionIbGib.name}]`;
    return async () => {
        try {
            const modal = await common.modalController.create({
                component: CreateEncryptionModalComponent,
            });
            await modal.present();
            let resModal = await modal.onWillDismiss();
            if (resModal.data) {
            const resNewEncryption = <TransformResult<IbGib_V1<EncryptionData_V1>>>resModal.data;
            await common.ibgibs.persistTransformResult({resTransform: resNewEncryption});
            const addr = h.getIbGibAddr({ibGib: resNewEncryption.newIbGib});
            if (logalot) { console.log(`${lc} created secret. addr: ${addr}`); }
                return resNewEncryption.newIbGib;
            } else {
                // didn't create one
                console.warn(`${lc} didn't create at this time.`);
                return undefined;
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            return undefined;
        }
    }
}

/**
 * Klugy way to show modal
 */
export function getFn_promptCreateOuterSpaceIbGib(
    common: CommonService,
): () => Promise<IbGib_V1 | undefined> {
    const lc = `[${getFn_promptCreateOuterSpaceIbGib.name}]`;
    return async () => {
        try {
            const modal = await common.modalController.create({
                component: CreateOuterspaceModalComponent,
            });
            await modal.present();
            let resModal = await modal.onWillDismiss();
            if (resModal.data) {
            const resOuterSpace = <TransformResult<OuterSpaceIbGib>>resModal.data;
            await common.ibgibs.persistTransformResult({resTransform: resOuterSpace});
            const addr = h.getIbGibAddr({ibGib: resOuterSpace.newIbGib});
            if (logalot) { console.log(`${lc} created outerspace. addr: ${addr}`); }
                return resOuterSpace.newIbGib;
            } else {
                // didn't create one
                console.warn(`${lc} didn't create outerspace at this time.`);
                return undefined;
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            return undefined;
        }
    }
}

/**
 * Utility function to generate hard-coded ibgibs to use at runtime "on-chain" but
 * written at compile-time in (for now) "off-chain" source code.
 *
 * Because this is supposed to create and re-create deterministically the equivalent
 * of a non-primitive ibgib "constant", this function creates a single ibgib with...
 * * one ancestor
 * * no past, dna, or tjp rel8ns
 * * no tjp timestamp or uuid
 * * no nCounter
 *
 * ## validation
 *
 * * validates the given `ib` against `ibRegExpPattern` or default regexp.
 * * validates that rel8ns doesn't include default forbidden rel8n names or
 *   atow `'tjp'`.
 *
 * ## intent
 *
 * I want to be able to create deterministic ibGibs that I can reference at
 * runtime, similar to an ibgib primitive (e.g. "root^gib"), but with the
 * integrity of the `gib` hash. This way, I can reference a deterministic ibgib
 * from code at compile time, and at runtime this will have a corresponding
 * ibgib datum with gib-hashed integrity.
 *
 * ## example
 *
 * I want to create a "hard-coded" schema ibgib that I rel8 to some protocol
 * ibgib. So I'll create the data here, which lives in source control in a text file,
 * and then I'll render that as an ibgib that verifies integrity. If I as a coder change
 * it at all, then the `gib` of course will be different.
 *
 * @param param0
 */
export async function constantIbGib<TData extends IbGibData_V1 = any , TRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1>({
    parentPrimitiveIb,
    ib,
    ibRegExpPattern,
    data,
    rel8ns,
}: {
    parentPrimitiveIb: Ib,
    ib: Ib,
    ibRegExpPattern?: string,
    data?: TData,
    rel8ns?: TRel8ns,
}): Promise<IbGib_V1<TData, TRel8ns>> {
    const lc = `[${constantIbGib.name}]`;
    try {
        // validation
        // parentPrimitiveIb
        if (!parentPrimitiveIb) { throw new Error(`parentPrimitiveIb required. (ERROR: 88ddf188cc5a4340b597abefba1481e2)`); }
        if (validateIb({ib: parentPrimitiveIb}) !== null) { throw new Error(`Invalid parentPrimitiveIb: ${parentPrimitiveIb}. (ERROR:5aec0320956d492ebeeaca41eb1fe1c6)`); }

        // ib
        if (!ib) { throw new Error(`ib required. (ERROR: 7bbc88f4f2e842d6b00126e55b1783e4)`); }
        const regExp = ibRegExpPattern ? new RegExp(ibRegExpPattern) : c.IB_REGEXP_DEFAULT;
        if (!ib.match(regExp)) { throw new Error(`invalid ib. does not match regexp (${regExp})`); }

        // rel8ns
        const incomingRel8nNames = Object.keys(rel8ns ?? {});
        const forbiddenRel8nNames = [...cTsGib.FORBIDDEN_ADD_RENAME_REMOVE_REL8N_NAMES, 'tjp'];
        const rel8nsIsInvalid = incomingRel8nNames.some(x => {
            // we don't want constants trying to look like they have/are descendants/tjps/etc.
            return forbiddenRel8nNames.includes(x);
        });
        if (rel8nsIsInvalid) { throw new Error(`Invalid rel8ns. forbiddenRel8nNames: ${forbiddenRel8nNames}. rel8ns keys: ${Object.keys(rel8ns)}. (ERROR: 837a993c265c4362b6aa0b1a234ea5f8)`); }


        // create the constant
        const resFirstGen = await factory.firstGen({
            ib,
            parentIbGib: factory.primitive({ib: parentPrimitiveIb}),
            data,
            rel8ns,
            dna: false,
            noTimestamp: true,
            nCounter: false,
        });
        const constantIbGib: IbGib_V1<TData, TRel8ns> =
            <IbGib_V1<TData, TRel8ns>>resFirstGen.newIbGib;

        // remove any extraneous stuff
        if (constantIbGib?.rel8ns?.past) { delete constantIbGib.rel8ns.past; }
        if (constantIbGib?.rel8ns?.tjp) { delete constantIbGib.rel8ns.tjp; }
        if (constantIbGib?.rel8ns?.identity) { delete constantIbGib.rel8ns.identity; }

        // recalculate the gib hash
        constantIbGib.gib = await sha256v1({
            ib: constantIbGib.ib,
            data: constantIbGib.data,
            rel8ns: constantIbGib.rel8ns,
        });

        return constantIbGib;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}