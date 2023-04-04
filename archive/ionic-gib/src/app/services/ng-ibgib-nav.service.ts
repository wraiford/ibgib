// import { Injectable } from '@angular/core';
// import { Router } from '@angular/router';

// import * as c from '../common/constants';
// import { IbgibNav, NavInfo } from './common.service';

// const logalot = c.GLOBAL_LOG_A_LOT || false;

// @Injectable({
//   providedIn: 'root'
// })
// export class NgIbgibNavService implements IbgibNav {

//   protected lc: string = `[${NgIbgibNavService.name}]`;

//   stack: NavInfo[] = [];

//   constructor(
//     private router: Router,
//   ) { }

//   async go({
//     toAddr,
//     fromAddr,
//     queryParamsHandling,
//     queryParams,
//     isModal,
//   }: NavInfo): Promise<void> {
//     const lc: string = `${this.lc}[${this.go.name}(${toAddr || 'undefined|null'}) from (${fromAddr || 'undefined|null'})]`;
//     if (logalot) { console.log(`${lc} starting...`); }
//     try {
//       await this.router.navigate(['ibgib', toAddr], {
//           queryParamsHandling: 'preserve',
//       }).then(resNav => {
//         if (resNav) {
//           this.stack.push({toAddr, fromAddr, queryParamsHandling, queryParams});
//         } else {
//           console.warn(`${lc} navigation failed. Did not add nav info to stack. (W: a9463a5b52ae4c78b24e4a73cf2bff62)`);
//         }
//       });

//     } catch (error) {
//       console.error(`${lc} ${error.message}`);
//     } finally {
//       if (logalot) { console.log(`${lc} complete.`); }
//     }
//   }


// }
