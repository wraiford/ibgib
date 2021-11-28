// import { Injectable } from '@angular/core';
// import { Plugins, FilesystemEncoding, FileReadResult } from '@capacitor/core';
// const { Filesystem } = Plugins;

// import { IbGibAddr, TransformResult } from 'ts-gib/dist';
// import { IbGib_V1 } from 'ts-gib/dist/V1';
// import { getIbGibAddr, hash, getIbAndGib } from 'ts-gib/dist/helper';
// import { IBGIB_BASE_SUBPATH, IBGIB_BIN_SUBPATH, IBGIB_META_SUBPATH, IBGIB_DNA_SUBPATH, IBGIB_IBGIBS_SUBPATH, IBGIB_FILES_ENCODING, IBGIB_BASE_DIR } from '../common/constants';

// interface FileResult {
//   success?: boolean;
//   /**
//    * If truthy, will return the raw Filesystem call's result.
//    */
//   raw?: any;
//   /**
//    * If errored, this will contain the errorMsg.
//    */
//   errorMsg?: string;
// }

// /**
//  * Options for retrieving data from the file system.
//  */
// interface GetIbGibOpts {
//   /**
//    * If getting ibGib object, this is its address.
//    */
//   addr?: IbGibAddr;
//   /**
//    * If getting binary, this is the hash we're looking for (binId)
//    */
//   binHash?: string;
//   /**
//    * If getting binary, this is the extension.
//    */
//   binExt?: string;
//   /**
//    * If truthy, will look in the meta subpath first, then the regular if not found.
//    */
//   isMeta?: boolean;
//   /**
//    * Are we looking for a DNA ibgib?
//    */
//   isDna?: boolean;
//   /**
//    * If truthy, will get the underlying raw read result.
//    *
//    * ATOW, in Ionic/Capacitor's case, this would hold the `readFile` result obj.
//    */
//   getRawResult?: boolean;
// }
// /**
//  * Result for retrieving an ibGib from the file system.
//  */
// interface GetIbGibResult extends FileResult {
//   /**
//    * ibGib if retrieving a "regular" ibGib.
//    *
//    * This is used when you're not getting a pic, e.g.
//    */
//   ibGib?: IbGib_V1;
//   /**
//    * This is used when you're getting a pic's binary content.
//    */
//   binData?: any;
// }

// interface PutIbGibOpts {
//   ibGib?: IbGib_V1;
//   /**
//    * if true, will store this data in the bin folder with its hash.
//    */
//   binData?: string;
//   /**
//    * If true, will store in a different folder.
//    */
//   isDna?: boolean;
//   /**
//    * extension to store the bindata with.
//    */
//   binExt?: string;
//   /**
//    * If true, will store with metas.
//    */
//   isMeta?: boolean;
//   /**
//    * If truthy, will get the underlying raw read/write result.
//    *
//    * ATOW, in Ionic/Capacitor's case, this would hold the `writeFile` result obj.
//    */
//   getRawResult?: boolean;
// }
// interface PutIbGibResult extends FileResult {
//   binHash?: string;
// }

// /**
//  * Works with file system/storage to save/load ibgibs.
//  *
//  * Relies on Capacitor's FileSystem plugin.
//  */
// @Injectable({
//   providedIn: 'root'
// })
// export class FilesService {
//   protected lc: string = `[${FilesService.name}]`;

//   constructor(
//   ) {
//     console.log('Hello FilesService Service');
//   }

//   private buildPath({
//     filename,
//     isMeta,
//     isDna,
//     isBin
//   }: {
//     filename: string,
//     isMeta?: boolean,
//     isDna: boolean,
//     isBin?: boolean
//   }): string {
//     if (isMeta){
//       return `${IBGIB_BASE_SUBPATH}/${IBGIB_META_SUBPATH}/${filename}`;
//     } else if (isBin) {
//       return `${IBGIB_BASE_SUBPATH}/${IBGIB_BIN_SUBPATH}/${filename}`;
//     } else if (isDna) {
//       return `${IBGIB_BASE_SUBPATH}/${IBGIB_DNA_SUBPATH}/${filename}`;
//     } else {
//       // regular ibGib
//       return `${IBGIB_BASE_SUBPATH}/${IBGIB_IBGIBS_SUBPATH}/${filename}`;
//     }
//   }

