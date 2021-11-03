import { ExpirationInfo } from "./types";
import { DEFAULT_EXPIRATION_FORMAT } from "./constants";

/**
 * Gets the expiration string from giving info.
 *
 * Thanks https://www.unitjuggler.com
 */
export function generateExpirationString({
    ms, seconds, minutes, hours, days, weeks, months, years,
    format,
}: ExpirationInfo): string {
    format = format || DEFAULT_EXPIRATION_FORMAT;
    const lc = `[${generateExpirationString.name}(${format})]`;
    if (!ms && !seconds && !minutes && !hours && !days && !years) { throw new Error(`${lc} we need some time to add for the expiration...`); }
    if (format === 'UTC') {
        let msInFuture =
            (ms || 0) +
            (seconds || 0 * 1000) +
            (minutes || 0 * 60_000) +
            (hours || 0 * 3_600_000) +
            (days || 0 * 86_400_000) +
            (weeks || 0 * 604_800_000) +
            (months || 0 * 2592000000) +
            (years || 0 * 31536000000);
        let msNow = Date.now();

        const future = new Date(msNow + msInFuture);
        return future.toUTCString();
    } else {
        throw new Error(`${lc}`)
    }
}