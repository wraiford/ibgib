import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Plugins, FilesystemDirectory, FilesystemEncoding, Capacitor, FileReadResult } from '@capacitor/core';
const { Filesystem } = Plugins;

import { IbGibAddr } from 'ts-gib/dist';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { getIbGibAddr, hash, getIbAndGib } from 'ts-gib/dist/helper';
import { IBGIB_BASE_SUBPATH, IBGIB_BIN_SUBPATH, IBGIB_META_SUBPATH, IBGIB_DNA_SUBPATH, IBGIB_IBGIBS_SUBPATH, IBGIB_FILES_ENCODING, IBGIB_BASE_DIR } from '../common/constants';
import { DomSanitizer } from '@angular/platform-browser';

interface FileResult {
  success?: boolean;
  /**
   * If truthy, will return the raw Filesystem call's result.
   */
  raw?: any;
  /**
   * If errored, this will contain the errorMsg.
   */
  errorMsg?: string;
}

/**
 * Options for retrieving data from the file system.
 */
interface GetIbGibOpts {
  /**
   * If getting ibGib object, this is its address.
   */
  addr?: IbGibAddr;
  /**
   * If getting binary, this is the hash we're looking for (binId)
   */
  binHash?: string;
  /**
   * If getting binary, this is the extension.
   */
  binExt?: string;
  /**
   * If truthy, will look in the meta subpath first, then the regular if not found.
   */
  isMeta?: boolean;
  /**
   * Are we looking for a DNA ibgib?
   */
  isDna?: boolean;
  /**
   * If truthy, will get the underlying raw read result.
   *
   * ATOW, in Ionic/Capacitor's case, this would hold the `readFile` result obj.
   */
  getRawResult?: boolean;
}
/**
 * Result for retrieving an ibGib from the file system.
 */
interface GetIbGibResult extends FileResult {
  /**
   * ibGib if retrieving a "regular" ibGib.
   *
   * This is used when you're not getting a pic, e.g.
   */
  ibGib?: IbGib_V1;
  /**
   * This is used when you're getting a pic's binary content.
   */
  binData?: any;
}

interface PutIbGibOpts {
  ibGib?: IbGib_V1;
  /**
   * if true, will store this data in the bin folder with its hash.
   */
  binData?: string;
  /**
   * If true, will store in a different folder.
   */
  isDna?: boolean;
  /**
   * extension to store the bindata with.
   */
  binExt?: string;
  /**
   * If true, will store with metas.
   */
  isMeta?: boolean;
  /**
   * If truthy, will get the underlying raw read/write result.
   *
   * ATOW, in Ionic/Capacitor's case, this would hold the `writeFile` result obj.
   */
  getRawResult?: boolean;
}
interface PutIbGibResult extends FileResult {
  binHash?: string;
}

interface DeleteIbGibOpts extends GetIbGibOpts { }
interface DeleteIbGibResult extends FileResult { }

/**
 * Works with file system/storage to save/load ibgibs.
 *
 * Relies on Capacitor's FileSystem plugin.
 */
