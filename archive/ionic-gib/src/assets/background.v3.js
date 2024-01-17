var lcFile = `[ibgib][extension background.js]`;
var logalot = true;
const ibgibUrl = "/index.html";

/**
 * I have it phrased this way so we can just say if (await script....)
 * @returns true if not injected yet
 */
async function scriptsAreAlreadyInjected(tabId) {
    const lc = `[${scriptsAreAlreadyInjected.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 65f3952e7fadb16f8f54bbb5405b0122)`); }

        return new Promise((resolve, reject) => {
            chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    // this is run in host web page.
                    const isInjected = !!document.ibgib;
                    return isInjected;
                }
            }, (result) => {
                if (!Array.isArray(result)) { throw new Error(`expected array back (E: 66b3be1840d24bc4876812328e1fd3f0)`); }
                if (result.length !== 1) { throw new Error(`expected array result length 1 (E: 7f703dcc479844dd996cbd83cd87bf5e)`); }

                const isInjected = result[0].result;
                resolve(isInjected);
            });
        });
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

async function injectScriptsAndCss(tabId) {
    const lc = `${lcFile}[${injectScriptsAndCss.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 5a8576278f71c51c6babfbc8b33a6d22)`); }

        if (await scriptsAreAlreadyInjected(tabId)) {
            if (logalot) { console.log(`${lc} await scriptsAreInjected() true. returning early. (I: 600a0f1340a38b406b617a256741a722)`); }
            return; /* <<<< returns early */
        }

        // insert js
        await new Promise((resolve) => {
            // inject select mode script/css
            chrome.scripting.executeScript({
                target: { tabId },
                files: ['injected.js']
            }, (result) => {
                console.log(`${lc}[script] result came back...`)
                console.dir(result);
                resolve();
            });
        });

        // insert css
        await new Promise((resolve) => {
            chrome.scripting.insertCSS({
                target: { tabId },
                files: ['injected.css']
            }, (result) => {
                console.log(`${lc}[css] result came back...`)
                console.dir(result);
                resolve();
            });
        });
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

// For some reason, inside the click handler loses scoped variables but not if I
// place them here.
const MENU_ITEM_PARENT_IBGIB = 'ibgib';
const MENU_ITEM_ADD_SELECTION = 'ADD selected text...';
const MENU_ITEM_ADD_LINK = 'ADD link...';
const MENU_ITEM_SELECT_MODE = 'MULTI select mode...';
const MENU_ITEM_END_SELECT_MODE_TITLE = 'END multi select mode (adds all selections)...';
const MENU_ITEM_CLEAR_SELECTIONS = 'CLEAR selections...';
const MENU_ITEM_EXEC_CREATE_IBGIB = 'CREATE ibgib';

/**
 *
 * @param key key to set
 * @param value to set
 * @returns Promise<void> to await
 */
function storageSet(objectKeysValues) {
    const lc = `${lcFile}[${storageSet.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: eda5c9b57ff5f76a99d3f97b9bfa6722)`); }
        return new Promise((resolve, reject) => {
            chrome.storage.local.set(objectKeysValues, () => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve();
            });
        });
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

function storageGet(arrayKeys) {
    const lc = `${lcFile}[${storageGet.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: e1b30fbe1df1ca7c29a8dd6f325e1522)`); }

        return new Promise((resolve, reject) => {
            chrome.storage.local.get(arrayKeys, (items) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve(items);
            });
        });
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

function storageGetAll() { return storageGet(null); }

function storageClear() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.clear(() => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve();
        })
    });
}



/**
 * action button click
 *
 * just opens the app in a new tab
 */
