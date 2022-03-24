import {
    Plugins, FilesystemEncoding, FileReadResult, FilesystemDirectory, Capacitor
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
