import { AlertController, } from '@ionic/angular';
import { Plugins } from '@capacitor/core';
const { Modals } = Plugins;

import {
    IbGib_V1,
} from 'ts-gib/dist/V1';
import { TransformResult, } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';

import { EncryptionData_V1, OuterSpaceIbGib, SecretIbGib_V1 } from '../types';
import { CreateSecretModalComponent } from '../create-secret-modal/create-secret-modal.component';
import * as c from '../constants';
import { CreateEncryptionModalComponent } from '../create-encryption-modal/create-encryption-modal.component';
import { CreateOuterspaceModalComponent } from '../create-outerspace-modal/create-outerspace-modal.component';
import { CommonService } from '../../services/common.service';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;


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