//   getFilename({
//     addr,
//     binHash,
//     binExt
//   }: {
//     addr?: string,
//     binHash?: string,
//     binExt?: string,
//   }): string {
//     if (addr) {
//       return `${addr}.json`;
//     } else {
//       return binExt ? binHash + '.' + binExt : binHash;
//     }
//   }

//   async get({
//     addr,
//     binHash,
//     binExt,
//     isMeta,
//     isDna,
//     getRawResult,
//   }: GetIbGibOpts): Promise<GetIbGibResult> {
//     const lc = `${this.lc}[${this.get.name}(${addr})]`;

//     if (!addr && !binHash) { throw new Error(`${lc} addr or binHash required.`) };

//     // const {ib,gib} = getIbAndGib({ibGibAddr: addr});
//     const isBin = !addr;
//     const result: GetIbGibResult = {};

//     const tryRead: (p:string) => Promise<FileReadResult> = async (p) => {
//       const lcTry = `${lc}[${tryRead.name}]`;
//       try {
//         const resRead = await Filesystem.readFile({
//           path: p,
//           directory: IBGIB_BASE_DIR,
//           encoding: IBGIB_FILES_ENCODING,
//         });
//         console.log(`${lcTry} path found: ${p}`);
//         return resRead;
//       } catch (error) {
//         console.log(`${lcTry} path not found: ${p}`);
//         return null;
//       }
//     }
//     try {
//       let path: string = "";
//       let filename: string = "";
//       let paths: string[] = [];
//       if (addr) {
//         filename = this.getFilename({addr});

//         if (isMeta) {
//           // explicitly stating meta, so only look in meta
//           paths = [ this.buildPath({filename, isMeta: true, isDna: false}), ];
//         } else if (isDna) {
//           // explicitly stating dna, so only look in dna
//           paths = [ this.buildPath({filename, isMeta: false, isDna: true}), ];
//         } else {
//           // could be regular, meta or dna, so we'll search everywhere, but first regular.
//           paths = [
//             this.buildPath({filename, isMeta: false, isDna: false}),
//             this.buildPath({filename, isMeta: true, isDna: false}),
//             this.buildPath({filename, isMeta: false, isDna: true}),
//           ];
//         }
//       } else {
//         filename = binExt ? binHash + '.' + binExt : binHash;
//         path = this.buildPath({filename, isDna: false, isMeta: false, isBin: true})
//         paths = [path];
//       }
//       let resRead: any = null;
//       for (const tryPath of paths) {
//         let x = await tryRead(tryPath);
//         if (x?.data) { resRead = x; break; }
//       }
//       if (!resRead) { throw new Error(`paths not found: ${JSON.stringify(paths)}`) }
//       if (!isBin) {
//         // ibGib retrieved
//         result.ibGib = <IbGib_V1>JSON.parse(resRead.data);
//       } else {
//         // bin
//         result.binData = resRead.data;
//       }
//       if (getRawResult) { result.raw = resRead; }
//       result.success = true;
//     } catch (error) {
//       const errorMsg = `${lc} ${error.message}`;
//       console.error(errorMsg);
//       result.errorMsg = errorMsg;
//     }

//     return result;
//   }

