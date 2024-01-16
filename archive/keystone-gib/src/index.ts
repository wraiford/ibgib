export * as V1 from './V1/index';
export * from './types';

export class TestClass {
    constructor() {
        console.log('yo instantiated');
    }
}

export interface TestInterface {
    continue: 'include' | 'exclude' | false;
}
