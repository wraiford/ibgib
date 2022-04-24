import * as c from '../constants';
import { DynamicForm, FormItemInfo } from "../../ibgib-forms/types/form-items";
import { getRegExp } from "./utils";
import { WitnessData_V1 } from '../types/witness';

/**
 * Fluent-style builder helper class.
 *
 * I'm making this to share common fields' settings among witness classes.
 *
 * Descend from this class for sharing other commonalities.
 */
export class WitnessFormBuilder {
    protected items: FormItemInfo[] = [];
    protected what: string;

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

    /**
     * Empty function simply for more natural looking fluent syntax.
     *
     * You can override this for custom form builders that descend from this
     * class.
     *
     * @returns this
     */
    with<T extends WitnessFormBuilder>(): T { return <T><any>this; }
    and<T extends WitnessFormBuilder>(): T { return <T><any>this; }

    name({
        of: value,
        required = true,
    }: {
        of: string,
        required?: boolean,
    }): WitnessFormBuilder {
        this.items.push({
            // witness.data.name
            name: "name",
            description: `What to call this ${this.what}. Doesn't have to be unique, no spaces, up to 32 alphanumerics/underscores in length.`,
            label: "Name",
            placeholder: `e.g. "bob_the_cool"`,
            regexp: getRegExp({min: 1, max: 32, noSpaces: true}),
            regexpSource: getRegExp({min: 1, max: 32, noSpaces: true}).source,
            required,
            dataType: 'text',
            value,
        });
        return this;
    }

    description({
        of: value,
        required,
    }: {
        of: string,
        required?: boolean,
    }): WitnessFormBuilder {
        this.items.push({
            // witness.data.description
            name: "description",
            description: `Description/notes for this ${this.what}. Only letters, underscores and ${c.SAFE_SPECIAL_CHARS}`,
            label: "Description",
            placeholder: `Describe these ${this.what} settings here...`,
            regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
            regexpSource: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}).source,
            dataType: 'textarea',
            required,
            value,
        });
        return this;
    }

    classname({
        of,
        required,
    }: {
        of: string,
        required?: boolean,
    }): WitnessFormBuilder {
        this.items.push({
            // witness.data.classname
            name: "classname",
            description: `Technical setting that is the name of the ${this.what}'s class in computer code.`,
            label: "Classname",
            regexp: getRegExp({min: 1, max: 128, noSpaces: true}),
            regexpSource: getRegExp({min: 1, max: 128, noSpaces: true}).source,
            required: true,
            dataType: 'text',
            value: of,
            readonly: true
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
        this.items.push({
            // witness.data.allowPrimitiveArgs
            name: "allowPrimitiveArgs",
            description: `Technical setting on if this ${this.what} accepts primitive incoming ibgibs`,
            label: "Allow Primitive Args",
            required: true,
            dataType: 'toggle',
            value: of ?? true,
            readonly: true,
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
        this.items.push({
            // witness.data.catchAllErrors
            name: "catchAllErrors",
            description: `Technical setting on what the ${this.what} does when it encounters an internal error.`,
            label: "Catch All Errors",
            required: true,
            dataType: 'toggle',
            value: of ?? true,
            readonly: true,
        });
        return this;
    }


    persistOptsAndResultIbGibs({
        of,
        required,
    }: {
        of: boolean,
        required?: boolean,
    }): WitnessFormBuilder {
        this.items.push({
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
        this.items.push({
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
        this.items.push({
            // witness.data.uuid
            name: "uuid",
            description: `Unique(ish) id of the ${this.what}.`,
            label: label ?? "ID",
            dataType: 'text',
            value: of,
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
        this.items.push({
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
        debugger;
        return this;
    }

    /**
     * To pass in a completely customized item info.
     *
     * @returns `this` for fluent builder
     */
    customItem(item: FormItemInfo): WitnessFormBuilder {
        this.items.push(item);
        return this;
    }


    outputChildren(): FormItemInfo[] {
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
            children: this.items,
        };
    }
}
