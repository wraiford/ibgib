import { waitForAsync } from '@angular/core/testing';
import { Gib, Ib, IbGibAddr } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';
import { GibInfo, IbGib_V1 } from "ts-gib/dist/V1";
import { getGibInfo } from "ts-gib/dist/V1/transforms/transform-helper";
import { CommentIbGib_V1 } from "../types/comment";
import { ROBBOT_SESSION_ATOM } from '../types/robbot';
import { IbGibRobbotAny } from '../witnesses/robbots/robbot-base-v1';
import { WordyRobbot_V1, WordyRobbot_V1_Factory } from "../witnesses/robbots/wordy-robbot-v1";
import { createCommentIbGib } from "./comment";
import { getRequestTextFromComment, getRobbotSessionIb, parseRobbotSessionIb } from "./robbot";
import { getTimestampInTicks } from "./utils";

describe('getRequestTextFromComment', () => {

    it('should get request text with single-char escape', () => {
        ['?', '??', '/', '/esc'].forEach(escape => {
            ['help', 'hi',].forEach(requestText => {
                const text = escape + requestText;
                const ibGib: IbGib_V1 = {
                    ib: 'comment testib',
                    gib: 'gib',
                    rel8ns: { 'ancestor': ['comment^gib'], },
                    data: { text }
                }
                const resRequestText = getRequestTextFromComment({ ibGib, requestEscapeString: escape });
                expect(resRequestText).toEqual(requestText);
            });
        });
    });
});



describe('RobbotSessionIb', () => {

    // one big test because jasmine unfortunately makes you declare variables
    // multiple times to get async working, which doesn't scale, so it's a bad
    // design no matter what.
    // https://github.com/jasmine/jasmine/issues/1487 (?)
    fit('get/parse', async () => {
        let f: WordyRobbot_V1_Factory = new WordyRobbot_V1_Factory();
        let robbot = (await f.newUp({})).newIbGib;
        let timestampInTicks = getTimestampInTicks();
        let commentText = 'hey';
        let commentIbGib = (await createCommentIbGib({ text: commentText })).newIbGib;
        // let commentAddr = h.getIbGibAddr({ ibGib: commentIbGib });
        let { gib: commentGib } = h.getIbAndGib({ ibGib: commentIbGib });
        let commentGibInfo = getGibInfo({ gib: commentGib });
        let sessionId = 'session_yo';
        let addlMetadata = 'here_is_some_valid_metadata';
        let addlMetadata_Invalid = 'invalid spaces here';

        // #region get/parse normal, no metadata

        let ib = getRobbotSessionIb({
            robbot,
            timestampInTicks,
            contextTjpGib: commentGibInfo.tjpGib,
            sessionId,
        });
        expect(ib).toBeTruthy();
        expect(ib.startsWith(ROBBOT_SESSION_ATOM)).toBe(true, `doesnt start with robbot session atom. (${ib})`);
        expect(ib.match(timestampInTicks)).toBeTruthy(`timestampInTicks not included. (${ib}\n${timestampInTicks})`);
        expect(ib.match(sessionId)).toBeTruthy(`sessionId.\nib: ${ib}\nsessionId: ${sessionId}`);
        expect(ib.match(robbot.data.name)).toBeTruthy('robbot name');
        expect(ib.match(robbot.data.uuid)).toBeTruthy('robbot uuid');

        let { timestamp, robbotName,
            robbotClassname, robbotId, robbotTjpGib,
            sessionId: sessionId_Out, contextTjpGib,
            addlMetadata: addlMetadata_Out
        } = parseRobbotSessionIb({ ib });

        expect(timestamp).toBe(timestampInTicks, 'timestampInTicks');
        expect(robbotName).toBe(robbot.data.name, 'robbot name');
        expect(robbotClassname).toBe(robbot.data.classname, 'robbot classname');
        expect(robbotId).toBe(robbot.data.uuid, 'robbot uuid');
        expect(robbotTjpGib).toBe(getGibInfo({ gib: robbot.gib }).tjpGib, 'robbot tjpgib');
        expect(sessionId_Out).toBe(sessionId, 'sessionId');
        expect(contextTjpGib).toBe(getGibInfo({ gib: commentIbGib.gib }).tjpGib, 'contextTjpGib');
        expect(addlMetadata_Out).toBe(undefined, 'addlMetadata');

        // #endregion get/parse normal, no metadata

        // #region with addl metadata

        ib = getRobbotSessionIb({
            robbot,
            timestampInTicks,
            contextTjpGib: commentGibInfo.tjpGib,
            sessionId,
            addlMetadata,
        });

        expect(ib).toBeTruthy();
        expect(ib.startsWith(ROBBOT_SESSION_ATOM)).toBe(true, `2 doesnt start with robbot session atom. (${ib})`);
        expect(ib.match(timestampInTicks)).toBeTruthy(`2 timestampInTicks not included. (${ib}\n${timestampInTicks})`);
        expect(ib.match(sessionId)).toBeTruthy(`2 sessionId.\nib: ${ib}\nsessionId: ${sessionId}`);
        expect(ib.match(robbot.data.name)).toBeTruthy('2 robbot name');
        expect(ib.match(robbot.data.uuid)).toBeTruthy('2 robbot uuid');
        expect(ib.match(addlMetadata)).toBeTruthy('addlMetadata');

        // thanks https://flaviocopes.com/javascript-destructure-object-to-existing-variable/
        ({
            timestamp, robbotName,
            robbotClassname, robbotId, robbotTjpGib,
            sessionId: sessionId_Out, contextTjpGib, addlMetadata: addlMetadata_Out
        } = parseRobbotSessionIb({ ib }));

        expect(timestamp).toBe(timestampInTicks, '2 timestampInTicks');
        expect(robbotName).toBe(robbot.data.name, '2 robbot name');
        expect(robbotClassname).toBe(robbot.data.classname, '2 robbot classname');
        expect(robbotId).toBe(robbot.data.uuid, '2 robbot uuid');
        expect(robbotTjpGib).toBe(getGibInfo({ gib: robbot.gib }).tjpGib, '2 robbot tjpgib');
        expect(sessionId_Out).toBe(sessionId, '2 sessionId');
        expect(contextTjpGib).toBe(getGibInfo({ gib: commentIbGib.gib }).tjpGib, '2 contextTjpGib');
        expect(addlMetadata_Out).toBe(addlMetadata, 'addlMetadata');

        // #endregion with addl metadata

        // #region with INVALID addl metadata

        expect(() => getRobbotSessionIb({
            robbot,
            timestampInTicks,
            contextTjpGib: commentGibInfo.tjpGib,
            sessionId,
            addlMetadata: addlMetadata_Invalid,
        })).toThrowMatching(e => e.message.match(/26f52b1378d1ad01f20f8ef5a5441722/));

        // #endregion with INVALID addl metadata
    });

})
