import { Plugins } from '@capacitor/core';
import { CommonService } from '../../services/common.service';
const { Modals } = Plugins;

import { IbGib_V1 } from 'ts-gib/dist/V1';
import { ChooseIconModalComponent } from '../choose-icon-modal/choose-icon-modal.component';

import * as c from '../constants';
import { IconItem } from '../types/ux';
import { TagIbGib_V1 } from '../types/tag';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export async function createNewTag(common: CommonService):
    Promise<TagIbGib_V1 | undefined> {
    const lc = `[${createNewTag.name}]`;

    try {
        if (logalot) { console.log(`${lc} starting...`); }

        const text = await chooseTagText();
        if (!text) { return; }
        const icon = await chooseTagIcon(common);
        if (!icon) { return; }
        const description = await chooseTagDescription(text);
        if (!description) { return; }

        const resNewTag = await common.ibgibs.createTagIbGib({text, icon, description});

        return resNewTag.newTagIbGib;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

/**
 * Returns the text/title of the tag.
 * @returns
 */
async function chooseTagText(): Promise<string | undefined> {
    const lc = `[${chooseTagText.name}]`;
    let tagText: string;
    try {
        for (let i = 0; i < 10; i++) {
        let resTagText = await Modals.prompt({
            title: 'Tag Text?',
            message: `What's the tag called?`,
            cancelButtonTitle: 'Cancel',
            okButtonTitle: 'Next...',
        });

        if (resTagText.cancelled || !resTagText.value) {
            if (logalot) { console.log(`${lc} cancelled? no value?`) }
            return;
        }

        if (c.ILLEGAL_TAG_TEXT_CHARS.some(x => resTagText.value.includes(x))) {
            await Modals.alert({
            title: 'Nope...',
            message: `Tag Text can't contain spaces or ${c.ILLEGAL_TAG_TEXT_CHARS}`,
            });
        } else {
            tagText = resTagText.value;
            if (logalot) { console.log(`${lc} tagText: ${tagText}`); }
            break;
        }
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        tagText = undefined;
    }

    return tagText;
}

async function chooseTagIcon(common: CommonService): Promise<string | undefined> {
    const lc = `[${chooseTagIcon.name}]`;
    try {
        const modal = await common.modalController.create({
        component: ChooseIconModalComponent,
        });
        await modal.present();
        let resModal = await modal.onWillDismiss();
        const iconItem: IconItem = resModal.data;
        if (!iconItem) {
        if (logalot) { console.log(`${lc} cancelled.`) }
        return;
        }
        if (logalot) { console.log(`${lc} icon: ${iconItem.icon}`); }
        return iconItem!.icon;
    } catch (error) {
        console.error(`${lc} error: ${error.message}`);
        return undefined;
    }
}

/**
 * Returns the description of the tag.
 * @returns
 */
async function chooseTagDescription(tagText: string): Promise<string | undefined> {
    const lc = `[${chooseTagDescription.name}]`;
    let tagDesc: string;
    try {
        for (let i = 0; i < 10; i++) {
            let resTagDesc = await Modals.prompt({
                title: 'Tag Description?',
                message: `What's the tag description?`,
                inputPlaceholder: tagText,
                cancelButtonTitle: 'Cancel',
                okButtonTitle: 'Create Tag',
            });

            if (resTagDesc.cancelled) {
                if (logalot) { console.log(`${lc} cancelled? no value?`) }
                return;
            }

            if (c.ILLEGAL_TAG_DESC_CHARS.some(x => resTagDesc.value.includes(x))) {
                await Modals.alert({
                    title: 'Nope...',
                    message: `Description can't contain ${c.ILLEGAL_TAG_DESC_CHARS}`,
                });
            } else {
                tagDesc = resTagDesc.value || `${tagText} is cool tag.`;
                if (logalot) { console.log(`${lc} tagText: ${tagDesc}`); }
                break;
            }
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        tagDesc = undefined;
    }

    return tagDesc;
}
