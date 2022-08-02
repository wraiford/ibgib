let lcFile = '[injected.js]';
console.log(`${lcFile} loading...`);
const logalot = false || true;

/**
 * Indicates that we have selected an element
 * @type {string}
 */
const SELECTED_CLASS = 'ib-selected';
/**
 * @type {string}
 */
const BACKGROUND_HIGHLIGHT = 'rgb(146,237,128,0.2)';
// attempt at multiple selection levels for headers/areas...too much for right now
/**
 * @type {string[]}
 */
const HEADER_TAGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8'];

if (!document) { throw new Error(`${lcFile} document falsy (E: faf72962c295b4d2b73f5622a0d85822)`); }

/**
 * state that will be manipulated both in this file and in extension's background.js.
 */
document.ibgib = {
    /**
     * When a contextmenu event occurs on a paragraph (atow, i might add others),
     * this is stored as the paragraph which triggered the event.
     * @type {HTMLElement}
     */
    contextMenuElement: undefined,
    /**
     * selectMode is how to add multiple selections maybe more easily...my
     * d$%@ front end programming is s*@#.

     * @type {boolean}
     */
    selectMode: false,
    /**
     * selections that will be added to the final ibgib upon create execution.
     * @type {Object[]}
     */
    selections: [],
};

function showConfirmation(el) {
    const lc = `[${showConfirmation.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 4f39c103efacd8dce8889516d0fc4122)`); }
        if (el) {
            if (!el.classList.contains('ib-selection-confirmed')) {
                el.classList.add('ib-selection-confirmed');
            }
            setTimeout(() => {
                if (el.classList.contains('ib-selection-confirmed')) {
                    el.classList.remove('ib-selection-confirmed');
                }
            }, 5000);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

function ibAddSelection({ type, text, url, el, parentEl }) {
    const lc = `[${ibAddSelection.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 3429eae405bb2bdf3b5922bd5ef95822)`); }
        document.ibgib.selections.push({ type, text, url, el, parentEl });
        showConfirmation(el ?? document.ibgib.contextMenuElement ?? document.body);
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} selections: ${JSON.stringify(document.ibgib.selections, null, 2)} (I: b9044181a1bf8af6c553122e27962622)`); }
        if (logalot) { console.log(`${lc} document.getElementsByClassName('${SELECTED_CLASS}').length: ${document.getElementsByClassName(SELECTED_CLASS).length} (I: b8f82e10729530371f1b3a7a6afae522)`); }
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

function ibClearSelections() {
    const lc = `[${ibClearSelections.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 7b6ffe82bd55b0ecd108f19f9557de22)`); }

        // clear the selections
        document.ibgib.selections = [];

        // remove any tagged elements
        let elements = document.getElementsByClassName(SELECTED_CLASS);
        for (let el of elements) { el.classList.remove(SELECTED_CLASS); }

        // show confirmation to the user that something happened
        showConfirmation(document.body);
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} selections: ${JSON.stringify(document.ibgib.selections, null, 2)} (I: b9044181a1bf8af6c553122e27962622)`); }
        if (logalot) { console.log(`${lc} complete.`); }
    }
}


