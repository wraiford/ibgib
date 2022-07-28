var lcBackground = `[extension background.js]`;
var logalot = true;
const ibgibUrl = "/index.html";

// document is falsy in this script, because it runs in a service worker now
// let location = document?.location?.toString();
// console.warn(`${lcBackground} document.location.toString(): ${location}`);
function injectedFunction() {
    let a = 'a';
    // document.body.style.borderColor = 'orange';
    // document.body.style.borderWidth = '5px';
    // document.body.style.borderStyle = 'solid';
}
// console.log('injectedFunction yo');
// const lc = `[injectedFunction]`;
// try {
//     if (logalot) { console.log(`${lc} starting... (I: 73b10ee1c6b5a824cbfa55c822bc5322)`); }
// } catch (error) {
//     console.error(`${lc} ${error.message}`);
//     throw error;
// } finally {
//     if (logalot) { console.log(`${lc} complete.`); }
// }

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
            chrome.tabs.create({ url: ibgibUrl }, (tab) => {
                if (logalot) { console.log(`${lc} tab created. (I: 1967c7b8b6fa496b929018bd13eeaadf)`); }
                if (logalot) { console.log(`${lc} tab.url: ${tab.url} (I: 1967c7b8b6fa496b929018bd13eeaadf)`); }
                if (logalot) { console.log(`${lc} tab.pendingUrl: ${tab.pendingUrl} (I: 1a7a5a447ae6496cbbf652cdbe3fa2aa)`); }
                if (logalot) { console.log(`${lc} calling executeScript... (I: 9640c2f315bf5112a97028e5088cd222)`); }
                try {
                    if (logalot) { console.log(`${lc} console.dir(tab)... (I: 29d84df078b7810af44f80ea2b858422)`); }
                    console.dir(tab);
                    setTimeout(() => {
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            // function: injectedFunction
                            files: ['injected.js'],
                        }, resScript => {
                            if (logalot) { console.log(`${lc} executeScript complete. console.dir(resScript)...: (I: 9640c2f315bf5112a97028e5088cd222)`); }
                            console.dir(resScript);
                        });
                    }, 3000);
                } catch (error) {
                    console.error(`${lc} executeScript errored. Error: ${error.message}`);
                } finally {
                    if (logalot) { console.log(`${lc} execute script try-catch-finally complete (I: 2d3956095e586c6cb4ee6ea26250a222)`); }
                }
                // chrome.storage.sync.set('')
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

        if (logalot) { console.log(`${lc} preparing extension menu links (I: 6a5ea16f0f0bca708a4787621da39622)`); }
        const menuItemId_IbgibLink = 'ibgib link';
        const menuItem_link = {
            title: 'ibgib link',
            id: menuItemId_IbgibLink,
            type: 'normal',
            documentUrlPatterns: ['https://*/*', 'https://*/*'],
            contexts: [
                // right-click on page background
                'page',
                // right-click with selection
                'selection'
            ],
        };
        try {
            chrome.contextMenus.create(menuItem_link);
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

            if (logalot) { console.log(`${lc} preparing launch params (pageUrl, selectionText, ...) (I: d1135e0662b640335748719a57d53722)`); }
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
            /**
             * instead of breaking out our event info into multiple params, we create
             * a wrapper object for params, and put the entire stringified object
             * into a single param that we will parse back into a JS object.
             */
            const msgObj = { extensionLaunchInfo: JSON.stringify(eventInfo) }
            const launchParams = new URLSearchParams(msgObj).toString();

            if (itemData.menuItemId === menuItemId_IbgibLink) {
                if (logalot) { console.log(`${lc} creating ${menuItemId_IbgibLink} tab... (I: 8cffc16cf3ccdfa52ebe565873360122)`); }

                // https://developer.chrome.com/docs/extensions/reference/tabs/#method-create
                chrome.tabs.create({ url: ibgibUrl + '?' + launchParams }, (tab) => {
                    if (logalot) { console.log(`${lc} tab created. (I: 7aebd5f816d79c044c11e6e569031c22)`); }
                });
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

function init() {
    let lc = `${lcBackground}[${init.name}]`;
    try {

        if (logalot) { console.log(`${lc} starting... (I: bf749fd2190b3c8cfbc9608b6e23ef22)`); }
        initializeActionClick();
        initializeContextMenuClick();
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

init();