function initializeActionClick() {
    let lc = `${lcFile}[${initializeActionClick.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 4c5508a7e0c70168714e0c111c9b6b22)`); }
        if (logalot) { console.log(`${lc} adding listener to chrome.action (I: ae93c4d6b016306dc7abf56296213622)`); }
        chrome.action.onClicked.addListener((outerTab) => {
            if (logalot) { console.log(`${lc} action clicked (I: 636291cefb06f4cf6f216147ad0cb622)`); }
            if (logalot) { console.log(`${lc} outerTab.url: ${outerTab.url} (I: 225a884a6fba486c903bdaf4a0d5851e)`); }
            if (logalot) { console.log(`${lc} console.dir(outerTab)... (I: feead477bdfc4317b2ecc52d7d81741f)`); }
            if (logalot) { console.dir(outerTab); }

            if (logalot) { console.log(`${lc} creating tab... (I: 30c1dd8ba45b483c8c95aa66e4b2eff0)`); }
            // https://developer.chrome.com/docs/extensions/reference/tabs/#method-create
            chrome.tabs.create({ url: ibgibUrl }, async (tab) => {
                if (logalot) { console.log(`${lc} tab created. (I: 1967c7b8b6fa496b929018bd13eeaadf)`); }
                if (logalot) { console.log(`${lc} tab.url: ${tab.url} (I: 1967c7b8b6fa496b929018bd13eeaadf)`); }
                if (logalot) { console.log(`${lc} tab.pendingUrl: ${tab.pendingUrl} (I: 1a7a5a447ae6496cbbf652cdbe3fa2aa)`); }

                console.log(`await storageSet({ testingp: ['test1', 'test2', 'test3', 'wakka'] });`);
                await storageSet({
                    testing1: ['test1', 'test11', 'test111', 'wakka'],
                    testing2: ['test2', 'test22', 'test222', 'doodle'],
                    testing3: ['test3', 'test33'],
                });
                let resGet = await storageGet(['testing1', 'testing2']);
                console.log(`${lc} await storageGet(...);. resGet: ...`);
                console.dir(resGet);

                let resGetAll = await storageGetAll();
                console.log(`${lc} await storageGetAll(); resGetAll: ...`);
                console.dir(resGetAll);

                await storageClear();
                resGetAll = await storageGetAll();
                console.log(`${lc} await storageClear() THEN await storageGetAll() resGetAll: ...`);
                console.dir(resGetAll);
                // });
                // });
                // let resultAwait = await chrome.storage.sync.set({ testing: ['test1', 'test2', 'test3'] });
            });
        });
        if (logalot) { console.log(`${lc} success (I: 5eebbe46914b16c2ab3d0b4dc7197f22)`); }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

async function handleMenuItem_SelectMode(clickData, tabId) {
    const lc = `[${handleMenuItem_SelectMode.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: c4730aac00f17a1c9911486bbf550e22)`); }

        await injectScriptsAndCss(tabId);

        await new Promise((resolve, reject) => {
            chrome.scripting.executeScript({
                target: { tabId },
                func: () => { return ibToggleSelectMode(); }
            }, (result) => {
                console.log(`${lc}[executeScript] result came back...`)
                console.dir(result);

                if (!Array.isArray(result)) { throw new Error(`expected array back (E: 7e5271782065980c09371d1b942daa22)`); }
                if (result.length !== 1) { throw new Error(`expected array result length 1 (E: 86cd2ccae7526168deda17433f61fa22)`); }

                // update our context menu link items depending on if we're in select mode or not.
                const selectMode = result[0].result;
                if (selectMode) {
                    chrome.contextMenus.update(
                        MENU_ITEM_SELECT_MODE,
                        { title: MENU_ITEM_END_SELECT_MODE_TITLE, }
                    );
                } else {
                    chrome.contextMenus.update(
                        MENU_ITEM_SELECT_MODE,
                        { title: MENU_ITEM_SELECT_MODE, }
                    );
                }
                resolve(result);
            });
        });

    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

/**
 * gets the selections that the user has chosen to ibgib.
 *
 * @returns {Promise<Object[]>} selections array from (atow) injected.js
 */
async function getSelections(tabId, stripElements) {
    const lc = `[${getSelections.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 749ea6b342919db8373c05b9d44aca22)`); }

        await injectScriptsAndCss(tabId);

        let resSelections = [];

        /** @type {Object[] | undefined} */
        let rawSelections = await new Promise((resolve, reject) => {
            chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    // this is run in host web page.
                    return document.ibgib?.selections;
                }
            }, (result) => {
                if (!Array.isArray(result)) { throw new Error(`expected array back (E: e4c5ff1ff3a444cb86773a93304bbcb2)`); }
                if (result.length !== 1) { throw new Error(`expected array result length 1 (E: e32116a3b3044913b7d10bcbaef66399)`); }

                const selections = result[0].result ?? [];
                resolve(selections);
            });
        });
        rawSelections = rawSelections ?? [];
        if (rawSelections.length > 0 && stripElements) {
            // fucking plain text js sucks
            var stripEl = (s) => {
                return { type: s.type, text: s.text, url: s.url, children: s.children?.map(c => stripEl(c)) };
            }
            resSelections = rawSelections.map(x => stripEl(x));
        } else {
            resSelections = rawSelections;
        }

        if (logalot) { console.log(`${lc} resSelections: ${JSON.stringify(resSelections, null, 2)} (I: 3fb99ea63b9c8b5dcd870d3643133222)`); }
        if (logalot) { console.dir(resSelections); }

        return resSelections;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

