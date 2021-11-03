// import _ from 'lodash';
// import * as ibgib from 'ts-gib';
// import { V1 } from 'ts-gib';
import { TestClass } from '../../core/src/index';
// var TestClass = import('../../core/src/index');
// var t = require('../../core/src/index');

chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.set({color: '#3aa757'}, function() {
        console.log('the color is green');
        let blah = new TestClass();
    });
})

// function component() {
//     const element = document.createElement('div');
//     console.log('hello')

//     // lodash, currently included via a script, is required for this line to work
//     // lodash, now imported by this script

//     // element.innerHTML = _.join(['hello', 'webpack', someText], ' ');
//     // element.innerHTML = _.join(['hello', 'webpack'], ' ');
//     element.innerHTML = 'hello there ts'

//     // ibgib.V1.hashToHexCopy("something").then((someText) => {
//     //     console.log(someText);
//     // })

//     return element;
// }

// document.body.appendChild(component());
