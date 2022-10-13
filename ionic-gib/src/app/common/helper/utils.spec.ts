import { getSaferSubstring, pickRandom, pickRandom_Letters, replaceCharAt } from "./utils";

describe('utils', () => {

    describe('getSaferSubstring', () => {

        const textsWithQuestionMarks = ['????yo?', '?start', 'end?', 'i?got?questions',];
        const textsWithOnlyNonAlphanumerics = ['(*^*%$%#%^#^%#??//', ':";\' "'];
        const textsWithCharacters = [...textsWithQuestionMarks, ...textsWithOnlyNonAlphanumerics, 'i have spaces', 'i-have-hyphens', 'i/got/slashes', 'got\\back\\slashes'];

        describe('with keepliterals empty', () => {

            it('should remove non alphanumerics', () => {
                for (let i = 0; i < textsWithCharacters.length; i++) {
                    const text = textsWithCharacters[i];
                    const saferText = getSaferSubstring({ text, keepLiterals: [] });
                    expect(saferText.match(/^\w+$/)).toBeTruthy(`nope: ${text}`);
                }
            });
        });

    });

    describe('pickRandom', () => {

        it('should pick a random letter from an array of letters', () => {
            const letters = ['a', 'b', 'c', 'd', 'E'];
            const letter = pickRandom({ x: letters });
            expect(letters.includes(letter)).toBeTruthy();
        });
        it('should pick a random number from an array of numbers', () => {
            const numbers = [0, 1, 2, 3, 4, 5, 6, 42];
            const n = pickRandom({ x: numbers });
            expect(numbers.includes(n)).toBeTruthy();
        });
        it('should ultimately pick each of the items over many iterations (m=10, i=1000)', () => {
            const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 42];
            const numbersPicked: Set<number> = new Set<number>();
            for (let i = 0; i < 1000; i++) {
                const n = pickRandom({ x: numbers });
                numbersPicked.add(n);
            }
            expect(numbersPicked.size).toEqual(numbers.length);
        });
    });

    describe('pickRandom_Letters', () => {

        it('should pick some random letters the size of count', () => {
            const counts = [1, 4, 15, 30, 100];
            for (let i = 0; i < counts.length; i++) {
                const count = counts[i];
                const letters = pickRandom_Letters({ count });
                expect(letters).toBeTruthy();
                expect(letters.length).toEqual(count);
                expect(letters.match(/^\w+$/)).toBeTruthy();
            }
        });
        it('should NOT pick the same letters in tight loop (counts=10,15 i=100)', () => {
            const counts = [10, 15];
            const iterations = 100;
            const alreadyPicked: Set<string> = new Set<string>();
            for (let i = 0; i < counts.length; i++) {
                const count = counts[i];
                for (let j = 0; j < iterations; j++) {
                    const letters = pickRandom_Letters({ count });
                    expect(alreadyPicked.has(letters)).toBeFalse();
                    alreadyPicked.add(letters);
                }
            }
        });

    });

    describe('replaceCharAt', () => {

        it('should replace chars in strings', () => {
            let test = 'this is a string (1) here woohoo!\nAnd this is (2) the second line.';
            let newChar = '_';

            let index1 = test.indexOf('1');
            let manuallyReplaced1 = `this is a string (${newChar}) here woohoo!\nAnd this is (2) the second line.`;
            let result1 = replaceCharAt({ s: test, pos: index1, newChar: '_' });
            expect(result1).toEqual(manuallyReplaced1);

            let index2 = test.indexOf('2');
            let manuallyReplaced2 = `this is a string (1) here woohoo!\nAnd this is (${newChar}) the second line.`;
            let result2 = replaceCharAt({ s: test, pos: index2, newChar: '_' });
            expect(result2).toEqual(manuallyReplaced2);
        });
    });
});