function handleHeaderClick_SelectMode(h) {
    const lc = `${lcFile}[${handleHeaderClick_SelectMode.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 09904ded17d647c43997500b636b7f22)`); }

        if (h.classList.contains(SELECTED_CLASS)) {
            // already selected, so deselect and deselect any children p tags
            // until the next header

            h.classList.remove(SELECTED_CLASS);

            /** @type HTMLElement */
            let el = h;
            let counter = 0;
            while (el.nextElementSibling && counter < 100) {
                el = el.nextElementSibling;
                if (HEADER_TAGS.includes(el.tagName.toUpperCase())) {
                    // it's a header, and we only want to add it if it's a higher number (smaller header)
                    // if it's either the same or lower number (bigger heading) then we want to stop.
                    // e.g. 'h2' -> '2'     <=  'h3' -> '3' would be true
                    if (el.tagName.slice(1) <= h.tagName.slice(1)) {
                        break;
                    } else {
                        // smaller subsection, so remove the selected class
                        if (el.classList.contains(SELECTED_CLASS)) {
                            el.classList.remove(SELECTED_CLASS);
                        }
                    }
                }
                if (el.tagName.toUpperCase() === 'P' && el.classList.contains(SELECTED_CLASS)) {
                    el.classList.remove(SELECTED_CLASS);
                }
                counter++;
            }
        } else {
            // header not yet selected, so do so and all p's until end of section
            h.classList.add(SELECTED_CLASS);
            /** @type HTMLElement */
            let el = h;
            let counter = 0;
            while (el.nextElementSibling && counter < 100) {
                el = el.nextElementSibling;
                if (HEADER_TAGS.includes(el.tagName.toUpperCase())) {
                    // it's a header, and we only want to add it if it's a higher number (smaller header)
                    // if it's either the same or lower number (bigger heading) then we want to stop.
                    // e.g. 'h2' -> '2'     <=  'h3' -> '3' would be true
                    if (el.tagName.slice(1) <= h.tagName.slice(1)) {
                        break;
                    } else {
                        // smaller subsection, so add the selected class
                        if (!el.classList.contains(SELECTED_CLASS)) {
                            el.classList.add(SELECTED_CLASS);
                        }
                    }
                }
                if (el.tagName.toUpperCase() === 'P' && !el.classList.contains(SELECTED_CLASS)) {
                    el.classList.add(SELECTED_CLASS);
                }
                counter++;
            }
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} document.getElementsByClassName('${SELECTED_CLASS}').length: ${document.getElementsByClassName(SELECTED_CLASS).length} (I: 63cf9ff26301478c99fa3084fff43824)`); }
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

function handleHeaderClick(h) {
    const lc = `${lcFile}[${handleHeaderClick.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 0b78ef3e629648a49e98f8dec2a7b7ca)`); }

        if (document.ibgib.selectMode) {
            handleHeaderClick_SelectMode(h);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

function handleParagraphClick_SelectMode(p) {
    const lc = `${lcFile}[${handleParagraphClick_SelectMode.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 09904ded17d647c43997500b636b7f22)`); }

        if (p.classList.contains(SELECTED_CLASS)) {
            // already selected, so deselect and possibly deselect container
            // element

            p.classList.remove(SELECTED_CLASS);

            // /** @type HTMLElement */
            // let elContainer;
            // /** @type HTMLElement */
            // let el = p;
            // let counter = 0;
            // while (el.previousElementSibling && counter < 100) {
            //     if (CONTAINER_TAGS.includes(p.previousElementSibling.tagName)) {
            //         elContainer = p.previousElementSibling;
            //         break;
            //     }
            //     el = el.previousElementSibling;
            //     counter++;
            // }
            // if (elContainer) {
            //     // has a container.
            //     if (elContainer.classList.contains(SELECTED_CLASS)) {
            //         // container is selected and we have just clicked an
            //         // already selected subparagraph.
            //         elContainer.classList.remove(SELECTED_CLASS);
            //     }
            // }
        } else {
            // p not yet selected
            p.classList.add(SELECTED_CLASS);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} document.getElementsByClassName('${SELECTED_CLASS}').length: ${document.getElementsByClassName(SELECTED_CLASS).length} (I: 63cf9ff26301478c99fa3084fff43824)`); }
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

function handleParagraphClick(p) {
    const lc = `${lcFile}[${handleParagraphClick.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 09904ded17d647c43997500b636b7f22)`); }

        if (document.ibgib.selectMode) {
            handleParagraphClick_SelectMode(p);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

function handleParagraphContextMenu(p) {
    document.ibgib.contextMenuElement = p;
}

let paragraphs = [...document.getElementsByTagName('p')];
paragraphs.forEach(p => {
    p.addEventListener('click', event => {
        handleParagraphClick(p);
    });
    p.addEventListener('contextmenu', event => {
        handleParagraphContextMenu(p);
    });
});

let headers =
    HEADER_TAGS.flatMap(hTagName => Array.from(document.getElementsByTagName(hTagName)));
headers.forEach(h => {
    h.addEventListener('click', event => {
        handleHeaderClick(h);
    });
});

/**
 *
 * @param {HTMLElement} h header element
 * @returns {string} text
 */
function getTextFromHeader(h) {
    const lc = `[${getTextFromHeader.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 290b280ca392d8ecfb655a1f0de25322)`); }
        return h.textContent;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}
function toggleSelectMode() {
    const lc = `[${toggleSelectMode.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 559fa7a86995d15673aa2ad244d39f22)`); }
        if (document.ibgib.selectMode) {
            document.ibgib.selectMode = false;
            // convert selected texts into selections
            let elements = [...document.getElementsByClassName(SELECTED_CLASS)];
            for (let el of elements) {
                if (el.tagName === 'P') {
                    // selected paragraph
                    ibAddSelection({ type: 'comment', text: el.textContent, el, });
                    const linkEls = Array.from(el.childNodes).filter(x => x.tagName?.toUpperCase() === 'A');
                    for (let linkEl of linkEls) {
                        ibAddSelection({ type: 'link', url: linkEl.href, el: linkEl, parentEl: el });
                        // text: linkEl.textContent,
                    }
                } else if (HEADER_TAGS.includes(el.tagName?.toUpperCase())) {
                    // header
                    // going to prefix text with ### according to number (size)
                    // in h tag, e.g. <h2>Yo</h2> --> '## Yo' (two hashes).
                    const size = Number.parseInt(el.tagName.slice(1));
                    let hashes = '';
                    for (let i = 0; i < size; i++) { hashes += '#'; }
                    const text = `${hashes} ${el.textContent}}`;
                    ibAddSelection({ type: 'comment', text, el });
                } else {
                    // unknown?
                    console.warn(`${lc} SKIPPING unknown element el.tagName: ${el.tagName} (W: 2ef51b2779aa41e3a169b490a0cd5b68)`);
                }

                el.classList.remove(SELECTED_CLASS);
            }
        } else {
            document.ibgib.selectMode = true;
        }



        console.log(`${lc} document.ibgib.selectMode: ${document.ibgib.selectMode}`);
        return document.ibgib.selectMode;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

console.log(`${lcFile} loaded.`);
