/**
 * Types used in UX operations/bindings in various views.
 */

import { IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr, IbGib, IbGibWithDataAndRel8ns, IbGibRel8ns } from 'ts-gib';
import { HashAlgorithm, SaltStrategy, } from 'encrypt-gib';
import * as c from '../constants';

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
    picSrc?: any;
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

export type SpecialIbGibType =
    "tags" | "roots" | "latest" | "outerspaces" | "secrets" |
    "encryptions";

/**
 * There has been a new ibGib that is the latest for a given tjp timeline.
 */
export interface LatestEventInfo {
    tjpAddr: IbGibAddr;
    latestAddr: IbGibAddr;
    latestIbGib?: IbGib_V1<any>;
}

export interface FieldInfo {
  /**
   * Property name
   */
  name: string;
  /**
   * Label for the property on a form
   */
  label?: string;
  /**
   * Optional description for the property. Can bind title/hover/tooltip to this.
   */
  description?: string;
  /**
   * Placeholder when entering the field's data.
   */
  placeholder?: string;
  /**
   * Validation regular expression
   */
  regexp?: RegExp;
  /**
   * Only required if wanting to do validation beyond regexp/required.
   */
  fnValid?: (value: string) => boolean;
  /**
   * Error message that shows up **when using `fnValid`**.
   * Other messages show for regexp/required.
   */
  fnErrorMsg?: string;
  /**
   * If the field is required.
   */
  required?: boolean;
}

/**
 * Shape of a tag^gib data.
 */
export interface TagData {
    text: string;
    icon?: string;
    description?: string;
}

export interface RootData {
    text: string;
    icon?: string;
    description?: string;
}

export interface LatestData {
}

export interface PicData {
    binHash: string;
    binHashThumb?: string;
    ext: string;
    filename: string;
    timestamp: string;
}

export interface CommentData {
    text: string;
    textTimestamp?: string;
    timestamp?: string;
}

export interface ActionItem {
    type: 'button' | 'inputfile';
    text: string;
    icon: string;
    handler?: (event: MouseEvent) => Promise<void>;
    filepicked?: (event: any) => Promise<void>;
}