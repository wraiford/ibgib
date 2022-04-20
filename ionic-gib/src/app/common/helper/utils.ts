import * as c from '../constants';

export function groupBy<TItem>({
    items,
    keyFn,
}: {
    items: TItem[],
    keyFn: (x: TItem) => string,
}): { [key: string]: TItem[] } {
    const lc = `[${groupBy.name}]`;
    try {
        const result: {[key: string]: TItem[]} = {};
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const key = keyFn(item);
            result[key] = [...(result[key] ?? []), item];
        }
        return result;
    } catch (error) {
        debugger;
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
                if (typeof currentValue !== 'object') {throw new Error(`invalid path into object. Each step along the path must be typeof === 'object', but typeof targetObj["${piece}"] === ${typeof currentValue}. (value: ${currentValue})  (E: 38cf29c5f624a40b4b56502c2ec39d22)`); }
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