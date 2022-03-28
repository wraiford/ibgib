import {
    Plugins, FilesystemEncoding, FileReadResult, FilesystemDirectory, Capacitor, FileWriteResult
} from '@capacitor/core';
const { Filesystem } = Plugins;

import * as c from '../constants';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export async function tryRead({
    path,
    directory,
    encoding,
}: {
    path: string,
    directory: FilesystemDirectory,
    encoding: FilesystemEncoding,
}): Promise<FileReadResult> {
    const lc = `[${tryRead.name}]`;
    try {
        if (logalot) {
            console.log(`${lc} starting...`);
            if (path.includes('bootstrap^gib')) { console.log(`${lc} trying bootstrap^gib... (I: dacfdbe5a2d640ab947a7c17e3c56f78)`); }
        }
        const resRead = await Filesystem.readFile({
            path: path,
            directory,
            encoding,
        });
        if (logalot) { console.log(`${lc} path found: ${path} (I: 82e3ad9821bd4bf8a54c8facc61dbad0)`); }
        return resRead;
    } catch (error) {
        if (logalot) { console.log(`${lc} path not found: ${path} (I: 1fde689d29aa47fcb589b3e7dac8929b)`); }
        return null;
    } finally {
        if (logalot) { console.log(`${lc} complete. (I: e2615c944a464cd48a5635fe401562d9)`); }
    }
}

export async function pathExists({
    path,
    directory,
    encoding,
}: {
    path: string,
    directory: FilesystemDirectory,
    encoding: FilesystemEncoding,
}): Promise<boolean> {
    const lc = `[${pathExists.name}]`;
    try {
        if (logalot) {
            console.log(`${lc} starting...`);
            if (path.includes('bootstrap^gib')) { console.log(`${lc} trying bootstrap^gib...`); }
        }
        const _ignored = await Filesystem.readFile({
            path: path,
            directory,
            encoding,
        });
        if (logalot) { console.log(`${lc} path found: ${path}`); }
        return true;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        if (logalot) { console.log(`${lc} tryread failed with error, so maybe file doesn't exist, but maybe it's an actual error...error.message: ${error.message} (I: 398b21ba35558579a52bbab71d586822)`); }
        return false;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}


export async function writeFile({
    path,
    data,
    directory,
    encoding,
}: {
    path: string,
    data: string,
    directory: FilesystemDirectory,
    encoding?: FilesystemEncoding,
}): Promise<FileWriteResult> {
    const lc = `[${writeFile.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }
        if (!path) { throw new Error(`path required (E: dd39a1a226f26e1675a3a99dea3b2e22)`); }
        if (!data) { throw new Error(`data required (E: f2cf8ad9d118eaeaba9982a5395bcc22)`); }
        if (!directory) { throw new Error(`directory required (E: 71897de292b2a1ff219d9ddb01855722)`); }

        encoding = encoding || FilesystemEncoding.UTF8;

        const resWrite = await Filesystem.writeFile({
            path,
            data,
            directory,
            encoding: FilesystemEncoding.UTF8,
        });

        if (logalot) { console.log(`${lc} resWrite?.uri: ${resWrite?.uri} (I: 85e54f5172153f2c1fc7d54dda44a122)`); }
        return resWrite;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

/**
 * Checks to see if `dirPath` exists, if not makes it.
 */
export async function ensureDirPath({
    dirPath,
    directory,
}: {
    dirPath: string,
    directory: FilesystemDirectory,
}): Promise<void> {
    const lc = `[${ensureDirPath.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }
        const exists = await dirPathExists({dirPath, directory});
        if (!exists) { await mkdir({dirPath, directory}); }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

/**
 *
 * @returns true if `dirPath` exists, else false.
 *
 * ## notes
 *
 * * if an exception occurs, this may be masked by a false result but will be
 *   logged if logalot.
 */
export async function dirPathExists({
    dirPath,
    directory,
}: {
    dirPath: string,
    directory: FilesystemDirectory,
}): Promise<boolean> {
    const lc = `[${dirPathExists.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... path: ${dirPath}, directory: ${directory} (I: 5d6c290cdc7ad2f89326477775ebcd22)`); }

        await Filesystem.readdir({ path: dirPath, directory });
        if (logalot) { console.log(`${lc} YES, did exist (I: 0045ed20d4ae4a48a412bb2bc60984cb)`); }
        return true;
    } catch (error) {
        if (logalot) { console.log(`${lc} NO, did NOT exist (I: 0045ed20d4ae4a48a412bb2bc60984cb)`); }
        return false;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export async function mkdir({
    dirPath,
    directory,
}: {
    dirPath: string,
    directory: FilesystemDirectory,
}): Promise<void> {
    const lc = `[${mkdir.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }
        await Filesystem.mkdir({ path: dirPath, directory, recursive: true });
    } catch (error) {
        console.error(`${lc} error creating path (${dirPath}) and directory (${directory}). error: ${error.message} (E: e557ebc6885d4b74a393ad80b543abc4)`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export function getBlob (b64Data: string): Blob {
    let contentType = '';
    let sliceSize = 512;

    // b64Data = b64Data.replace(/data\:image\/(jpeg|jpg|png)\;base64\,/gi, '');

    let byteCharacters = atob(b64Data);
    // let byteCharacters = Buffer.from(b64Data, 'base64');
    let byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
      }

      let byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    let blob = new Blob(byteArrays, {type: contentType});
    return blob;
}
