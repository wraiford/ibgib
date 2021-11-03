// import { HttpClient } from '@angular/common/http';
// import { Injectable } from '@angular/core';
// import { Lex, LexData } from 'lex-gib';


// const data: LexData = {
//   'hi': [
//     { texts: [ 'Hello!' ], },
//     { texts: [ 'Hi!' ], },
//   ],
//   'welcome': [
//     { texts: [ 'Welcome' ], },
//   ],
//   'greet': [
//     { texts: [ '$(hi) & $(welcome)!' ], },
//   ],
// };

// /*
//   Generated class for the TranslateGibProvider provider.

//   See https://angular.io/guide/dependency-injection for more info on providers
//   and Angular DI.
// */
// @Injectable()
// export class TranslateGibProvider {

//   lex: Lex;
//   protected readonly lc: string = `[${TranslateGibProvider.name}]`;

//   constructor(public http: HttpClient) {
//     console.log('Hello TranslateGibProvider Provider');

//     this.lex = new Lex(data, /*defaultLanguage*/ 'en-US');
//   }

//   /**
//    * Gets the translation/alternative for the given text id.
//    *
//    * @param id string id in lex data for the text to be gotten
//    */
//   async get(id: string): Promise<string> {
//     const lc = this.lc + `[get]`;
//     try {
//       const result = this.lex._(id);

//       if (result.text) {
//         return result.text;
//       } else {
//         console.warn(`${lc} lex-gib text is empty.`);
//         return id;
//       }
//     } catch (error) {
//       console.error(`${lc} ` + error);
//       return id;
//     }
//   }

// }
