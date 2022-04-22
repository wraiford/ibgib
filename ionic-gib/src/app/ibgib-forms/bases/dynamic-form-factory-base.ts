import { DynamicForm, FormItemInfo } from "../types/form-items";

import * as c from '../dynamic-form-constants';
import { patchObject } from "../../common/helper/utils";
import { TransformResult } from "ts-gib/dist/types";
import { IbGib_V1 } from "ts-gib/dist/V1";

const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * The idea is that any model can be injected via this factory provider.
 *
 * So when you create a witness that you want to be able to instantiate via
 * just metadata, you also provide an accompanying factory that knows
 * how to map from a
 *   * witness(model) -> form data (to generate dynamic forms)
 *   * form data -> witness (to instantiate witness from data)
 */
export abstract class DynamicFormFactoryBase<TWitness extends IbGib_V1> {
    protected lc: string = `[${DynamicFormFactoryBase.name}]`;
    /**
     * override this with the name that will be used with the injection token.
     */
    abstract getInjectionName(): string;
    /**
     * override this with something that maps from the ibgib/model to the form infos.
     */
    abstract witnessToForm({witness}: {witness: TWitness}): Promise<DynamicForm>;
    /**
     * override this with specific behavior that will reify an instance based on
     * the given {@link form}.
     */
    abstract formToWitness({form}: {form: DynamicForm}): Promise<TWitness>;
    abstract newUp(): Promise<TransformResult<TWitness>>;

    /**
     * iterates through the given {@link items}.
     *
     * If the item has children, it is considered a grouping (i.e. FormGroup or
     * FormArray) and this function is called recursively with the
     * {@link contextPath} adjusted per the {@link pathDelimiter} and
     * `item.name`.
     *
     * If the item does not have children, it's considered to be a setting at
     * the current path level and it's value is assigned per its `item.name` as
     * the key.
     */
    patchDataFromItems({
        data,
        contextPath,
        items,
        pathDelimiter,
    }: {
        /**
         * ibgib.data object that we are patching/setting from the form items.
         */
        data: any,
        /**
         * source items whose values we are patching the {@link data} with.
         */
        items: FormItemInfo[],
        /**
         * Separates sections of pathing into the data object.
         *
         * @default @see {@link c.DEFAULT_DATA_PATH_DELIMITER}
         */
        pathDelimiter: string,
        /**
         * we're patching the data object as follows:
         *
         * data[contextPath/item.name] = value
         *
         * where the '/' is the data path delimiter.
         *
         * So if the incoming items are nested deeper, this will look like
         *
         * data['mysetting/subsetting/color'] = "red"
         *
         * @see {@link pathDelimiter}
         * @see {@link c.DEFAULT_DATA_PATH_DELIMITER}
         */
        contextPath?: string,
    }): void {
        const lc = `${this.lc}[${this.patchDataFromItems.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            if (!pathDelimiter) { throw new Error(`pathDelimiter required (E: 958d472a15fb71e45cd2925883f2ec22)`); }

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const path = contextPath ?
                    contextPath + pathDelimiter + item.name :
                    item.name;
                if (!item.children) {
                    // it's a property (FormControl, not FormGroup/Array)
                    patchObject({
                        obj: data,
                        value: item.value,
                        path,
                        logalot,
                        pathDelimiter,
                    });
                } else if (item.children.length > 0) {
                    // it's a group, so call this function recursively
                    this.patchDataFromItems({
                        data,
                        contextPath: path,
                        items: item.children,
                        pathDelimiter,
                    });
                } else {
                    throw new Error(`invalid item. children is truthy but with a length of 0. children should either be falsy or have at least one child. (E: ee2765e0b920477f919fcb09e9d951b4)`);
                }
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

}