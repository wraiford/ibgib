import * as c from '../constants';
import { DynamicForm, FormItemInfo } from "../../ibgib-forms/types/form-items";
import { getRegExp } from "./utils";
import { WitnessData_V1 } from '../types/witness';

const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * Fluent-style builder helper class.
 *
 * I'm making this to share common fields' settings among witness classes.
 *
 * Descend from this class for sharing other commonalities.
 */
export class WitnessFormBuilder {
    protected lc: string = `[${WitnessFormBuilder.name}]`;
    private items: FormItemInfo[] = [];
    protected what: string;
    /**
     * pool of uuids pre-calculated to be passed in to the builder. if this is
     * falsy, then it will use a Math.random() based approach.
     */
    protected idPool: string[] = [];

    /**
     * hacky wrapper for this.idPool.pop()
     */
    protected getNewId(): string {
        const lc = `${this.lc}[${this.getNewId.name}]`;
        if (this.idPool?.length > 0) {
            return this.idPool.pop();
        } else {
            // weak implementation...
            let resultArray: string[] = [];
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const charLength = chars.length;
            for (let i = 0; i < 32; i++) {
                let charIndex = Math.floor(Math.random() * charLength);
                resultArray.push(chars[charIndex]);
            }
            let id = resultArray.join('');
            if (logalot) { console.log(`${lc} id: ${id} (I: c6591ffee6d5bbea79ed19cfa6630422)`); }
            return id;
        }
    }

    /**
     * Start fluent calls with this.
     */
    forA({
        what,
    }: {
        /**
         * Common name for the reified concrete type of the witness.
         *
         * Used in things like placeholders, descriptions, etc.
         *
         * @example "robbot" or "space"
         */
        what: string,
    }): WitnessFormBuilder {
        this.what = what || 'thingy';
        return this;
    }

    protected addItem(item: FormItemInfo) {
        if (!item.uuid) { item.uuid = this.getNewId(); }
        this.items.push(item);
    }

    /**
     * Empty function simply for more natural looking fluent syntax.
     *
     * You can override this for custom form builders that descend from this
     * class.
     *
     * @returns this
     */
    with<T extends WitnessFormBuilder>({
        idPool,
    }: {
        /**
         * pre-built pool of uuids to draw from. this builder
         * will mutate this array.
         */
        idPool?: string[],
    }): T {
        if (idPool) { this.idPool = idPool; }
        return <T><any>this;
    }
    and<T extends WitnessFormBuilder>(): T { return <T><any>this; }

    name<T extends WitnessFormBuilder>({
        of: value,
        required = true,
    }: {
        of: string,
        required?: boolean,
    }): T {
        this.addItem({
            // witness.data.name
            name: "name",
            description: `What to call this ${this.what}. Doesn't have to be unique, no spaces, up to 32 alphanumerics/underscores in length.`,
            label: "Name",
            placeholder: `e.g. "bob_the_cool"`,
            regexp: getRegExp({min: 1, max: 32, noSpaces: true}),
            regexpErrorMsg: '1 to 32 characters, no spaces, underscores allowed.',
            required,
            dataType: 'text',
            value,
        });
        return <T><any>this;
    }

    description({
        of: value,
        required,
    }: {
        of: string,
        required?: boolean,
    }): WitnessFormBuilder {
        this.addItem({
            // witness.data.description
            name: "description",
            description: `Description/notes for this ${this.what}.`,
            label: "Description",
            placeholder: `Describe these ${this.what} settings here...`,
            regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
            regexpErrorMsg: `0 to 155 alphanumerics or any of ${c.SAFE_SPECIAL_CHARS}`,
            // regexpSource: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}).source,
            dataType: 'textarea',
            required,
            defaultValue: 'testing ddefault for desc',
            value,
        });
        return this;
    }

    classname({
        of,
        required = true,
    }: {
        of: string,
        required?: boolean,
    }): WitnessFormBuilder {
        this.addItem({
            // witness.data.classname
            name: "classname",
            description: `Technical setting that is the name of the ${this.what}'s class in computer code.`,
            label: "Classname",
            regexp: getRegExp({min: 1, max: 128, noSpaces: true}),
            regexpErrorMsg: `1 to 128 alphanumerics or underscores without spaces`,
            // regexpSource: getRegExp({min: 1, max: 128, noSpaces: true}).source,
            dataType: 'text',
            value: of,
            readonly: true,
            required,
        });
        return this;
    }