async function getExtensionLaunchInfo(clickData, tabId) {
    const lc = `[${getExtensionLaunchInfo.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 3d149bec5f43d799ef7849540ce3eb22)`); }

        const selections = await getSelections(tabId, /*stripElements*/ true);
        if (selections.length === 0) {
            console.warn(`${lc} empty selections. (W: e2aa39d7cd6a4903a943ccc6a2ca38d9)`);
            return null; /* <<<< returns early */
        }

        /**
         * info we will pass to the ibgib app through the url params (couldn't
         * figure out event messaging).
         */
        const extensionLaunchInfo = {
            /**
             * indicate to the receiving angular app that we're launching
             * from an extension in firefox/chrome. (this is obvious here in
             * background.js but in the angular app, not so much).
             */
            isExtensionLaunch: true,
            /**
             * So consumer knows where this is coming from. (obvious to us
             * here, but helps consumer)
             */
            lc,
            /**
             * url of the page that _initiates_ the click and starts the app.
             * so if the user is on wikipedia.org, selects some text and clicks on the ibgib link,
             * in order to generate some ibgib data based on the page, this will be
             * https://en.wikipedia.org/wiki/Phanerozoic (or whatever).
             *
             * @link https://developer.chrome.com/docs/extensions/reference/contextMenus/#type-OnClickData
             */
            pageUrl: clickData.pageUrl,
            /**
             * Contains the actual infos for the selections the user made.
             */
            selectionInfos: selections,
        }

        return extensionLaunchInfo;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

async function handleMenuItem_ExecCreateIbGib(clickData, tabId) {
    const lc = `[${handleMenuItem_ExecCreateIbGib.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 23870576bfff23681f3619b75b340522)`); }
        if (logalot) { console.log(`${lc} preparing launch params (pageUrl, selectionText, ...) (I: d1135e0662b640335748719a57d53722)`); }

        const extensionLaunchInfo = await getExtensionLaunchInfo(clickData, tabId);
        if (!extensionLaunchInfo) {
            console.warn(`${lc} extensionLaunchInfo empty. returning early... (W: b51fafbab6d044818b4943ae44a190c1)`);
            return; /* <<<< returns early */
        }

        /**
         * instead of breaking out our event info into multiple params, we create
         * a wrapper object for params, and put the entire stringified object
         * into a single param that we will parse back into a JS object.
         */
        const msgObj = { extensionLaunchInfo: JSON.stringify(extensionLaunchInfo) };
        const launchParams = new URLSearchParams(msgObj).toString();

        // https://developer.chrome.com/docs/extensions/reference/tabs/#method-create
        chrome.tabs.create({ url: ibgibUrl + '?' + launchParams }, (tab) => {
            if (logalot) { console.log(`${lc} tab created. (I: 7aebd5f816d79c044c11e6e569031c22)`); }
        });
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

async function handleMenuItem_AddSelection(clickData, tabId) {
    const lc = `${handleMenuItem_AddSelection.name}`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 9f1a79c0b811348735a5ea7ea0764422)`); }

        await injectScriptsAndCss(tabId);

        // function addSelection({type, text, url}) {

        const arg = {
            type: 'comment',
            text: clickData.selectionText,
        };
        return new Promise((resolve, reject) => {
            chrome.scripting.executeScript({
                target: { tabId },
                func: (x) => { ibAddSelection(x); },
                args: [arg]
            }, (result) => {
                console.log(`${lc}[executeScript] result came back...`)
                resolve();
                console.dir(result);
            });
        });
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

async function handleMenuItem_AddLink(clickData, tabId) {
    const lc = `${handleMenuItem_AddLink.name}`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: ef85eba63f1d4e59bd533f216ca3a4b6)`); }

        await injectScriptsAndCss(tabId);

        // function addLink({type, text, url}) {

        const arg = {
            type: 'link',
            url: clickData.linkUrl,
        };
        return new Promise((resolve, reject) => {
            chrome.scripting.executeScript({
                target: { tabId },
                func: (x) => { ibAddSelection(x); },
                args: [arg]
            }, (result) => {
                console.log(`${lc}[executeScript] result came back...`)
                resolve();
                console.dir(result);
            });
        });
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

