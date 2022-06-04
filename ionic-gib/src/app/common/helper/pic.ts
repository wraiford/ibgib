import * as h from 'ts-gib/dist/helper';
import { Factory_V1 as factory, IbGibRel8ns_V1, IBGIB_DELIMITER, IbGib_V1 } from 'ts-gib/dist/V1';
import { getGib } from 'ts-gib/dist/V1/transforms/transform-helper';
// import { hash, getIbGibAddr, getTimestamp, pretty } from 'ts-gib/dist/helper';

import * as c from '../constants';
import { PicData_V1, PicIbGib_V1 } from '../types/pic';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';
import { BinIbGib_V1 } from '../types/bin';
import { persistTransformResult, putInSpace } from './space';
import { TransformResult } from 'ts-gib';
import { getBinIb } from './ibgib';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export interface PicDependencyGraph {
  picIbGib: PicIbGib_V1;
  binIbGib: BinIbGib_V1;
  dependencies: IbGib_V1[];
}

export async function createBinIbGib({
  base64Data,
  binHash,
  ext,
  saveInSpace,
  space,
}: {
  /**
   * base64-encoded binary data
   */
  base64Data: string,
  /**
   * Hash of data
   */
  binHash: string,
  /**
   * extension of the binary
   *
   * this will be included in the ib
   */
  ext?: string,
  /**
   * If true, will save the ibgibs created in the given `space`.

   * @see {@link space}
   */
  saveInSpace?: boolean,
  /**
   * space to save the ibgib(s) if `saveInSpace` is truthy.
   *
   * @see {@link saveInSpace}
   */
  space?: IbGibSpaceAny,
}): Promise<TransformResult<BinIbGib_V1>> {
  const lc = `[${createBinIbGib.name}]`;
  try {
    if (logalot) { console.log(`${lc} starting...`); }

    if (!binHash) { throw new Error(`binHash required (E: 09da0190a9353089a9ed8a641fe0bc22)`); }

    const binIb = getBinIb({binHash, binExt: ext});
    const binIbGib: BinIbGib_V1 = { ib: binIb, data: <any>base64Data };

    const binGib = await getGib({ibGib: binIbGib, hasTjp: false});
    binIbGib.gib = binGib;

    if (saveInSpace) {
      // prepare
      if (!space) { throw new Error(`space required if saveInSpace is truthy. (E: b8a5ebbac47d757afce940d2f0af3122)`); }
      if (logalot) { console.log(`${lc} saving binary ibgib in space... (I: 8235addb1b3e4e638ef568da5f219d29)`); }

      // execute put
      const resSaveBin = await putInSpace({ibGib: binIbGib, space});

      // if errored, throw
      if (!resSaveBin.success) { throw new Error(resSaveBin.errorMsg || 'error saving pic (E: cf892bc62ab44ec58534d9881c9c4332)'); }

      // cleanup
      if (logalot) { console.log(`${lc} saving binary ibgib in space complete. (I: 4aa8d03088ad477dbee089394b3b9902)`); }
    }

    return { newIbGib: binIbGib };
  } catch (error) {
    console.error(`${lc} ${error.message}`);
    throw error;
  } finally {
    if (logalot) { console.log(`${lc} complete.`); }
  }
}

/**
 * shared pic code between camera and loading image via picking a file.
 */
export async function createPicAndBinIbGibs({
  imageBase64,
  binHash,
  filename,
  ext,
  saveInSpace,
  space,
}: {
  imageBase64: string,
  binHash: string,
  filename?: string,
  ext?: string,
  /**
   * If true, will save the ibgibs created in the given `space`.
   */
  saveInSpace?: boolean,
  /**
   * If `saveInSpace`, all ibgibs created in this function will be stored in
   * this space.
   */
  space?: IbGibSpaceAny,
}): Promise<[TransformResult<PicIbGib_V1>, TransformResult<BinIbGib_V1>]> {
  const lc = `[${createPicAndBinIbGibs.name}]`;

  if (logalot) { console.log(`${lc} starting...`); }
  try {
    const resCreateBin =
      await createBinIbGib({base64Data: imageBase64, binHash, ext, saveInSpace, space});
    const { newIbGib: binIbGib } = resCreateBin;
    const binAddr = h.getIbGibAddr({ibGib: binIbGib});

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
    const resPicIbGib = <TransformResult<PicIbGib_V1>>await factory.firstGen({
      parentIbGib: factory.primitive({ib: 'pic'}),
      ib: `pic ${binHash}`,
      data,
      rel8ns,
      dna: true,
      tjp: { uuid: true, timestamp: true },
      nCounter: true,
    });
    if (saveInSpace) {
      if (!space) { throw new Error(`space required if saveInSpace is truthy (E: 966901041c9e166c0f5ed23114003722)`); }
      await persistTransformResult({resTransform: resPicIbGib, space});
    }
    // const newPic = <PicIbGib_V1>resPicIbGib.newIbGib;
  //   await common.ibgibs.rel8ToCurrentRoot({ibGib: newPic, linked: true, space});

    return [resPicIbGib, resCreateBin];
  } catch (error) {
    console.error(`${lc} ${error.message}`);
    throw error;
  }
}

