import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export function groupBy<TItem>({
    items,
    keyFn,
}: {
    items: TItem[],
    keyFn: (x: TItem) => string,
}): { [key: string]: TItem[] } {
    const lc = `[${groupBy.name}]`;
    try {
        const result: { [key: string]: TItem[] } = {};
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const key = keyFn(item);
            result[key] = [...(result[key] ?? []), item];
        }
        return result;
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

/**
 * syntactic sugar for `(new Date()).getTime().toString()`
 * @returns ticks string
 */
export function getTimestampInTicks(): string {
    return (new Date()).getTime().toString();
}

/**
 * ## requires
 * at least either `startDate` or one of the intervals to be truthy.
 *
 * ## thanks
 *
 * https://stackoverflow.com/questions/8609261/how-to-determine-one-year-from-now-in-javascript
 *
 * ## tested manually eek
```
console.log(new Date().toUTCString());
// Mon, 14 Feb 2022 14:19:32 GMT
console.log(getExpirationUTCString({years: 1}));
// Tue, 14 Feb 2023 14:19:32 GMT
console.log(getExpirationUTCString({months: 13}));
// Tue, 14 Mar 2023 13:19:32 GMT
console.log(getExpirationUTCString({days: 365}));
// Tue, 14 Feb 2023 14:19:32 GMT
console.log(getExpirationUTCString({days: 45}));
// Thu, 31 Mar 2022 13:19:32 GMT
console.log(getExpirationUTCString({years: 1, days: 45, hours: 25, seconds: 70}));
// Sat, 01 Apr 2023 14:20:42 GMT
console.log(getExpirationUTCString({days: 10, hours: 10, seconds: 10}));
// Fri, 25 Feb 2022 00:19:42 GMT
console.log(getExpirationUTCString({years: 1, days: 45, hours: 25, seconds: 70}));
// Sat, 01 Apr 2023 14:20:42 GMT
console.log(getExpirationUTCString({years: 1, days: 45, hours: 25, seconds: 35}));
// Sat, 01 Apr 2023 14:20:07 GMT
```
 */
export function getExpirationUTCString({
    startDate,
    years,
    months,
    days,
    hours,
    seconds,
}: {
    startDate?: Date,
    years?: number,
    months?: number,
    days?: number,
    hours?: number,
    seconds?: number,
}): string {
    const lc = `[${getExpirationUTCString.name}]`;
    try {
        if (!startDate && !years && !months && !days && !hours && !seconds) {
            // throw here because otherwise we would return an expiration
            // timestamp string with now as the expiration, which doesn't make
            // sense.
            throw new Error(`either startDate or a time interval required. (E: 30248f8b306f443ab036fa8c313c50d8)`);
        }

        startDate = startDate ?? new Date(); // default to now

        /** incoming years/months/days/hours/seconds to add to start date */
        let intervalToAdd: number;
        /** start date + interval in ticks, before assigning to Date obj */
        let newDateTicks: number;

        if (years) {
            intervalToAdd = startDate.getFullYear() + years;
            newDateTicks = startDate.setFullYear(intervalToAdd);
            // call recursively for other interval args (if any)
            return getExpirationUTCString({
                startDate: new Date(newDateTicks),
                months, days, hours, seconds, // all but years (just set)
            })
        } else if (months) {
            intervalToAdd = startDate.getMonth() + months;
            newDateTicks = startDate.setMonth(intervalToAdd);
            // call recursively for other interval args (if any)
            return getExpirationUTCString({
                startDate: new Date(newDateTicks),
                years, days, hours, seconds, // all but months (just set)
            })
        } else if (days) {
            intervalToAdd = startDate.getDate() + days;
            newDateTicks = startDate.setDate(intervalToAdd);
            // call recursively for other interval args (if any)
            return getExpirationUTCString({
                startDate: new Date(newDateTicks),
                years, months, hours, seconds, // all but days (just set)
            })
        } else if (hours) {
            intervalToAdd = startDate.getHours() + hours;
            newDateTicks = startDate.setHours(intervalToAdd);
            // call recursively for other interval args (if any)
            return getExpirationUTCString({
                startDate: new Date(newDateTicks),
                years, months, days, seconds, // all but hours (just set)
            })
        } else if (seconds) {
            intervalToAdd = startDate.getSeconds() + seconds;
            newDateTicks = startDate.setSeconds(intervalToAdd);
            // call recursively for other interval args (if any)
            return getExpirationUTCString({
                startDate: new Date(newDateTicks),
                years, months, days, hours, // all but seconds (just set)
            })
        } else {
            // we've called our function recursively and all intervals args
            // falsy now, so startDate is the output date.
            return startDate.toUTCString();
        }
    } catch (error) {
        console.log(`${lc} ${error.message}`);
        throw error;
    }
}


export function isExpired({
    expirationTimestampUTC,
}: {
    expirationTimestampUTC: string,
}): boolean {
    const lc = `[${isExpired.name}]`;
    try {
        if (!expirationTimestampUTC) { throw new Error(`expirationTimestampUTC required (E: 5eeb1e29f93d64f70c71a8112080a222)`); }

        let expirationDate = new Date(expirationTimestampUTC);
        if (expirationDate.toUTCString() === "Invalid Date") { throw new Error(`invalid expirationTimestampUTC: ${expirationTimestampUTC} (E: 66a1a165bcf1f9336fe78856ab777822)`); }

        const now = new Date();
        const expired = expirationDate < now;
        return expired;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Creates a new array that is a unique set of incoming `arr`.
 * @param arr array to make unique
 * @returns new array with unique items
 */
export function unique<T>(arr: T[]): T[] {
    return Array.from(new Set<T>(arr));
}

// export function getExt(path: string): { filename: string, ext: string } {
//     const pathPieces = path.split('/');
//     const fullFilename = pathPieces[pathPieces.length-1];
//     if (fullFilename.includes('.') && !fullFilename.endsWith('.')) {
//         const lastDotIndex = fullFilename.lastIndexOf('.');
//         return {
//             filename: fullFilename.slice(0, lastDotIndex),
//             ext: fullFilename.slice(lastDotIndex+1),
//         };
//     } else {
//         return {filename: fullFilename, ext: ""}
//     }
// }

export function patchObject({
    obj,
    value,
    path,
    pathDelimiter,
    logalot,
}: {
    obj: Object,
    value: any,
    path: string,
    pathDelimiter?: string,
    logalot?: number | boolean,
}): void {
    const lc = `[${patchObject.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }
        if (!obj) { throw new Error(`obj required (E: 6a9dd32a361476e80b1bf7b91ec50522)`); }
        if (typeof obj !== 'object') { throw new Error(`obj must be type 'object' (E: 66fdc289b32c06492bd95f5d266e6a22)`); }
        if (!path) { throw new Error(`path required (at the very least should be the key in the root obj.) (E: fc779e7794ead8a0b44e5f2e776b0e22)`); }

        /** atow defaults to a forward slash, but could be a dot or who knows */
        pathDelimiter = pathDelimiter || c.DEFAULT_DATA_PATH_DELIMITER;

        /**
         * the target starts off at the object level itself, but we will
         * traverse the given path, updating the targetObj as we go.
         */
        let targetObj = obj;
        const pathPieces = path.split(pathDelimiter).filter(x => !!x);

        /** the last one is the key into the final targetObj with value */
        const key = pathPieces.pop();

        // ensure each intermediate path exists and is an object
        pathPieces.forEach(piece => {
            let currentValue = targetObj[piece];
            if (currentValue) {
                if (typeof currentValue !== 'object') { throw new Error(`invalid path into object. Each step along the path must be typeof === 'object', but typeof targetObj["${piece}"] === ${typeof currentValue}. (value: ${currentValue})  (E: 38cf29c5f624a40b4b56502c2ec39d22)`); }
            } else {
                // if not exist, create it
                targetObj[piece] = {};
            }

            // update targetObj ref
            targetObj = targetObj[piece];
        });

        // reached target depth, so finally set the value
        targetObj[key] = value;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export async function getIdPool({
    n,
}: {
    n: number,
}): Promise<string[]> {
    const lc = `[${getIdPool.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }
        let result: string[] = [];
        for (let i = 0; i < n; i++) {
            const id = await h.getUUID();
            result.push(id.substring(0, 16));
        }
        return result;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export function getSaferSubstring({
    text,
    length,
}: {
    text: string;
    length?: number,
}): string {
    const lc = `[${getSaferSubstring.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 27437e312e5aa621adfebb84e059c822)`); }
        if (!text) { throw new Error(`text required (E: 87e0493613c8b30dfade83e1d2862a22)`); }

        let saferText = text.replace(/\W/g, '');
        let resText: string;
        if (saferText.length > length) {
            resText =
                saferText.substring(0, length);
        } else if (saferText.length > 0) {
            resText = saferText;
        } else {
            // text only has characters/nonalphanumerics ("unsafe").
            resText = c.ONLY_HAS_NON_ALPHANUMERICS;
        }

        return resText;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export function registerCancelModalOnBackButton(modal: any, fnCancel?: () => Promise<void>): void {
    const lc = `[${registerCancelModalOnBackButton.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 6c16ccf6e827d9053a6f256558f72d22)`); }
        const doc = <any>document;

        const doCancel = fnCancel ?? (async () => {
            if (modal) {
                await modal.dismiss(null);
            } else {
                console.warn(`${lc}[doCancel] modal falsy already (W: 87c700dd09d64cdea1721c32680bd653) `);
            }
            if (doc.ibgib.backButton.cancelModal) {
                delete doc.ibgib.backButton.cancelModal;
            } else {
                console.warn(`${lc} (UNEXPECTED) doc.ibgib.backButton.cancelModal falsy? (W: 8a00062e489e4412996be833cbacf7d6)`)
            }
        });
        if (!doc.ibgib) { doc.ibgib = {}; }
        if (!doc.ibgib.backButton) { doc.ibgib.backButton = {} }
        if (!doc.ibgib.backButton.cancelModal) {
            doc.ibgib.backButton.cancelModal = doCancel;
        } else {
            console.warn(`${lc} (UNEXPECTED) doc.ibgib.backButton.cancelModal already exists? (W: 77a39521a5ac4273997db9d97a36052e)`);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export function clearDoCancelModalOnBackButton(): void {
    const lc = `[${clearDoCancelModalOnBackButton.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: ffd55a00e9653d4fc35ae1a36906df22)`); }
        const doc = <any>document;
        if (doc.ibgib?.backButton?.cancelModal) {
            delete doc.ibgib.backButton.cancelModal;
        } else {
            console.warn(`${lc} (UNEXPECTED) doc.ibgib.backButton.cancelModal falsy? (W: 8a00062e489e4412996be833cbacf7d6)`)
        }

    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export function executeDoCancelModalIfNeeded(): boolean {
    const lc = `[${executeDoCancelModalIfNeeded.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: a773ca13acc162bc881310e44fd0a922)`); }
        const doc = <any>document;
        if (doc.ibgib?.backButton?.cancelModal) {
            doc.ibgib.backButton.cancelModal();
            clearDoCancelModalOnBackButton();
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

/**
 * picks a random item from an array
 */
export function pickRandom<T extends any>({ arr }: { arr: T[] }): T {
    if ((arr ?? []).length === 0) { return undefined; /* <<<< returns early */ }
    let randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
}

/**
 * creates a text selection of the entire element's text.
 *
 * ty https://stackoverflow.com/questions/985272/selecting-text-in-an-element-akin-to-highlighting-with-your-mouse
 *
 * @param el element whose text we're selecting
 */
export function selectElementText(el: HTMLElement): void {
    const lc = `[${selectElementText.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 0971989c737e5b846894357f671ab322)`); }
        if ((<any>document.body).createTextRange) {
            const range = (<any>document.body).createTextRange();
            range.moveToElementText(el);
            range.select();
        } else if (window.getSelection) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            const range = document.createRange();
            range.selectNodeContents(el);
            selection.addRange(range);
        } else {
            throw new Error(`(UNEXPECTED) cannot select element text? (E: 163a1dd811b4f4bc22dd6823db859322)`);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}