async function handleMenuItem_ClearSelections(clickData, tabId) {
    const lc = `[${handleMenuItem_ClearSelections.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: dd876ad752ada726ac9193f824726922)`); }

        await injectScriptsAndCss(tabId);

        return new Promise((resolve, reject) => {
            chrome.scripting.executeScript({
                target: { tabId },
                func: () => { ibClearSelections(); },
            }, (result) => {
                console.log(`${lc}[executeScript] result came back...`)
                resolve();
                console.dir(result);
            });
        });

    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}
function initializeCreateContextMenuItems() {
    const lc = `[${initializeCreateContextMenuItems.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: bbf1331f1c7f4909897a4434f6551822)`); }

        const menuItem_Parent = chrome.contextMenus.create({
            id: MENU_ITEM_PARENT_IBGIB,
            title: MENU_ITEM_PARENT_IBGIB,
            documentUrlPatterns: ['https://*/*', 'https://*/*'],
            contexts: ['all'],
        });

        chrome.contextMenus.create({
            parentId: MENU_ITEM_PARENT_IBGIB,
            id: MENU_ITEM_ADD_SELECTION,
            title: MENU_ITEM_ADD_SELECTION,
            type: 'normal',
            documentUrlPatterns: ['https://*/*', 'https://*/*'],
            contexts: ['selection'],
        });

        chrome.contextMenus.create({
            parentId: MENU_ITEM_PARENT_IBGIB,
            id: MENU_ITEM_ADD_LINK,
            title: MENU_ITEM_ADD_LINK,
            type: 'normal',
            documentUrlPatterns: ['https://*/*', 'https://*/*'],
            contexts: ['link'],
        });

        chrome.contextMenus.create({
            parentId: MENU_ITEM_PARENT_IBGIB,
            id: MENU_ITEM_SELECT_MODE,
            title: MENU_ITEM_SELECT_MODE,
            type: 'normal',
            documentUrlPatterns: ['https://*/*', 'https://*/*'],
            contexts: ['all'],
        });

        chrome.contextMenus.create({
            parentId: MENU_ITEM_PARENT_IBGIB,
            id: MENU_ITEM_CLEAR_SELECTIONS,
            title: MENU_ITEM_CLEAR_SELECTIONS,
            type: 'normal',
            documentUrlPatterns: ['https://*/*', 'https://*/*'],
            contexts: ['all'],
        });

        chrome.contextMenus.create({
            parentId: MENU_ITEM_PARENT_IBGIB,
            id: MENU_ITEM_EXEC_CREATE_IBGIB,
            title: MENU_ITEM_EXEC_CREATE_IBGIB,
            type: 'normal',
            documentUrlPatterns: ['https://*/*', 'https://*/*'],
            contexts: ['all'],
        });

    } catch (error) {
        console.error(`${lc} ${error.message}`);
        // throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

/**
 * context menu click
 *
 * opens app in new tab and passes in information
 */
function initializeContextMenuClick() {
    let lc = `${lcFile}[${initializeContextMenuClick.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 7b185c4afd53dd75dbd5314461ee3c22)`); }

        initializeCreateContextMenuItems();

        if (logalot) { console.log(`${lc} initializing contextMenus.onClicked (I: 62818c091ed5bf612fd564140cc1d222)`); }
        // https://developer.chrome.com/docs/extensions/reference/contextMenus/#type-OnClickData
        // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus/OnClickData
        chrome.contextMenus.onClicked.addListener(async (clickData, outerTab) => {
            console.log(`${lc} contextMenu link clicked. clickData.menuItemId: ${clickData.menuItemId}`);
            console.log(`${lc} clickData: `)
            console.dir(clickData);

            // for lack of a better name, "outer" tab means the tab that
            // initiates the context menu event. the "inner" tab is the one that
            // is generated in some of the handlers...  yes it's a bad name,
            // I'll change it one of these days.
            if (logalot) { console.log(`${lc} outerTab.url: ${outerTab.url} (I: ed8d0715d5434aa3932eefc7af5b1667)`); }
            if (logalot) { console.log(`${lc} console.dir(outerTab)... (I: fd989d970a704c2abdf9c2841bbdb514)`); }
            if (logalot) { console.dir(outerTab); }

            if (clickData.menuItemId === MENU_ITEM_EXEC_CREATE_IBGIB) {
                if (logalot) { console.log(`${lc} creating ${MENU_ITEM_EXEC_CREATE_IBGIB} tab... (I: 8cffc16cf3ccdfa52ebe565873360122)`); }
                await handleMenuItem_ExecCreateIbGib(clickData, outerTab.id);
            } else if (clickData.menuItemId === MENU_ITEM_ADD_SELECTION) {
                if (logalot) { console.log(`${lc} MENU_ITEM_ADD_SELECTION clicked (I: fa984a2992a114c6455f1a266116a822)`); }
                await handleMenuItem_AddSelection(clickData, outerTab.id);
            } else if (clickData.menuItemId === MENU_ITEM_ADD_LINK) {
                if (logalot) { console.log(`${lc} MENU_ITEM_ADD_LINK clicked (I: eaa76de3b7cc374926d7f13b7abc2422)`); }
                await handleMenuItem_AddLink(clickData, outerTab.id);
            } else if (clickData.menuItemId === MENU_ITEM_SELECT_MODE) {
                if (logalot) { console.log(`${lc} MENU_ITEM_SELECT_MODE clicked (I: ff8ef04326e847c7ac7e6f530d579993)`); }
                await handleMenuItem_SelectMode(clickData, outerTab.id);
            } else if (clickData.menuItemId === MENU_ITEM_CLEAR_SELECTIONS) {
                if (logalot) { console.log(`${lc} MENU_ITEM_CLEAR_SELECTIONS clicked (I: 1da6e37dd06340c29a1a4fe49faf5a27)`); }
                await handleMenuItem_ClearSelections(clickData, outerTab.id);
            } else {
                console.warn(`${lc} unknown menu item id: ${clickData.menuItemId}`);
            }
        });
        if (logalot) { console.log(`${lc} success (I: 78cfd7d3285fbe005cc882899ff0f722)`); }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