@Injectable({
  providedIn: 'root'
})
export class FilesService {
  protected lc: string = `[${FilesService.name}]`;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
  ) {
    const lc = `${this.lc}[ctor]`;
    console.log(`${lc} Hello FilesService Service`);
  }

  private buildPath({
    filename,
    isMeta,
    isDna,
    isBin
  }: {
    filename: string,
    isMeta?: boolean,
    isDna: boolean,
    isBin?: boolean
  }): string {
    if (isMeta){
      return `${IBGIB_BASE_SUBPATH}/${IBGIB_META_SUBPATH}/${filename}`;
    } else if (isBin) {
      return `${IBGIB_BASE_SUBPATH}/${IBGIB_BIN_SUBPATH}/${filename}`;
    } else if (isDna) {
      return `${IBGIB_BASE_SUBPATH}/${IBGIB_DNA_SUBPATH}/${filename}`;
    } else {
      // regular ibGib
      return `${IBGIB_BASE_SUBPATH}/${IBGIB_IBGIBS_SUBPATH}/${filename}`;
    }
  }

  getFilename({
    addr,
    binHash,
    binExt
  }: {
    addr?: string,
    binHash?: string,
    binExt?: string,
  }): string {
    if (addr) {
      return `${addr}.json`;
    } else {
      return binExt ? binHash + '.' + binExt : binHash;
    }
  }

  async get({
    addr,
    binHash,
    binExt,
    isMeta,
    isDna,
    getRawResult,
  }: GetIbGibOpts): Promise<GetIbGibResult> {
    const lc = `${this.lc}[${this.get.name}(${addr})]`;

    if (!addr && !binHash) { throw new Error(`${lc} addr or binHash required.`) };

    const {ib,gib} = getIbAndGib({ibGibAddr: addr});
    const isBin = !addr;
    const result: GetIbGibResult = {};

    const tryRead: (p:string) => Promise<FileReadResult> = async (p) => {
      const lcTry = `${lc}[${tryRead.name}]`;
      try {
        const resRead = await Filesystem.readFile({
          path: p,
          directory: IBGIB_BASE_DIR,
          encoding: IBGIB_FILES_ENCODING,
        });
        console.log(`${lc} path found: ${p}`);
        return resRead;
      } catch (error) {
        console.log(`${lc} path not found: ${p}`);
        return null;
      }
    }
    try {
      let path: string = "";
      let filename: string = "";
      let paths: string[] = [];
      if (addr) {
        filename = this.getFilename({addr});

        if (isMeta) {
          // explicitly stating meta, so only look in meta
          paths = [ this.buildPath({filename, isMeta: true, isDna: false}), ];
        } else if (isDna) {
          // explicitly stating dna, so only look in dna
          paths = [ this.buildPath({filename, isMeta: false, isDna: true}), ];
        } else {
          // could be regular, meta or dna, so we'll search everywhere, but first regular.
          paths = [
            this.buildPath({filename, isMeta: false, isDna: false}),
            this.buildPath({filename, isMeta: true, isDna: false}),
            this.buildPath({filename, isMeta: false, isDna: true}),
          ];
        }
      } else {
        filename = binExt ? binHash + '.' + binExt : binHash;
        path = this.buildPath({filename, isDna: false, isMeta: false, isBin: true})
        paths = [path];
      }
      let resRead: any = null;
      for (const tryPath of paths) {
        let x = await tryRead(tryPath);
        if (x?.data) { resRead = x; break; }
      }
      if (!resRead) { throw new Error(`paths not found: ${JSON.stringify(paths)}`) }
      if (!isBin) {
        // ibGib retrieved
        result.ibGib = <IbGib_V1>JSON.parse(resRead.data);
      } else {
        // bin
        result.binData = resRead.data;
      }
      if (getRawResult) { result.raw = resRead; }
      result.success = true;
    } catch (error) {
      const errorMsg = `${lc} ${error.message}`;
      console.error(errorMsg);
      result.errorMsg = errorMsg;
    }

    return result;
  }

  // async getFileSrc({binHash, binExt}: {binHash: string, binExt: string}): Promise<any> {
  //   const lc = `${this.lc}[${this.getFileSrc.name}(${binHash})]`;
  //   let filename = binExt ?
  //     binHash + '.' + binExt :
  //     binHash;
  //   let path = this.buildPath({filename, isDna: false, isMeta: false, isBin: true});
  //   console.log(`${lc} path: ${path}`);
  //   let resGet = await Filesystem.getUri({path, directory: IBGIB_BASE_DIR});
  //   console.log(`${lc} original uri: ${resGet.uri}`);
  //   let uri = Capacitor.convertFileSrc(resGet.uri);
  //   console.log(`${lc} final uri: ${uri}`);
  //   let sanitized = this.sanitizer.bypassSecurityTrustUrl(uri);
  //   return uri;
  //   // return Capacitor.convertFileSrc(IBGIB_BASE_DIR + '/' + path);
  // }

  async put({
    ibGib,
    binData,
    binExt,
    isMeta,
    isDna,
    getRawResult,
  }: PutIbGibOpts): Promise<PutIbGibResult> {
    const lc = `${this.lc}[${this.put.name}]`;

    if (!ibGib && !binData) { throw new Error(`${lc} ibGib or binData required.`) };

    let result: PutIbGibResult = {};

    try {
      await this.ensureDirs();
      let path: string = "";
      let filename: string = "";
      let data: string = "";
      if (ibGib) {
        const addr = getIbGibAddr({ibGib});
        filename = `${addr}.json`;
        path = this.buildPath({filename, isMeta, isDna});
        data = JSON.stringify(ibGib);
      } else {
        const binHash = await hash({s: binData});
        filename = binExt ? binHash + '.' + binExt : binHash;
        path = this.buildPath({filename, isDna: false, isMeta: false, isBin: true})
        data = binData;
        result.binHash = binHash;
      }

      const resWrite = await Filesystem.writeFile({
        path,
        data,
        directory: IBGIB_BASE_DIR,
        encoding: FilesystemEncoding.UTF8
      });
      console.log(`${lc} resWrite.uri: ${resWrite.uri}`);

      result.success = true;
      if (getRawResult) { result.raw = resWrite; }
    } catch (error) {
      const errorMsg = `${lc} ${error.message}`;
      console.error(errorMsg);
      result.errorMsg = errorMsg;
    }

    return result;
  }

  /**
   * Ensure directories are created on filesystem.
   */
  async ensureDirs(): Promise<void> {
    const directory = IBGIB_BASE_DIR;
    const ensure: (path: string) => Promise<void> = async (path) => {
      const lc = `ensure(path: ${path})`;
      let exists = false;
      try {
        const result = await Filesystem.readdir({ path, directory });
        console.log(`${lc} result.files: ${JSON.stringify(result?.files)}`);
        exists = true;
      } catch (error) {
        console.log(`${lc} Did not exist`);
      }

      if (!exists) {
        console.log(`${lc} creating...`);
        try {
          const result = await Filesystem.mkdir({ path, directory });
        } catch (error) {
          console.log(`${lc} Error creating.`)
        } finally {
          console.log(`${lc} complete.`);
        }
      }
    }

    const paths = [
      IBGIB_BASE_SUBPATH,// = 'ibgib';
      IBGIB_BASE_SUBPATH + '/' + IBGIB_IBGIBS_SUBPATH,
      IBGIB_BASE_SUBPATH + '/' + IBGIB_META_SUBPATH,
      IBGIB_BASE_SUBPATH + '/' + IBGIB_BIN_SUBPATH,
      IBGIB_BASE_SUBPATH + '/' + IBGIB_DNA_SUBPATH,
    ];
    for (let path of paths) {
      await ensure(path);
    }
  }

  async delete({
    addr,
    binHash,
    binExt,
    isMeta,
    isDna,
    getRawResult: getRaw
  }: GetIbGibOpts): Promise<GetIbGibResult> {
    const lc = `${this.lc}[${this.get.name}]`;

    if (!addr && !binHash) { throw new Error(`${lc} addr or binHash required.`) };

    const isBin = !addr;
    const result: GetIbGibResult = {};

    try {
      let path: string = "";
      let filename: string = "";
      if (addr) {
        filename = this.getFilename({addr});
        path = this.buildPath({filename, isMeta, isDna});
      } else {
        filename = binExt ? binHash + '.' + binExt : binHash;
        path = this.buildPath({filename, isMeta: false, isDna: false, isBin: true})
      }
      console.log(`${lc} path: ${path}, directory: ${IBGIB_BASE_DIR}`)
      const resDelete = await Filesystem.deleteFile({
        path,
        directory: IBGIB_BASE_DIR,
      });
      console.log(`${lc} deleted`);
      if (getRaw) { result.raw = resDelete; }
      result.success = true;
    } catch (error) {
      const errorMsg = `${lc} ${error.message}`;
      console.error(errorMsg);
      result.errorMsg = errorMsg;
    }

    return result;
  }
}
