import * as h from 'ts-gib/dist/helper';
import { Factory_V1 as factory, IbGibRel8ns_V1, IBGIB_DELIMITER, IbGib_V1 } from 'ts-gib/dist/V1';
import { getGib } from 'ts-gib/dist/V1/transforms/transform-helper';
// import { hash, getIbGibAddr, getTimestamp, pretty } from 'ts-gib/dist/helper';

import * as c from '../constants';
import { IconItem } from '../types/ux';
import { CommonService } from '../../services/common.service';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';
import { BinIbGib_V1 } from '../types/bin';
import { persistTransformResult, putInSpace } from './space';
import { TransformResult } from 'ts-gib';
import { CommentData_V1, CommentIbGib_V1 } from '../types/comment';

const logalot = c.GLOBAL_LOG_A_LOT || false;


/**
 * generates an ib based on the comment text.
 *
 * Basically this gets a short substring of the comment text and replaces
 * any non alphanumeric characters.
 *
 * @param commentText comment text
 * @returns comment ib for the given comment text
 */
export function getCommentIb(commentText: string): string {
    const lc = `[${getCommentIb.name}]`;
    try {
        if (!commentText) { throw new Error(`commentText required. (E: 22fdfd0aa0524a18b63a9405b312c99e)`); }
        let saferText = commentText.replace(/\W/g, '');
        let ibCommentText: string;
        if (saferText.length > c.DEFAULT_COMMENT_TEXT_IB_SUBSTRING_LENGTH) {
            ibCommentText =
                saferText.substring(0, c.DEFAULT_COMMENT_TEXT_IB_SUBSTRING_LENGTH);
        } else if (saferText.length > 0) {
            ibCommentText = saferText;
        } else {
            // comment text only has characters/nonalphanumerics.
            ibCommentText = c.ONLY_HAS_NON_ALPHANUMERICS;
        }

        return `comment ${ibCommentText}`;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * creates a comment ibgib, returning the transform result,
 * optionally saving it in a given {@link space}.
 */
export async function createCommentIbGib({
  text,
  saveInSpace,
  space,
}: {
  /**
   * comment text
   */
  text: string,
  /**
   * If true, will save the ibgibs created in the given {@link space}.
   */
  saveInSpace?: boolean,
  /**
   * If {@link saveInSpace}, all ibgibs created in this function will be stored in
   * this space.
   */
  space?: IbGibSpaceAny,
}): Promise<TransformResult<CommentIbGib_V1>> {
  const lc = `[${createCommentIbGib.name}]`;

  if (logalot) { console.log(`${lc} starting...`); }
  try {
    if (!text) { throw new Error(`text required (E: 3e3d0f555e1a83771a6548eb10943522)`); }

    text = text.trim();

    if (!text) { throw new Error(`text cannot be only whitespace (E: d6db3537b9834294836aeb70987c908e)`); }

    const data: CommentData_V1 = { text, textTimestamp: h.getTimestamp() };

    // create an ibgib with the filename and ext
    const opts:any = {
      parentIbGib: factory.primitive({ib: 'comment'}),
      ib: getCommentIb(text),
      data,
      dna: true,
      tjp: { uuid: true, timestamp: true },
      nCounter: true,
    };

    // this makes it more difficult to share/sync ibgibs...
    // if (this.addr) { opts.rel8ns = { 'comment on': [this.addr] }; }

    if (logalot) { console.log(`${lc} opts: ${h.pretty(opts)}`); }
    const resCommentIbGib = <TransformResult<CommentIbGib_V1>>await factory.firstGen(opts);

    if (saveInSpace) {
      if (!space) { throw new Error(`space required if saveInSpace is truthy (E: 40f69f22f21b4279a83cb746cb4b0da1)`); }
      await persistTransformResult({resTransform: resCommentIbGib, space});
    }

    return resCommentIbGib;
  } catch (error) {
    console.error(`${lc} ${error.message}`);
    throw error;
  }
}

export function isComment({
  ibGib,
}: {
  ibGib: IbGib_V1,
}): boolean {
  const lc = `[${isComment.name}]`;
  try {
    if (logalot) { console.log(`${lc} starting...`); }

    if (!ibGib) { throw new Error(`ibGib required (E: f204dac30ae548b0a049f1c4d8048502)`); }

    const {ib, data, rel8ns} = ibGib;

    // try rel8ns first
    if (!rel8ns) {
      if (logalot) { console.log(`${lc} rel8ns falsy, NOT a comment (I: 6e145eb2d0ba46629746215a3b655fd5)`); }
      return false;
    }

    // descends from comment^gib
    const ancestors = rel8ns.ancestor || [];
    if (ancestors && ancestors.includes('comment^gib')) {
      if (logalot) { console.log(`${lc} descends from comment^gib, YES is a comment (I: 1a8557780e2e4c1580d5a2585567762b)`); }
      return true;
    }

    // has binary qualities and ib contains 'comment'
    if (!data) {
      if (logalot) { console.log(`${lc} data falsy, NOT a comment (I: 30b20ff6785f432f98489f11efe24299)`); }
      return false;
    }
    if (data.text && ib?.includes('comment')) {
      if (logalot) { console.log(`${lc} has text, and ib has 'comment', YES is a comment (I: 3aa03bcd639d4ec7abd7ead917eda3d8)`); }
      return true;
    }

    if (logalot) { console.log(`${lc} reached end, doesn't have comment qualities. NOT a comment. (I: cfa529f27f9d490abd476c924ef77087)`); }
    return false;
  } catch (error) {
    console.error(`${lc} ${error.message}`);
    throw error;
  } finally {
    if (logalot) { console.log(`${lc} complete.`); }
  }
}