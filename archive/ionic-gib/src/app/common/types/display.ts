import { IbGibData_V1, IbGibRel8ns_V1, IbGib_V1 } from "ts-gib/dist/V1";

export type SortStrategy = 'data_path';
export const SortStrategy = {
    /**
     * sorts targeting a specific path in the ibgib.data object.
     *
     * So if you want to sort by comment text, then the path will
     * be `'text'`. If you want to sort by date, then `'timestamp'`.
     */
    data_path: "data_path" as SortStrategy,
}

export type SortDirection = 'ascending' | 'descending' | 'forward' | 'reverse';
export const SortDirection =
{
    /**
     * In an ordered list, we will sort starting with the least and going to the
     * greatest.
     */
    ascending: 'ascending' as SortDirection,
    /**
     * In an ordered list, we will sort starting with the highest/greatest and
     * go to the lowest/least.
     */
    descending: 'descending' as SortDirection,
    /**
     * Often the same as ascending, but depends on context.
     *
     * For example, there may be a non-ascending existing order and we are
     * speaking relative to this.
     */
    forward: 'forward' as SortDirection,
    /**
     * Often the same as descending, but depends on context.
     *
     * For example, there may be a non-ordered existing list and we are speaking
     * relative to this.
     */
    reverse: 'reverse' as SortDirection,
}
export type FilterType = 'keyword' | 'time';

export interface FilterInfo {
    filterType: FilterType;
    /**
     * if provided, uses custom data path(s) into the ibgib.data object to
     * filter against.
     *
     * If not provided, this defaults to whatever makes sense for the ibgib. For
     * example, a comment or link ibgib will default to the 'text' path. A pic
     * will look in filename, extension, and maybe some others that I haven't
     * implemented yet.
     */
    dataPaths?: string[];

    /**
     * self explanatory
     */
    caseSensitive?: boolean;
    hasAllKeywords?: string[];
    hasNoneKeywords?: string[];
    hasAnyKeywords?: string[];

    /**
     * If filterType is 'time', then this is the earliest date/time.
     * If it's 'keyword', then this is lower bound by character. (may not implement at first)
     */
    startBound?: string;
    endBound?: string;
    startBoundInclusive?: boolean;
    endBoundInclusive?: boolean;
}

export interface SortInfo {
    /**
     * How we're approaching the sort.
     *
     * ATOW this is just 'data_path'
     */
    strategy: SortStrategy;
    /**
     * If supplied, then this will dictate how the sort ordered.
     */
    direction?: SortDirection;
    /**
     * If the `strategy` is 'data_path', then this is the value of
     * the data_path.
     *
     * @example 'text' if sorting by comment text
     */
    value: string;
}

export interface DisplayData_V1 extends IbGibData_V1 {
    ticks: string;
    filters?: FilterInfo[];
    sorts?: SortInfo[];
}
export interface DisplayRel8ns_V1 extends IbGibRel8ns_V1 {

}

export interface DisplayIbGib_V1 extends IbGib_V1<DisplayData_V1, DisplayRel8ns_V1> {

}

export const DISPLAY_ATOM = 'display';
