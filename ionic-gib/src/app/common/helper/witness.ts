import * as c from '../constants';
import { DynamicForm, FormItemInfo } from "../../ibgib-forms/types/form-items";
import { getRegExp } from "./utils";
import { WitnessData_V1 } from '../types/witness';
import { DynamicFormBuilder } from './form';

const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * Fluent-style builder helper class.
 *
 * I'm making this to share common fields' settings among witness classes.
 *
 * Descend from this class for sharing other commonalities.
 */
export class WitnessFormBuilder extends DynamicFormBuilder {
    protected lc: string = `[${WitnessFormBuilder.name}]`;

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

}