    allowPrimitiveArgs({
        of,
        required = true,
    }: {
        of: boolean,
        required?: boolean,
    }): WitnessFormBuilder {
        this.addItem({
            // witness.data.allowPrimitiveArgs
            name: "allowPrimitiveArgs",
            description: `Technical setting on if this ${this.what} accepts primitive incoming ibgibs`,
            label: "Allow Primitive Args",
            dataType: 'toggle',
            value: of ?? true,
            readonly: true,
            required,
        });
        return this;
    }

    catchAllErrors({
        of,
        required = true,
    }: {
        of: boolean,
        required?: boolean,
    }): WitnessFormBuilder {
        this.addItem({
            // witness.data.catchAllErrors
            name: "catchAllErrors",
            description: `Technical setting on what the ${this.what} does when it encounters an internal error.`,
            label: "Catch All Errors",
            dataType: 'toggle',
            value: of ?? true,
            readonly: true,
            required,
        });
        return this;
    }

    persistOptsAndResultIbGibs({
        of,
        required = true,
    }: {
        of: boolean,
        required?: boolean,
    }): WitnessFormBuilder {
        this.addItem({
            // witness.data.persistOptsAndResultIbGibs
            name: "persistOptsAndResultIbGibs",
            description: `Technical setting on if the ${this.what} maintains an audit trail of all of its inputs/outputs.`,
            label: "Persist Opts and Result IbGibs",
            dataType: 'toggle',
            value: of ?? false,
            readonly: true,
            required,
        });
        return this;
    }

    trace({
        of,
        required,
    }: {
        of: boolean,
        required?: boolean,
    }): WitnessFormBuilder {
        this.addItem({
            // witness.data.trace
            name: "trace",
            description: `Technical setting on if the ${this.what}'s activity should be traced (logged to the console).`,
            label: "Trace",
            dataType: 'toggle',
            value: of ?? false,
            readonly: true,
            required,
        });
        return this;
    }

    uuid({
        of,
        label,
        required,
    }: {
        of: string,
        label?: string,
        required?: boolean,
    }): WitnessFormBuilder {
        this.addItem({
            // witness.data.uuid
            name: "uuid",
            description: `Unique(ish) id of the ${this.what}.`,
            label: label ?? "ID",
            dataType: 'text',
            value: of,
            regexp: c.UUID_REGEXP,
            regexpErrorMsg: '1 to 256 alphanumerics, underscores, dots, hyphens allowed.',
            readonly: true,
            required,
        });
        return this;
    }

    version({
        of,
        required,
    }: {
        of: string,
        required?: boolean,
    }): WitnessFormBuilder {
        this.addItem({
            // witness.data.version
            name: "version",
            description: `Technical setting indicating the version of the ${this.what}.`,
            label: "Version",
            dataType: 'text',
            value: of,
            readonly: true,
            required,
        });
        return this;
    }

    /**
     * Includes common witness fields.
     *
     * All common fields default to `true`, so set any you want to skip to
     * `false`.
     *
     * @returns `this` for fluent builder
     */
    commonWitnessFields({
        data,
        allowPrimitiveArgs = true,
        catchAllErrors = true,
        persistOptsAndResultIbGibs = true,
        trace = true,
        version = true,
    }: {
        data: WitnessData_V1,
        allowPrimitiveArgs?: boolean,
        catchAllErrors?: boolean,
        persistOptsAndResultIbGibs?: boolean,
        trace?: boolean,
        version?: boolean,
    }): WitnessFormBuilder {
        if (allowPrimitiveArgs) { this.allowPrimitiveArgs({of: data.allowPrimitiveArgs}); }
        if (catchAllErrors) { this.catchAllErrors({of: data.catchAllErrors}); }
        if (persistOptsAndResultIbGibs) { this.persistOptsAndResultIbGibs({of: data.persistOptsAndResultIbGibs}); }
        if (trace) { this.trace({of: data.trace}); }
        if (version) { this.version({of: data.version}); }
        return this;
    }

    /**
     * To pass in a completely customized item info.
     *
     * @returns `this` for fluent builder
     */
    customItem(item: FormItemInfo): WitnessFormBuilder {
        this.addItem(item);
        return this;
    }


    outputItems(): FormItemInfo[] {
        return this.items;
    }

    outputForm({
        formName,
        label,
    }: {
        formName: string,
        label?: string,
    }): DynamicForm {
        return <DynamicForm>{
            name: formName,
            description: this.description ?? `This is a form for a ${this.what}`,
            label: label ?? this.what,
            items: this.items,
        };
    }
}
