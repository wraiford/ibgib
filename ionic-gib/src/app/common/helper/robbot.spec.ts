import { waitForAsync } from '@angular/core/testing';
import * as h from 'ts-gib/dist/helper';
import { IbGib_V1 } from "ts-gib/dist/V1";
import { getGibInfo } from "ts-gib/dist/V1/transforms/transform-helper";
import { CommentIbGib_V1 } from "../types/comment";
import { ROBBOT_SESSION_ATOM } from '../types/robbot';
import { IbGibRobbotAny } from '../witnesses/robbots/robbot-base-v1';
import { WordyRobbot_V1_Factory } from "../witnesses/robbots/wordy-robbot-v1";
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
    fit('get/parse', async () => {
        let f: WordyRobbot_V1_Factory = new WordyRobbot_V1_Factory();
        let robbot = (await f.newUp({})).newIbGib;
        let timestampInTicks = getTimestampInTicks();
        let commentText = 'hey';
        let commentIbGib = (await createCommentIbGib({ text: commentText })).newIbGib;
        let commentAddr = h.getIbGibAddr({ ibGib: commentIbGib });
        let { ib: commentIb, gib: commentGib } = h.getIbAndGib({ ibGib: commentIbGib });
        let commentGibInfo = getGibInfo({ gib: commentGib });
        let sessionId = 'session_yo';
        let addlMetadata = 'here_is_some_valid_metadata';
        let addlMetadata_Invalid = 'invalid spaces here';
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
            sessionId: sessionId_Out, contextTjpGib, addlMetadata: addlMetadata_Out
        } = parseRobbotSessionIb({ ib });

        expect(timestamp).toBe(timestampInTicks, 'timestampInTicks');
        expect(robbotName).toBe(robbot.data.name, 'robbot name');
        expect(robbotClassname).toBe(robbot.data.classname, 'robbot classname');
        expect(robbotId).toBe(robbot.data.uuid, 'robbot uuid');
        expect(robbotTjpGib).toBe(getGibInfo({ gib: robbot.gib }).tjpGib, 'robbot tjpgib');
        fail('leaving off here')
        // expect(ib.startsWith(ROBBOT_SESSION_ATOM)).toBe(true, `doesnt start with robbot session atom. (${ib})`);
        // expect(ib.match(timestampInTicks)).toBeTruthy(`timestampInTicks not included. (${ib}\n${timestampInTicks})`);
        // expect(ib.match(sessionId)).toBeTruthy(`sessionId.\nib: ${ib}\nsessionId: ${sessionId}`);
        // expect(ib.match(robbot.data.name)).toBeTruthy('robbot name');
        // expect(ib.match(robbot.data.uuid)).toBeTruthy('robbot uuid');
    });

})
