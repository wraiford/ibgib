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
import { LinkData_V1, LinkIbGib_V1 } from '../types/link';

const logalot = c.GLOBAL_LOG_A_LOT || false;


/**
 * generates an ib based on the link text.
 *
 * Basically this gets a short substring of the link text and replaces
 * any non alphanumeric characters.
 *
 * @param linkText link text
 * @returns link ib for the given link text
 */
export function getLinkIb(linkText: string): string {
    const lc = `[${getLinkIb.name}]`;
    try {
        if (!linkText) { throw new Error(`linkText required. (E: e131bda0f94e4af1807cda8710e6fb1f)`); }
        let saferText = linkText.replace(/\W/g, '');
        let ibLinkText: string;
        if (saferText.length > c.DEFAULT_LINK_TEXT_IB_SUBSTRING_LENGTH) {
            ibLinkText =
                saferText.substring(0, c.DEFAULT_LINK_TEXT_IB_SUBSTRING_LENGTH);
        } else if (saferText.length > 0) {
            ibLinkText = saferText;
        } else {
            // link text only has characters/nonalphanumerics.
            ibLinkText = c.ONLY_HAS_NON_ALPHANUMERICS;
        }

        return `link ${ibLinkText}`;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * creates a link ibgib, returning the transform result,
 * optionally saving it in a given {@link space}.
 */
export async function createLinkIbGib({
  text,
  saveInSpace,
  space,
}: {
  /**
   * link text
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
}): Promise<TransformResult<LinkIbGib_V1>> {
  const lc = `[${createLinkIbGib.name}]`;

  if (logalot) { console.log(`${lc} starting...`); }
  try {
    if (!text) { throw new Error(`text required (E: bd9a29193ec7416da588fcd10de182ee)`); }

    text = text.trim();

    if (!text) { throw new Error(`text cannot be only whitespace (E: 5fbc0bf22388475da885993a261b01fa)`); }

    const data: LinkData_V1 = { text, textTimestamp: h.getTimestamp() };

    // create an ibgib with the filename and ext
    const opts:any = {
      parentIbGib: factory.primitive({ib: 'link'}),
      ib: getLinkIb(text),
      data,
      dna: true,
      tjp: { uuid: true, timestamp: true },
      nCounter: true,
    };

    // this makes it more difficult to share/sync ibgibs...
    // if (this.addr) { opts.rel8ns = { 'link on': [this.addr] }; }

    if (logalot) { console.log(`${lc} opts: ${h.pretty(opts)}`); }
    const resLinkIbGib = <TransformResult<LinkIbGib_V1>>await factory.firstGen(opts);

    if (saveInSpace) {
      if (!space) { throw new Error(`space required if saveInSpace is truthy (E: 19af4790b5744a72bbdd995219d8f1d4)`); }
      await persistTransformResult({resTransform: resLinkIbGib, space});
    }

    return resLinkIbGib;
  } catch (error) {
    console.error(`${lc} ${error.message}`);
    throw error;
  }
}

export function isLink({
  ibGib,
}: {
  ibGib: IbGib_V1,
}): boolean {
  const lc = `[${isLink.name}]`;
  try {
    if (logalot) { console.log(`${lc} starting...`); }

    if (!ibGib) { throw new Error(`ibGib required (E: 62e4d60452824d9097702bcc9e8466f4)`); }

    const {ib, data, rel8ns} = ibGib;

    // try rel8ns first
    if (!rel8ns) {
      if (logalot) { console.log(`${lc} rel8ns falsy, NOT a link (I: 21c6bebf90a94c11aa0fb5d44501a7d9)`); }
      return false;
    }

    // descends from link^gib
    const ancestors = rel8ns.ancestor || [];
    if (ancestors && ancestors.includes('link^gib')) {
      if (logalot) { console.log(`${lc} descends from link^gib, YES is a link (I: be91be40214248c394065f8dc7a71e3b)`); }
      return true;
    }

    // has binary qualities and ib contains 'link'
    if (!data) {
      if (logalot) { console.log(`${lc} data falsy, NOT a link (I: bee06c5c10ea4c04bc5d7e2244840020)`); }
      return false;
    }
    if (data.text && ib?.includes('link')) {
      if (logalot) { console.log(`${lc} has text, and ib has 'link', YES is a link (I: 306b6e1f54e94acc91622a93770d0c1e)`); }
      return true;
    }

    if (logalot) { console.log(`${lc} reached end, doesn't have link qualities. NOT a link. (I: 43a983d5acf64970aa4310b41fd93e0f)`); }
    return false;
  } catch (error) {
    console.error(`${lc} ${error.message}`);
    throw error;
  } finally {
    if (logalot) { console.log(`${lc} complete.`); }
  }
}