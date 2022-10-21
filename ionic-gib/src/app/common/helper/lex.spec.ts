import { waitForAsync } from "@angular/core/testing";

import * as h from 'ts-gib/dist/helper';

import { DEFAULT_HUMAN_LEX_DATA_ENGLISH, SemanticId } from "../types/robbot";
import { Lex, LexData, PropsData } from "./lex";

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
                expect(firstRawDatum.props.semanticId).toBeTruthy();
                expect(firstRawDatum.props.semanticId).toEqual(id);
            });
        });

        describe('template refs', () => {

            type Term = 'aloha_specifier' | 'fancy' | 'short';
            const Term = {
                'aloha_specifier': 'aloha_specifier' as Term,
                'fancy': 'fancy' as Term,
                'short': 'short' as Term,
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
                        specifier: 'bare',
                        texts: ['$(hi)'],
                    },
                    {
                        specifier: 'specified',
                        texts: [`$(hi|{"specifier":"${Term.aloha_specifier}"})`],
                    },
                    {
                        specifier: 'keywords_fancyshort',
                        texts: [`$(hi|{"keywords":["${Term.fancy}"]})`],
                    },
                ],
            }

            let lex = new Lex(refTestData, {});
            fit('should get bare', () => {
                // multiple times to be sure it is always the same thing
                for (let i = 0; i < 50; i++) {
                    let result = lex.get('example_refs', { specifier: 'bare' });
                    expect(result.text).toEqual('hi');
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
                    const resIds = testLex.find({
                        fnDatumPredicate: x => x.texts?.includes(testText)
                    });

                    expect(resIds).toBeTruthy();
                    expect(resIds.length).toEqual(1, 'only one id should be found');
                    const foundId = resIds[0];
                    expect(foundId).toEqual(semanticId);
                }
            }
        });
    });

});
