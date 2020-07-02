// export * from './core';
// export * from './ibgibs';
// import { func_transform_fork_V1 as fork } from './ibgibs/funcs/transforms/fork';
// import { func_transform_mut8_V1 as mut8 } from './ibgibs/funcs/transforms/mut8';
// import { func_transform_rel8_V1 as rel8 } from './ibgibs/funcs/transforms/rel8';
// import * as factory from './core/v1/factory';
// export class V1 { }
// V1.fork = fork;
// V1.mut8 = mut8;
// V1.rel8 = rel8;
// V1.factory = factory.Factory_V1;

export * as V1 from './V1/index';
export * from './types';
export * as IbGibHelper from './helper';

// export { fork } from './V1/transforms/fork';

export class TestClass {
    constructor() {
        console.log('yo instantiated');
    }
}
