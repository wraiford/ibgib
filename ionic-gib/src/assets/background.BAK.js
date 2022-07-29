var lcBackground = `[extension background.js]`;
var logalot = true;
const ibgibUrl = "/index.html";

/**
 * For some reason, inside the click handler loses scoped variables but not if I
 * place them here.
 */
// const MENU_ITEM_PARENT_IBGIB = 'ibgib';
/**
 * For some reason, inside the click handler loses scoped variables but not if I
 * place them here.
 */
const MENU_ITEM_EXEC_CREATE_IBGIB = 'ibgib create';
/**
 * For some reason, inside the click handler loses scoped variables but not if I
 * place them here.
 */
const MENU_ITEM_ADD_SELECTION = 'ibgib queue selection...';
/**
 * For some reason, inside the click handler loses scoped variables but not if I
 * place them here.
 */
const MENU_ITEM_ADD_LINK = 'ibgib queue link...';

/**
 *
 * @param key key to set
 * @param value to set
 * @returns Promise<void> to await
 */
function storageSet(objectKeysValues) {
    const lc = `${lcBackground}[${storageSet.name}]`;
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
    const lc = `${lcBackground}[${storageGet.name}]`;
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
    let lc = `${lcBackground}[${initializeActionClick.name}]`;
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

/**
 * context menu click
 *
 * opens app in new tab and passes in information
 */
function initializeContextMenuClick() {
    let lc = `${lcBackground}[${initializeContextMenuClick.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 7b185c4afd53dd75dbd5314461ee3c22)`); }

        try {

            if (logalot) { console.log(`${lc} preparing extension menu links (I: 6a5ea16f0f0bca708a4787621da39622)`); }
            // var parent = chrome.contextMenus.create({"title": "Test parent item"});
            // const menuItem_Parent = chrome.contextMenus.create({
            //     id: MENU_ITEM_PARENT_IBGIB,
            //     title: MENU_ITEM_PARENT_IBGIB,
            //     documentUrlPatterns: ['https://*/*', 'https://*/*'],
            //     contexts: ['all'],
            // });

            chrome.contextMenus.create({
                // parentId: MENU_ITEM_PARENT_IBGIB,
                id: MENU_ITEM_ADD_SELECTION,
                title: MENU_ITEM_ADD_SELECTION,
                type: 'normal',
                documentUrlPatterns: ['https://*/*', 'https://*/*'],
                contexts: ['selection'],
            });

            chrome.contextMenus.create({
                // parentId: MENU_ITEM_PARENT_IBGIB,
                id: MENU_ITEM_ADD_LINK,
                title: MENU_ITEM_ADD_LINK,
                type: 'normal',
                documentUrlPatterns: ['https://*/*', 'https://*/*'],
                contexts: ['link'],
            });

            chrome.contextMenus.create({
                // parentId: MENU_ITEM_PARENT_IBGIB,
                id: MENU_ITEM_EXEC_CREATE_IBGIB,
                title: MENU_ITEM_EXEC_CREATE_IBGIB,
                type: 'normal',
                documentUrlPatterns: ['https://*/*', 'https://*/*'],
                contexts: ['all'],
            });
        } catch (error) {
            console.error(`${lc} error when creating menu item link...maybe duplicate create? console.dir(error`);
            console.dir(error);
        }


        if (logalot) { console.log(`${lc} initializing contextMenus.onClicked (I: 62818c091ed5bf612fd564140cc1d222)`); }
        // https://developer.chrome.com/docs/extensions/reference/contextMenus/#type-OnClickData
        // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus/OnClickData
        chrome.contextMenus.onClicked.addListener(function (itemData, outerTab) {
            console.log(`${lc} contextMenu link clicked. itemData.menuItemId: ${itemData.menuItemId}`);
            console.log(`${lc} itemData: `)
            console.dir(itemData);

            if (logalot) { console.log(`${lc} outerTab.url: ${outerTab.url} (I: ed8d0715d5434aa3932eefc7af5b1667)`); }
            if (logalot) { console.log(`${lc} console.dir(outerTab)... (I: fd989d970a704c2abdf9c2841bbdb514)`); }
            if (logalot) { console.dir(outerTab); }

            setTimeout(() => {
                chrome.scripting.executeScript({
                    target: {
                        tabId: outerTab.id,
                    },
                    // func: fnGetSelectedText
                    files: ['injected.js']
                }, (result) => {
                    console.log(`${lc}[yo] result came back...`)
                    console.dir(result);
                });
            }, 3000);

            /**
             * custom event info to pass in to the app
             * https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events
             */
            const eventInfo = {
                /** brand the event so we know it's ours */
                ib: true,
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
                 * text of the context menu clicked
                 * @link https://developer.chrome.com/docs/extensions/reference/contextMenus/#type-OnClickData
                 */
                menuItemId: itemData.menuItemId,
                /**
                 * url of the page that _initiates_ the click and starts the app.
                 * so if the user is on wikipedia.org, selects some text and clicks on the ibgib link,
                 * in order to generate some ibgib data based on the page, this will be
                 * https://en.wikipedia.org/wiki/Phanerozoic (or whatever).
                 *
                 * @link https://developer.chrome.com/docs/extensions/reference/contextMenus/#type-OnClickData
                 */
                pageUrl: itemData.pageUrl,
                /**
                 * selected text when initiating the app.
                 *
                 * @link https://developer.chrome.com/docs/extensions/reference/contextMenus/#type-OnClickData
                 */
                selectionText: itemData.selectionText || undefined,
            }

            if (logalot) { console.log(`${lc} preparing launch params (pageUrl, selectionText, ...) (I: d1135e0662b640335748719a57d53722)`); }
            /**
             * instead of breaking out our event info into multiple params, we create
             * a wrapper object for params, and put the entire stringified object
             * into a single param that we will parse back into a JS object.
             */
            const msgObj = { extensionLaunchInfo: JSON.stringify(eventInfo) };
            const launchParams = new URLSearchParams(msgObj).toString();

            if (itemData.menuItemId === MENU_ITEM_EXEC_CREATE_IBGIB) {
                if (logalot) { console.log(`${lc} creating ${MENU_ITEM_EXEC_CREATE_IBGIB} tab... (I: 8cffc16cf3ccdfa52ebe565873360122)`); }
                // https://developer.chrome.com/docs/extensions/reference/tabs/#method-create
                chrome.tabs.create({ url: ibgibUrl + '?' + launchParams }, (tab) => {
                    if (logalot) { console.log(`${lc} tab created. (I: 7aebd5f816d79c044c11e6e569031c22)`); }
                });
            } else if (itemData.menuItemId === MENU_ITEM_ADD_SELECTION) {
                if (logalot) { console.log(`${lc} MENU_ITEM_ADD_SELECTION clicked (I: fa984a2992a114c6455f1a266116a822)`); }
            } else if (itemData.menuItemId === MENU_ITEM_ADD_LINK) {
                if (logalot) { console.log(`${lc} MENU_ITEM_ADD_LINK clicked (I: eaa76de3b7cc374926d7f13b7abc2422)`); }
            } else {
                console.warn(`${lc} item`)
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
                debugger;
                if (logalot) { console.log(`${lc} command: ${command} (I: 2437cbd757d85a45beb392fad9d5df22)`); }
                if (logalot) { console.log(`${lc} outerTab.url: ${outerTab.url} (I: 121415fc03564804b7e30d12271ef0aa)`); }
                if (logalot) { console.log(`${lc} console.dir(outerTab)... (I: 9802af573c95494f9495c6ffe30ef052)`); }
                if (logalot) { console.dir(outerTab); }
                debugger;

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
    let lc = `${lcBackground}[${init.name}]`;
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
