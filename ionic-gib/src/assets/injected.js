const lc = '[injected.js]';
console.log(`${lc}`);

if (!document) { throw new Error(`document falsy (E: faf72962c295b4d2b73f5622a0d85822)`); }



let paragraphs = [...document.getElementsByTagName('p')];
paragraphs.forEach(p => {
    p.addEventListener('click', ((event) => {
        debugger;
        console.dir(event);
    }));
});