//   // async getFileSrc({binHash, binExt}: {binHash: string, binExt: string}): Promise<any> {
//   //   const lc = `${this.lc}[${this.getFileSrc.name}(${binHash})]`;
//   //   let filename = binExt ?
//   //     binHash + '.' + binExt :
//   //     binHash;
//   //   let path = this.buildPath({filename, isDna: false, isMeta: false, isBin: true});
//   //   console.log(`${lc} path: ${path}`);
//   //   let resGet = await Filesystem.getUri({path, directory: IBGIB_BASE_DIR});
//   //   console.log(`${lc} original uri: ${resGet.uri}`);
//   //   let uri = Capacitor.convertFileSrc(resGet.uri);
//   //   console.log(`${lc} final uri: ${uri}`);
//   //   let sanitized = this.sanitizer.bypassSecurityTrustUrl(uri);
//   //   return uri;
//   //   // return Capacitor.convertFileSrc(IBGIB_BASE_DIR + '/' + path);
//   // }

//   async put({
//     ibGib,
//     binData,
//     binExt,
//     isMeta,
//     isDna,
//     getRawResult,
//   }: PutIbGibOpts): Promise<PutIbGibResult> {
//     const lc = `${this.lc}[${this.put.name}]`;

//     if (!ibGib && !binData) { throw new Error(`${lc} ibGib or binData required.`) };

//     let result: PutIbGibResult = {};

//     try {
//       await this.ensureDirs();
//       let path: string = "";
//       let filename: string = "";
//       let data: string = "";
//       if (ibGib) {
//         const addr = getIbGibAddr({ibGib});
//         filename = `${addr}.json`;
//         path = this.buildPath({filename, isMeta, isDna});
//         data = JSON.stringify(ibGib);
//       } else {
//         const binHash = await hash({s: binData});
//         filename = binExt ? binHash + '.' + binExt : binHash;
//         path = this.buildPath({filename, isDna: false, isMeta: false, isBin: true})
//         data = binData;
//         result.binHash = binHash;
//       }

//       const resWrite = await Filesystem.writeFile({
//         path,
//         data,
//         directory: IBGIB_BASE_DIR,
//         encoding: FilesystemEncoding.UTF8
//       });
//       console.log(`${lc} resWrite.uri: ${resWrite.uri}`);

//       result.success = true;
//       if (getRawResult) { result.raw = resWrite; }
//     } catch (error) {
//       const errorMsg = `${lc} ${error.message}`;
//       console.error(errorMsg);
//       result.errorMsg = errorMsg;
//     }

//     return result;
//   }

//   async ensurePermissions(): Promise<boolean> {
//     const lc = `${this.lc}[${this.ensurePermissions.name}]`;
//     try {
//       if (Filesystem.requestPermissions) {
//         const resPermissions = await Filesystem.requestPermissions();
//         if (resPermissions?.results) {
//           console.warn(`${lc} resPermissions: ${JSON.stringify(resPermissions.results)} falsy`);
//           return true;
//         } else {
//           console.warn(`${lc} resPermissions?.results falsy`);
//           return true;
//         }
//       } else {
//         console.warn(`${lc} Filesystem.requestPermissions falsy`);
//         return true;
//       }
//     } catch (error) {
//       console.error(`${lc} ${error.message}`);
//       return false;
//     }
//   }

//   /**
//    * Ensure directories are created on filesystem.
//    */
//   async ensureDirs(): Promise<void> {
//     const directory = IBGIB_BASE_DIR;

//     const permitted = await this.ensurePermissions();
//     if (!permitted) { return; }

//     const ensure: (path: string) => Promise<boolean> = async (path) => {
//       const lc = `[${this.ensureDirs.name}][ensure(path: ${path}, directory: ${directory})]`;

//       // console.log(`${lc} starting...`);
//       const pathExistsKey = directory.toString() + '/' + path;
//       let exists = this.pathExistsMap[pathExistsKey] || false;

//       if (!exists) {
//         try {
//           const result = await Filesystem.readdir({ path, directory });
//           // console.log(`${lc} result.files: ${JSON.stringify(result?.files)}`);
//           exists = true;
//           this.pathExistsMap[pathExistsKey] = true;
//         } catch (error) {
//           console.log(`${lc} Did not exist`);
//         }
//       }

