import { IbGib_V1 } from 'ts-gib/dist/V1';
import { Ib, Gib, IbGibAddr } from 'ts-gib';

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
    ibGib?: IbGib_V1;
    type?: 'pic' | 'comment' | 'link' | 'tag' | 'other';
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
}

/**
 * Shape of a tag^gib data.
 */
export interface TagData {
    tagText: string;
    icon: string;
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