export async function createPicAndBinIbGibsFromInputFilePickedEvent({
  event,
  saveInSpace,
  space,
}: {
  event: any,
  /**
   * If true, will save the ibgibs created in the given `space`.

   * @see {@link space}
   */
  saveInSpace?: boolean,
  space: IbGibSpaceAny,
}): Promise<[TransformResult<PicIbGib_V1>, TransformResult<BinIbGib_V1>][]> {
  const lc = `[${createPicAndBinIbGibsFromInputFilePickedEvent.name}]`;
  try {
    // validate incoming input picker result
    // thanks https://edupala.com/capacitor-camera-example/
    const target = event.target as HTMLInputElement;
    if (!target) { throw new Error(`event.target required (E: a9ade57d4359d3b0bbc75c3fea093a22)`); }
    if ((target.files ?? []).length === 0) { throw new Error(`target.files is falsy/empty (E: f2932f1012c9e04a5f06a521a381ff22)`); }

    const result: [TransformResult<PicIbGib_V1>, TransformResult<BinIbGib_V1>][] = [];

    // going to execute serially to maintain order of incoming target files
    // IOW not going to do a Promise.all equivalent
    for (let i = 0; i < target.files.length; i++) {
      const file = target.files[i];
      if (!file) { throw new Error(`file required. (E: 24a8bf4cdf17dcae04b15438bc0a4522)`); }
      const pattern = /image-*/;
      if (!file.type.match(pattern)) { throw new Error(`File format not supported. file: ${file} (E: dca558def013c1c85c83f0ac088b2122)`); }
      // wrap reader in promise for use with async/await
      const resSingleCreate =
        await new Promise<[TransformResult<PicIbGib_V1>, TransformResult<BinIbGib_V1>]>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (_: any) => {
            const lc2 = `${lc}[reader.onload]`;
            try {
              if (logalot) { console.log(`${lc2} starting... (I: 1e948476ca86b328a12700dc57be0a22)`); }
              let imageBase64 = reader.result.toString().split('base64,')[1];
              let binHash = await h.hash({s: imageBase64});
              const filenameWithExt = file.name;
              const filenamePieces = filenameWithExt.split('.');
              const filename = filenamePieces.slice(0, filenamePieces.length-1).join('.');
              const ext = filenamePieces.slice(filenamePieces.length-1)[0];
              if (ext.includes(IBGIB_DELIMITER)) {
                throw new Error(`file extension cannot contain the character ${IBGIB_DELIMITER} (E: f5bc9ef79f7efe01cd53abd49d9f6122)`);
              }

              await h.delay(32); // slight doProcesses UI thread hack - not sure how much it helps (if any)
              const resCreate = await createPicAndBinIbGibs({
                imageBase64, binHash, filename, ext, saveInSpace, space,
              });
              resolve(resCreate);

            } catch (error) {
              console.error(`${lc2} ${error.message}`);
              reject(error);
            } finally {
              if (logalot) { console.log(`${lc2} complete. (I: d88dcaeb874c4f049d51d58655dc2b62)`); }
            }
          };
          reader.readAsDataURL(file);
        });

      result.push(resSingleCreate);
    }

    return result;

  } catch (error) {
    console.error(`${lc} ${error.message}`);
    throw error;
  }
}

export function isPic({
  ibGib,
}: {
  ibGib: IbGib_V1,
}): boolean {
  const lc = `[${isPic.name}]`;
  try {
    if (logalot) { console.log(`${lc} starting...`); }

    if (!ibGib) { throw new Error(`ibGib required (E: 1237b2d4602a3d526f6b159cb6ad0922)`); }

    const {ib, data, rel8ns} = ibGib;

    // try rel8ns first
    if (!rel8ns) {
      if (logalot) { console.log(`${lc} rel8ns falsy, not a pic (I: 563a3e779b85b070550581e652e0ca22)`); }
      return false;
    }

    // descends from pic^gib
    const ancestors = rel8ns.ancestor || [];
    if (ancestors && ancestors.includes('pic^gib')) {
      return true;
    }

    // has binary qualities and ib contains 'pic'
    if (!data) {
      if (logalot) { console.log(`${lc} data falsy, not a pic (I: 6c05c03cdfca4085aef8f2a19df91690)`); }
      return false;
    }
    if (data.binHash && data.ext && data.filename && ib?.includes('pic')) {
      if (logalot) { console.log(`${lc} has binHash, ext, filename and ib has pic (I: f754b6b023d5379ee770038617edc722)`); }
      return true;
    }

    if (logalot) { console.log(`${lc} reached end, doesn't have pic qualities. not a pic. (I: 298c5e9a2916445df1cdd22a96f57522)`); }
    return false;
  } catch (error) {
    console.error(`${lc} ${error.message}`);
    throw error;
  } finally {
    if (logalot) { console.log(`${lc} complete.`); }
  }
}