//       if (!exists) {
//         // try full path
//         console.log(`${lc} creating...`);
//         try {
//           const result = await Filesystem.mkdir({ path, directory, recursive: true });
//           this.pathExistsMap[pathExistsKey] = true;
//         } catch (error) {
//           console.log(`${lc} Error creating. Trying next`);
//         } finally {
//           console.log(`${lc} complete.`);
//         }
//       }

//       // console.log(`${lc} completed yo.`);

//       return exists;
//     }

//     const paths = [
//       IBGIB_BASE_SUBPATH,// = 'ibgib';
//       IBGIB_BASE_SUBPATH + '/' + IBGIB_IBGIBS_SUBPATH,
//       IBGIB_BASE_SUBPATH + '/' + IBGIB_META_SUBPATH,
//       IBGIB_BASE_SUBPATH + '/' + IBGIB_BIN_SUBPATH,
//       IBGIB_BASE_SUBPATH + '/' + IBGIB_DNA_SUBPATH,
//     ];
//     for (let path of paths) {
//       await ensure(path);
//     }
//   }

//   /**
//    * Check every time app starts if paths exist.
//    * But don't check every time do anything whatsoever.
//    */
//   private pathExistsMap = {};

//   async delete({
//     addr,
//     binHash,
//     binExt,
//     isMeta,
//     isDna,
//     getRawResult: getRaw
//   }: GetIbGibOpts): Promise<GetIbGibResult> {
//     const lc = `${this.lc}[${this.delete.name}]`;

//     if (!addr && !binHash) { throw new Error(`${lc} addr or binHash required.`) };

//     const result: GetIbGibResult = {};

//     try {
//       let path: string = "";
//       let filename: string = "";
//       if (addr) {
//         filename = this.getFilename({addr});
//         path = this.buildPath({filename, isMeta, isDna});
//       } else {
//         filename = binExt ? binHash + '.' + binExt : binHash;
//         path = this.buildPath({filename, isMeta: false, isDna: false, isBin: true})
//       }
//       console.log(`${lc} path: ${path}, directory: ${IBGIB_BASE_DIR}`)
//       const resDelete = await Filesystem.deleteFile({
//         path,
//         directory: IBGIB_BASE_DIR,
//       });
//       console.log(`${lc} deleted. path: ${path}`);
//       if (getRaw) { result.raw = resDelete; }
//       result.success = true;
//     } catch (error) {
//       const errorMsg = `${lc} ${error.message}`;
//       console.error(errorMsg);
//       result.errorMsg = errorMsg;
//     }

//     return result;
//   }

//   /**
//    * Convenience function for persisting a transform result, which has
//    * a newIbGib and optionally intermediate ibGibs and/or dnas.
//    */
//   async persistTransformResult({
//     isMeta,
//     resTransform,
//   }: {
//     isMeta?: boolean,
//     resTransform: TransformResult<IbGib_V1>
//   }): Promise<void> {
//     const lc = `${this.lc}[${this.persistTransformResult.name}]`;
//     try {
//       const { newIbGib, intermediateIbGibs, dnas } = resTransform;
//       const ibGibs = [newIbGib, ...(intermediateIbGibs || [])];
//       for (let ibGib of ibGibs) {
//         const resPut = await this.put({ibGib, isMeta});
//         if (!resPut.success) { throw new Error(`${lc} ${resPut.errorMsg}`); }
//       }
//       if (dnas) {
//         for (let ibGib of dnas) {
//           const resPut = await this.put({ibGib, isDna: true});
//           if (!resPut.success) { throw new Error(`${lc} ${resPut.errorMsg}`); }
//         }
//       }
//     } catch (error) {
//       console.log(`${lc} ${error.message}`);
//       throw error;
//     }
//   }

// }
