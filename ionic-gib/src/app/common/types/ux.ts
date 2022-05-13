/**
 * Types used in UX operations/bindings in various views.
 */

import { IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr, IbGib, IbGibWithDataAndRel8ns, IbGibRel8ns } from 'ts-gib';
import { HashAlgorithm, SaltStrategy, } from 'encrypt-gib';
import * as c from '../constants';
import { TagData_V1 } from './tag';

/**
 * Special types used in ux.
 *
 * ## notes
 *
 *
 */
export type IbgibItemType =
    'pic' | 'comment' | 'link' | 'tag' | 'tags' | 'root' | 'roots' | 'other';

export interface IbgibItem {
    /**
     * Metadata ib value per use case
     */
    ib?: string;
    /**
     * Often the sha256 hash of the other three ibGib fields ib, data, and rel8ns.
     */
    gib?: string;
    /**
     * ib^gib address which uniquely identifies the ibGib.
     */
    addr?: IbGibAddr;
    /**
     * Full record for this item's data. If this is truthy, then most likely the
     * {@link loaded} property is truthy.
     */
    ibGib?: IbGib_V1;
    /**
     * "Parent" ibGib if applicable, i.e. the ibGib where this item is currently "inside"
     * or "at".  in * the URL bar.
     *
     * For example, the URL will contain the address of the top-most context which the
     * other shown ibGibs are "children". Their own views may have children ibGibs
     * as well, who would consider their parent to be their context.
     *
     * NOTE:
     *   In ibGib, anything can be a "container", similar to a folder. A pic can "contain"
     *   other pics, comments can "contain" other comments, etc. But these do this via
     *   different rel8ns, not just an unnamed or "contains" rel8n.
     */
    ibGib_Context?: IbGib_V1;
    /**
     * type of ibGib per use case in this app.
     *
     * In the future, any comment could conceivably be a tag and thus have
     * multiple types.
     */
    type?: IbgibItemType;
    /**
     * hash of the full-sized image.
     */
    binId?: string;
    /**
     * hash of the thumbnail image.
     *
     * not implemented yet.
     */
    binIdThumb?: string;
    /**
     * extension of the image
     */
    binExt?: string;
    /**
     * bin64 pic data
     *
     * ## notes
     *
     * atow this is implemented when loading the pic:
     * ```
     * item.picSrc = `data:image/jpeg;base64,${resGet.ibGibs![0].data!}`;
     * ```
     */
    picSrc?: any;
    /**
     * If it's a pic/binary, then this is the filename.ext
     */
    filenameWithExt?: string;
    // picSrc?: string;
    text?: string;
    isMeta?: boolean;

    selected?: boolean;
    loaded?: boolean;
    timestamp?: string;
    /** If true, then the component is checking for updates. */
    refreshing?: boolean;
    /**
     * If true, then the component is currently syncing with
     * (publishing to) other space(s).
     */
    syncing?: boolean;
}

/**
 * Special ibgib types, used for metadata within a space.
 */
export type SpecialIbGibType =
    "tags" | "roots" | "latest" | "outerspaces" | "secrets" |
    "encryptions" | "autosyncs" | "robbots";
/**
 * Special ibgib types, used for metadata within a space.
 */
export const SpecialIbGibType = {
    /** indexes all tag ibgibs within a space */
    tags: "tags" as SpecialIbGibType,
    /** indexes all root ibgibs within a space */
    roots: "roots" as SpecialIbGibType,
    /**
     * Ephemeral index ibgib that maps a tjp address -> latest local address in
     * a space.
     */
    latest: "latest" as SpecialIbGibType,
    /** indexes all outerspace ibgibs, including sync spaces, within a space */
    outerspaces: "outerspaces" as SpecialIbGibType,
    /** indexes all secret ibgibs within a space */
    secrets: "secrets" as SpecialIbGibType,
    /** indexes all encryption setting ibgibs within a space */
    encryptions: "encryptions" as SpecialIbGibType,
    /** indexes all tjp addresses that automatically sync. */
    autosyncs: "autosyncs" as SpecialIbGibType,
    robbots: "robbots" as SpecialIbGibType,
}

/**
 * There has been a new ibGib that is the latest for a given tjp timeline.
 */
export interface TimelineUpdateInfo {
    tjpAddr?: IbGibAddr;
    latestAddr: IbGibAddr;
    latestIbGib?: IbGib_V1<any>;
}

// /**
//  * Implemented tags. refactoring here to point to refactored interface.
//  */
// export interface TagData extends TagData_V1 { }

export interface RootData {
    text: string;
    icon?: string;
    description?: string;
}

export interface LatestData {
}

export type ActionItemName =
    'comment' | 'camera' | 'file' | 'tag' | 'import' | 'info';
export const ActionItemName = {
    comment: 'comment' as ActionItemName,
    camera: 'camera' as ActionItemName,
    file: 'file' as ActionItemName,
    tag: 'tag' as ActionItemName,
    import: 'import' as ActionItemName,
    info: 'info' as ActionItemName,
}
export interface ActionItem {
    name: ActionItemName;
    type: 'button' | 'inputfile' | 'inputfile-camera';
    text: string;
    icons: string[];
    /** if true, will show the action even if the context ibgib is primitive */
    allowPrimitive?: boolean;
    handler?: (event: MouseEvent) => Promise<void>;
    filepicked?: (event: any) => Promise<void>;
    busy?: boolean;
}

/**
 * Used with tags at the very least.
 */
export interface IconItem {
  title: string;
  icon: string;
}