function fnGetTopTenWords() {
    var logalot = true;
    const words = [];
    if (document) {

    }
    return words;
}

function fnGetSelectedText() {
    const lc = `[${fnGetSelectedText.name}]`;
    var logalot = true;
    var text = "";
    try {
        if (logalot) { console.log(`${lc} starting... (I: f11f0668c6ce698f4dbbbd37c9e19422)`); }
        if (window && window.getSelection) {
            text = window.getSelection().toString();
        }
        return text;
    } catch (error) {
        text = "";
        console.error(`${lc} ${error.message}`);
    } finally {
        if (logalot) { console.log(`${lc} complete. text: ${text}`); }
        return text;
    }
}

function dynamicIbgibDocument() {
    const lc = `[${dynamicIbgibDocument.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 8548775212aa15f3aab3787c5f069322)`); }
        if (!document) {
            console.error(`${lc} document falsy. returning early. (E: 50cd480ed6fc40c8904e9bb750cdfbaa)`);
            return; /* <<<< returns early */
        }

    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

function initializeCommands() {
    const lc = `[${initializeCommands.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: a999a116eb6c1dc05b8c85a9f673af22)`); }
        chrome.commands.onCommand.addListener((command, outerTab) => {
            if (command === "enqueue_selection") {
                if (logalot) { console.log(`${lc} command: ${command} (I: 2437cbd757d85a45beb392fad9d5df22)`); }
                if (logalot) { console.log(`${lc} outerTab.url: ${outerTab.url} (I: 121415fc03564804b7e30d12271ef0aa)`); }
                if (logalot) { console.log(`${lc} console.dir(outerTab)... (I: 9802af573c95494f9495c6ffe30ef052)`); }
                if (logalot) { console.dir(outerTab); }

                chrome.scripting.executeScript({
                    target: {
                        tabId: outerTab.id,
                    },
                    func: fnGetSelectedText
                }, (result) => {
                    console.log(`${lc} result came back...`)
                    console.dir(result);
                });

            } else {
                console.error(`${lc} unknown command`)
            }
        });
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

function init() {
    let lc = `${lcFile}[${init.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: bf749fd2190b3c8cfbc9608b6e23ef22)`); }
        initializeActionClick();
        initializeContextMenuClick();
        initializeCommands();
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

init();