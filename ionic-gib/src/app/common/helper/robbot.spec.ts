import { IbGib_V1 } from "ts-gib/dist/V1";
import { getRequestTextFromComment } from "./robbot";

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
