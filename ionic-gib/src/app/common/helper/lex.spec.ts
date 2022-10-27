import { waitForAsync } from "@angular/core/testing";

import * as h from 'ts-gib/dist/helper';

import { DEFAULT_HUMAN_LEX_DATA_ENGLISH, SemanticId } from "../types/robbot";
import { Lex, LexData, PropsData } from "./lex";
import { unique } from "./utils";

describe('lex', () => {
    let testData: LexData<any>;
    let testLex: Lex<any>;

    beforeEach(waitForAsync(() => {
        testData = { ...h.clone(DEFAULT_HUMAN_LEX_DATA_ENGLISH) };
        console.dir(testData);
        testLex = new Lex(testData, {});
    }));

    describe('get', () => {
        it('semantic ids lookup...(assumes test data has semanticId from robbot helper)', () => {
            Object.keys(testData).forEach(id => {
                const result = testLex.get(id);
                expect(result).toBeTruthy();
                const firstRawDatum = result.rawData[0];
                expect(firstRawDatum).toBeTruthy();
                expect(firstRawDatum.props).toBeTruthy();
                // expect(firstRawDatum.props.semanticId).toBeTruthy();
                // expect(firstRawDatum.props.semanticId).toEqual(id);
            });
        });

        describe('template refs', () => {

            type Term = 'use_aloha' | 'aloha_specifier' | 'fancy' |
                'use_fancy' | 'use_fancy_and_short' |
                'short' | 'bare';
            const Term = {
                'aloha_specifier': 'aloha_specifier' as Term,
                'use_aloha': 'use_aloha' as Term,
                'fancy': 'fancy' as Term,
                'use_fancy': 'use_fancy' as Term,
                'use_fancy_and_short': 'use_fancy_and_short' as Term,
                'short': 'short' as Term,
                'bare': 'bare' as Term,
            }

            let refTestData: LexData<PropsData> = {
                'hi': [
                    { texts: ['hi'] },
                    { texts: ['aloha'], specifier: Term.aloha_specifier },
                    { texts: ['ciao'], keywords: [Term.fancy, Term.short] },
                    { texts: ['greetings'], keywords: [Term.fancy,] }
                ],
                'example_refs': [
                    {
                        // no keywords, specifiers or props, i.e. bare
                        texts: [`$(hi)`],
                    },
                    {
                        specifier: Term.use_aloha,
                        texts: [`$(hi|{"specifier":"${Term.aloha_specifier}"})`],
                    },
                    {
                        specifier: Term.use_fancy,
                        texts: [`$(hi|{"keywords":["${Term.fancy}"]})`],
                    },
                    {
                        specifier: Term.use_fancy_and_short,
                        texts: [`$(hi|{"keywords":["${Term.fancy}","${Term.short}"],"keywordMode":"all"})`],
                    },
                ],
            }
            const getAllTestTexts = (id: string) => {
                return refTestData[id].map(x => x.texts.join(''))
            };

            let lex = new Lex(refTestData, {});
            it('should get all hi\'s eventually', async () => {
                let allGotten: string[] = [];
                // many times to ensure we get each one at least once (probably)
                for (let i = 0; i < 50; i++) {
                    allGotten.push(lex.get('example_refs', {}).text)
                }
                allGotten = unique(allGotten);
                let allHiTexts = getAllTestTexts('hi');
                expect(allHiTexts.every(x => allGotten.includes(x))).toBeTrue();
            });
            it('should get specifier aloha', () => {
                // multiple times to be sure it is always the same thing
                for (let i = 0; i < 10; i++) {
                    const gottenText = lex.get('example_refs', { specifier: Term.use_aloha })?.text ?? '';
                    expect(gottenText).toEqual('aloha');
                }
            });
            it('should get keyword fancy', () => {
                const allFancyTexts = ['ciao', 'greetings'];
                let allGottenTexts: string[] = [];
                // multiple times to be sure it is always the same thing
                for (let i = 0; i < 11; i++) {
                    const gottenText = lex.get('example_refs', { specifier: Term.use_fancy })?.text ?? '';
                    allGottenTexts.push(gottenText);
                    expect(allFancyTexts.includes(gottenText)).toBeTrue();
                }
                // many times to ensure we get each one at least once (probably)
                allGottenTexts = unique(allGottenTexts);
                console.dir(allGottenTexts);
                expect(allFancyTexts.every(x => allGottenTexts.includes(x))).toBeTrue();
            });
            it('should get keyword fancy and short', () => {
                // multiple times to be sure it is always the same thing
                for (let i = 0; i < 11; i++) {
                    const gottenText = lex.get('example_refs', { specifier: Term.use_fancy_and_short })?.text ?? '';
                    expect(gottenText).toEqual('ciao')
                }
            });
        });
    });

    describe('find', () => {
        it('"help" predicate should find SemanticId.help', () => {
            const foundIds = testLex.find({
                fnDatumPredicate: (x => x.texts && x.texts.includes('help'))
            });
            expect(foundIds).toBeTruthy();
            expect(foundIds.length).toEqual(1);
            expect(foundIds[0]).toBeTruthy();
            expect(foundIds[0]).toEqual(SemanticId.help);
        });

        it('each human data should map to a single semantic id', () => {
            const dataIds = Object.keys(testData);
            const allSemanticIds = Object.values(SemanticId);
            for (let i = 0; i < dataIds.length; i++) {
                const dataId = dataIds[i];
                if (!allSemanticIds.includes(<any>dataId)) { continue; }

                /** rename to be explicit for tests */
                const semanticId = dataId;

                // for semantic ids, each text should map to one and only one
                // semanticId
                const datums = testData[dataId];
                for (let j = 0; j < datums.length; j++) {
                    const datum = datums[j];
                    if (datum.texts.length !== 1) { console.dir(datum) }
                    expect(datum.texts?.length).toEqual(1);
                    const testText = datum.texts[0];

                    // now do a find for that text, and it should return
                    // the single entry that corresponds to the semantic id
                    //
                    const resIds = testLex.find({
                        fnDatumPredicate: x =>
                            !!x.props?.semanticId && // only want to find ones corresponding to semantics
                            x.texts?.includes(testText) // narrow down to our test text
                    });

                    expect(resIds).toBeTruthy();
                    expect(resIds.length).toEqual(1);
                    const foundId = resIds[0];
                    expect(foundId).toEqual(semanticId);
                }
            }
        });
    });

});
