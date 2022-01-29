import { IbGibAddr } from "ts-gib";
import { IbGib_V1 } from "ts-gib/dist/V1";
import { IbGibSpaceAny } from "../spaces/space-base-v1";

export interface FileResult {
  success?: boolean;
  /**
   * If errored, this will contain the errorMsg.
   */
  errorMsg?: string;
}
/**
 * Options for retrieving data from the file system.
 */
export interface GetIbGibOpts {
  /**
   * If getting ibGib object, this is its address.
   */
  addr?: IbGibAddr;
  /**
   * If truthy, will look in the meta subpath first, then the regular if not found.
   */
  isMeta?: boolean;
  /**
   * Are we looking for a DNA ibgib?
   */
  isDna?: boolean;
  /**
   * space from which to get the ibgib
   *
   * @default localUserSpace
   */
  space?: IbGibSpaceAny,
}
/**
 * Result for retrieving an ibGib from the file system.
 */
export interface GetIbGibResult extends FileResult {
  /**
   * ibGibs if retrieving a "regular" ibGib.
   *
   * This is used when you're not getting a pic, e.g.
   */
  ibGibs?: IbGib_V1[];
  /**
   * This is used when you're getting a pic's binary content.
   */
  // binData?: any;
}

export interface PutIbGibOpts {
  /**
   * ibGib to put.
   *
   * If you only want to do just one, use this param. Otherwise, use the
   * `ibGibs` array param.
   */
  ibGib?: IbGib_V1;
  /**
   * ibGibs to put in the space.
   *
   * If you want to put more than one ibGib, use this param. If you only
   * want to put a single ibGib, you could also use the `ibGib` param.
   */
  ibGibs?: IbGib_V1[];
  /**
   * if true, will store this data in the bin folder with its hash.
   */
  // binData?: string;
  /**
   * If true, will store in a different folder.
   */
  isDna?: boolean;
  /**
   * extension to store the bindata with.
   */
  // binExt?: string;
  /**
   * If true, will store with metas.
   */
  isMeta?: boolean;
  /**
   * If true, will replace an existing ibGib file
   */
  force?: boolean;
  /**
   * space into which we shall put the ibgib.
   *
   * @default localCurrentSpace
   */
  space?: IbGibSpaceAny,
}

/**
 * Result for putting ibgib.
 */
export interface PutIbGibResult extends FileResult {
  binHash?: string;
}

export interface DeleteIbGibOpts extends GetIbGibOpts { }
export interface DeleteIbGibResult extends FileResult { }
