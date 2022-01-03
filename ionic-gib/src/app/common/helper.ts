import { AlertController } from '@ionic/angular';

import { GIB, IBGIB_DELIMITER } from 'ts-gib/dist/V1';
import { IbGibAddr, } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';
import { HashAlgorithm } from 'ts-gib';
import { IbGibSpace } from './types';
import { IbGibSpaceAny } from './spaces/space-base-v1';
import { Plugins } from '@capacitor/core';
const { Modals } = Plugins;

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

export function getTimestampInTicks(): string {
    return (new Date()).getTime().toString();
}

