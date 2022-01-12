export function groupBy<T>({
    items,
    keyFn,
}: {
    items: T[],
    keyFn: (x: T) => number,
}): { [key: number]: T[] } {
    const lc = `[${groupBy.name}]`;
    try {
        const result: {[key: number]: T[]} = {};
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const key = keyFn(item);
            result[key] = [...result[key], item];
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
