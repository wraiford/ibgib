import { waitForAsync } from "@angular/core/testing";
import { pickRandom, pickRandom_Letters } from "./utils";

describe('utils', () => {

    beforeEach(waitForAsync(() => {

    }));

    describe('pickRandom', () => {

        fit('should pick a random letter from an array of letters', () => {
            const letters = ['a', 'b', 'c', 'd', 'E'];
            const letter = pickRandom({ x: letters });
            expect(letters.includes(letter)).toBeTruthy();
        });
        fit('should pick a random number from an array of numbers', () => {
            const numbers = [0, 1, 2, 3, 4, 5, 6, 42];
            const n = pickRandom({ x: numbers });
            expect(numbers.includes(n)).toBeTruthy();
        });
        fit('should ultimately pick each of the items over many iterations (m=10, i=1000)', () => {
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

        fit('should pick some random letters the size of count', () => {
            const counts = [1, 4, 15, 30, 100];
            for (let i = 0; i < counts.length; i++) {
                const count = counts[i];
                const letters = pickRandom_Letters({ count });
                expect(letters).toBeTruthy();
                expect(letters.length).toEqual(count);
                expect(letters.match(/^\w+$/)).toBeTruthy();
            }
        });
        fit('should NOT pick the same letters in tight loop (counts=10,15 i=100)', () => {
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
});
