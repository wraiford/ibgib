import * as h from 'ts-gib/dist/helper';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr } from 'ts-gib';

import * as c from '../../../../common/constants';
import { pickRandom, unique } from '../../../../common/helper/utils';
import {
    StimulateArgs, Stimulation, StimulationScope, StimulationTarget, StimulationType, Stimulator, WordyTextInfo, WordyUniqueWordInfo
} from './types';
import { getTjpAddr } from 'src/app/common/helper/ibgib';


const logalot = c.GLOBAL_LOG_A_LOT || true;

export function getTargets({
    ibGibs,
}: {
    ibGibs: IbGib_V1[],
}): StimulationTarget[] {
    const lc = `${getTargets.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: d5833ceed62a8d6f19677d3d7f81ff22)`); }
        let targets: StimulationTarget[] = ibGibs.map(x => {
            const addr = h.getIbGibAddr({ ibGib: x });
            const tjpAddr = getTjpAddr({ ibGib: x });
            const target: StimulationTarget = { "@toStimulate": addr, "@toStimulateTjp": tjpAddr };
            return target;
        });

        return targets;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export function getWords({
    text,
    doLowercase,
    doSort,
    doUnique
}: {
    text: string,
    doLowercase?: boolean,
    doSort?: boolean,
    doUnique?: boolean,
}): string[] {
    const lc = `${getWords.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 49b58b2dd268350f5b036b5d24a92722)`); }
        const wordsRegExpArray = text.match(/\b(\w+)['\-]?(\w+)?\b/g);

        let words = doLowercase ?
            wordsRegExpArray.map(x => x.toLowerCase()) :
            wordsRegExpArray.concat();

        if (doUnique) { words = unique(words); }
        if (doSort) { words.sort(); }

        return words;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export function getWordyTextInfo({
    text,
}: {
    text: string,
}): WordyTextInfo {
    const lc = `[${getWordyTextInfo.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: d3fffef3120241b0b890a45fcce89e89)`); }

        if (!text) { throw new Error(`text required (E: 30fd524e350843dda9a7d2677a249e87)`); }

        const paragraphs = text.split(/\n\n+/g).map(x => x.trim());
        const lines = text.trim().split('\n').filter(x => !!x).map(x => x.trim());
        const wordInfos: { [word: string]: WordyUniqueWordInfo } = {};
        // const sortedWords = text.match(/\b(\w+)['\-]?(\w+)?\b/g).map(x => x.toLowerCase()).sort();
        const sortedWords = getWords({ text, doLowercase: true, doSort: true });
        const wordCount = sortedWords.length;
        const uniqueWords = unique(sortedWords);
        for (let j = 0; j < uniqueWords.length; j++) {
            const word = uniqueWords[j];
            const wordInfo: WordyUniqueWordInfo = {
                paragraphIncidence: paragraphs.filter(x => x.toLowerCase().includes(word)).length,
                lineIncidence: lines.filter(x => x.toLowerCase().includes(word)).length,
                srcIncidence: 1,
                totalIncidence: (text.toLowerCase().match(new RegExp(`\\b${word}\\b`, 'gm')) ?? []).length,
            };
            wordInfos[word] = wordInfo;
        }

        const info: WordyTextInfo = {
            text, paragraphs, lines,
            wordInfos, wordCount,
        };

        if (logalot) {
            console.log(`${lc} commentInfo: ${h.pretty(info)} (I: be5f133fda954855b7f26e113e3ce55b)`);
            console.table(info);
        }

        return info;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}
