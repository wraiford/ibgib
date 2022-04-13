import { AlertController, } from '@ionic/angular';
import { Plugins } from '@capacitor/core';
const { Modals } = Plugins;

import {
    IbGib_V1,
} from 'ts-gib/dist/V1';
import { TransformResult, } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';

// import { EncryptionData_V1, OuterSpaceIbGib, PicIbGib_V1, RobbotIbGib_V1, SecretIbGib_V1 } from '../types'; // refactoring to not use types/index
import { SecretModalFormComponent } from '../modals/secret-modal-form/secret-modal-form.component';
import * as c from '../constants';
import { EncryptionModalFormComponent } from '../modals/encryption-modal-form/encryption-modal-form.component';
import { OuterspaceModalFormComponent } from '../modals/outerspace-modal-form/outerspace-modal-form.component';
import { CommonService } from '../../services/common.service';
import { UpdatePicModalFormComponent, UpdatePicModalResult } from '../modals/update-pic-modal-form/update-pic-modal-form.component';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';
import { RobbotModalFormComponent, RobbotModalResult } from '../modals/robbot-modal-form/robbot-modal-form.component';
import { SecretIbGib_V1, EncryptionData_V1 } from '../types/encryption';
import { OuterSpaceIbGib } from '../types/outer-space';
import { PicIbGib_V1 } from '../types/pic';
import { RobbotIbGib_V1 } from '../types/robbot';

const logalot = c.GLOBAL_LOG_A_LOT || false;


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
 * Prompts the user for a password using an ionic capacitor (atow) alert
 * controller with an input of type `'password'`.
 *
 * @returns either the password or null if cancelled
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
 * Creates a function with a single `space` arg. This fn when called shows a
 * modal to create an secret ibgib. If the user chooses to save, then the
 * modal will create the secret ibgib, save the transform result in the
 * given `space` (atow this is the local user space), and return the new
 * secret ibgib.
 */
export function getFn_promptCreateSecretIbGib(
    common: CommonService,
): (space: IbGibSpaceAny) => Promise<IbGib_V1 | undefined> {
    const lc = `[${getFn_promptCreateSecretIbGib.name}]`;
    return async (space: IbGibSpaceAny) => {
        try {
            const modal = await common.modalController.create({
                component: SecretModalFormComponent,
            });
            await modal.present();
            let resModal = await modal.onWillDismiss();
            if (resModal.data) {
                const resNewSecret = <TransformResult<SecretIbGib_V1>>resModal.data;
                await common.ibgibs.persistTransformResult({resTransform: resNewSecret, space});
                const addr = h.getIbGibAddr({ibGib: resNewSecret.newIbGib});
                if (logalot) { console.log(`${lc} created secret. addr: ${addr}`); }
                await common.ibgibs.rel8ToSpecialIbGib({
                    type: "secrets",
                    rel8nName: c.SECRET_REL8N_NAME,
                    ibGibsToRel8: [resNewSecret.newIbGib],
                    space,
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
 * Creates a function with a single `space` arg. This fn when called shows a
 * modal to create an encryption ibgib. If the user chooses to save, then the
 * modal will create the encryption ibgib, save the transform result in the
 * given `space` (atow this is the local user space), and return the new
 * encryption ibgib.
 */
export function getFn_promptCreateEncryptionIbGib(
    common: CommonService,
): (space: IbGibSpaceAny) => Promise<IbGib_V1 | undefined> {
    const lc = `[${getFn_promptCreateEncryptionIbGib.name}]`;
    return async (space: IbGibSpaceAny) => {
        try {
            const modal = await common.modalController.create({
                component: EncryptionModalFormComponent,
            });
            await modal.present();
            let resModal = await modal.onWillDismiss();
            if (resModal.data) {
                const resNewEncryption = <TransformResult<IbGib_V1<EncryptionData_V1>>>resModal.data;
                await common.ibgibs.persistTransformResult({resTransform: resNewEncryption, space});
                const addr = h.getIbGibAddr({ibGib: resNewEncryption.newIbGib});
                if (logalot) { console.log(`${lc} created encryption. addr: ${addr}`); }
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
 * Creates a function with a single `space` arg. This fn when called shows a
 * modal to create an outerspace ibgib. If the user chooses to save, then the
 * modal will create the outerspace ibgib, save the transform result in the
 * given `space` (atow this is the local user space), and return the new
 * outerspace ibgib.
 */
export function getFn_promptCreateOuterSpaceIbGib(
    common: CommonService,
): (space: IbGibSpaceAny) => Promise<IbGib_V1 | undefined> {
    const lc = `[${getFn_promptCreateOuterSpaceIbGib.name}]`;
    return async (space: IbGibSpaceAny) => {
        try {
            const modal = await common.modalController.create({
                component: OuterspaceModalFormComponent,
            });
            await modal.present();
            let resModal = await modal.onWillDismiss();
            if (resModal.data) {
            const resOuterSpace = <TransformResult<OuterSpaceIbGib>>resModal.data;
            await common.ibgibs.persistTransformResult({resTransform: resOuterSpace, space});
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
 * Creates a function with a single `space` arg. This fn when called shows a
 * modal to mutate a pic ibgib. If the user chooses to save, then the modal will
 * perform the mutation, save the transform result in the given `space`, and
 * return the new pic ibgib.
 */
export function getFn_promptUpdatePicIbGib(
    common: CommonService,
): (space: IbGibSpaceAny, picIbGib: PicIbGib_V1) => Promise<UpdatePicModalResult | undefined> {
    const lc = `[${getFn_promptUpdatePicIbGib.name}]`;
    return async (space: IbGibSpaceAny, picIbGib: PicIbGib_V1) => {
        try {
            const modal = await common.modalController.create({
                component: UpdatePicModalFormComponent,
                componentProps: { picIbGib, space },
            });
            await modal.present();
            let resModal = await modal.onWillDismiss();
            if (resModal.data) {
                const result = <UpdatePicModalResult>resModal.data;
                const [resCreatePic, _resCreateBin] = result;
                const addr = h.getIbGibAddr({ibGib: resCreatePic.newIbGib});
                if (logalot) { console.log(`${lc} updated pic. addr: ${addr}`); }
                return result;
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
 * Creates a function with a single `space` arg. This fn when called shows a
 * modal to mutate a pic ibgib. If the user chooses to save, then the modal will
 * perform the mutation, save the transform result in the given `space`, and
 * return the new pic ibgib.
 */
export function getFn_promptRobbotIbGib(
    common: CommonService,
): (space: IbGibSpaceAny, ibGib: RobbotIbGib_V1) => Promise<RobbotModalResult | undefined> {
    const lc = `[${getFn_promptRobbotIbGib.name}]`;
    return async (space: IbGibSpaceAny, ibGib: RobbotIbGib_V1) => {
        try {
            const modal = await common.modalController.create({
                component: RobbotModalFormComponent,
                componentProps: { ibGib, space },
            });
            await modal.present();
            let resModal = await modal.onWillDismiss();
            if (resModal.data) {
                const result = <RobbotModalResult>resModal.data;
                // const [resCreatePic, _resCreateBin] = result;
                // const addr = h.getIbGibAddr({ibGib: resCreatePic.newIbGib});
                // if (logalot) { console.log(`${lc} updated pic. addr: ${addr}`); }
                return result;
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