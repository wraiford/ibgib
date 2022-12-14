/// <reference lib="webworker" />

/**
 * This is the beginnings of an attempt at futzing around with offloading
 * processing to webworkers.
 */

import * as h from 'ts-gib/dist/helper';

addEventListener('message', async ({ data }) => {
  const lc = `[brainsWebWorker]`;

  let prevHash = 'nope';
  for (let i = 0; i < 100000000; i++) {
    prevHash = await h.hash({ s: i.toString() + prevHash });
    if (i % 100000 === 0) {

      console.log(`${lc} i: ${i}`);
      const response = {
        x: `doing hashes yay ${i}`,
        prevHash,
        i
      };
      postMessage(response);
    }
  }
  const response = `wakka yo worker response to ${data}`;
  postMessage(response);

});
