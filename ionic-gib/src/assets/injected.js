let lcFile = '[injected.js]';
console.log(`${lcFile} loading...`);
const logalot = false || true;

/**
 * Indicates that we have selected an element
 */
const SELECTED_CLASS = 'ib-selected';
const BACKGROUND_HIGHLIGHT = 'rgb(146,237,128,0.2)';
// attempt at multiple selection levels for headers/areas...too much for right now
// const CONTAINER_TAGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV'];

if (!document) { throw new Error(`${lcFile} document falsy (E: faf72962c295b4d2b73f5622a0d85822)`); }
/**
 * state that will be manipulated both in this file and in extension's background.js.
 */
document.ibgib = {
    /**
     * When a contextmenu event occurs on a paragraph (atow, i might add others),
     * this is stored as the paragraph which triggered the event.
     * @type HTMLElement
     */
    contextMenuElement: undefined,
    /**
     * selectMode is how to add multiple selections maybe more easily...my
     * d$%@ front end programming is s*@#.
     */
    selectMode: false,
    /**
     * selections that will be added to the final ibgib upon create execution.
     * @type []
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

function ibAddSelection({ type, text, url, p }) {
    const lc = `[${ibAddSelection.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 3429eae405bb2bdf3b5922bd5ef95822)`); }
        document.ibgib.selections.push({ type, text, url, p });
        showConfirmation(document.ibgib.contextMenuElement);
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
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

function toggleSelectMode() {
    const lc = `[${toggleSelectMode.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 559fa7a86995d15673aa2ad244d39f22)`); }
        if (document.ibgib.selectMode) {
            document.ibgib.selectMode = false;
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
