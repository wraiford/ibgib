import * as h from 'ts-gib/dist/helper';
import { Factory_V1 as factory, IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';
import { getGib } from 'ts-gib/dist/V1/transforms/transform-helper';

import * as c from '../constants';
import { IconItem } from '../types/ux';
import { PicData_V1, PicIbGib_V1 } from '../types/pic';
import {
  getBinIb, getCommentIb, getDependencyGraph,
  getFnAlert, getFnPrompt,
  getFromSpace, validateIbGibAddr,
} from '../helper';
import { CommonService } from '../../services/common.service';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';

const logalot = c.GLOBAL_LOG_A_LOT || false;


  /**
   * shared pic code between camera and loading image via picking a file.
   */
  export async function createAndAddPicIbGib({
    imageBase64,
    binHash,
    filename,
    ext,
    common,
    space,
  }: {
    imageBase64: string,
    binHash: string,
    filename?: string,
    ext?: string,
    common: CommonService,
    space?: IbGibSpaceAny,
  }): Promise<PicIbGib_V1> {
    const lc = `[${createAndAddPicIbGib.name}]`;

    if (logalot) { console.log(`${lc} starting...`); }
    try {
      const binIb = getBinIb({binHash, binExt: ext});
      const binIbGib: IbGib_V1 = { ib: binIb, data: <any>imageBase64 };

      const binGib = await getGib({ibGib: binIbGib, hasTjp: false});
      binIbGib.gib = binGib;
      const binAddr = h.getIbGibAddr({ibGib: binIbGib});

      if (logalot) { console.log(`${lc} saving initial ibgib pic with data = imageBase64...`); }
      const resSaveBin = await common.ibgibs.put({ibGib: binIbGib, space});
      if (!resSaveBin.success) { throw new Error(resSaveBin.errorMsg || 'error saving pic'); }
      if (logalot) { console.log(`${lc} saving initial ibgib pic with data = imageBase64 complete.`); }

      // todo: do thumbnail also

      // NOTE: This is not the same filename that is saved in the bin folder!
      // This is for when the picture is downloaded outside of the ibGib system
      // or for display purposes.
      const timestamp = (new Date).toUTCString();
      filename = filename || timestamp
        .replace(':', '-')
        .replace(':', '-')
        .replace(',', '')
        // .replace(new RegExp(/\W/), '') // any remaining-non-word chars
        ; // temporary eek.

      if (logalot) { console.log(`${lc} binHash: ${binHash}`); }
      if (logalot) { console.log(`${lc} ext: ${ext}`); }
      const data: PicData_V1 = { binHash, ext, filename, timestamp };
      const rel8ns: IbGibRel8ns_V1 = {
        // 'pic on': [addr], // makes it more difficult to share/sync ibgibs
        [c.BINARY_REL8N_NAME]: [binAddr],
      };

      // create an ibgib with the filename and ext
      const resPicIbGib = await factory.firstGen({
        parentIbGib: factory.primitive({ib: 'pic'}),
        ib: `pic ${binHash}`,
        data,
        rel8ns,
        dna: true,
        tjp: { uuid: true, timestamp: true },
        nCounter: true,
      });
      await common.ibgibs.persistTransformResult({resTransform: resPicIbGib, space});
      const newPic = <PicIbGib_V1>resPicIbGib.newIbGib;
    //   await common.ibgibs.rel8ToCurrentRoot({ibGib: newPic, linked: true, space});
      await common.ibgibs.registerNewIbGib({ibGib: newPic, space});

      return newPic;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }
