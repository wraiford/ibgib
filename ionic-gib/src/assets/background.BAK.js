let lc = `[extension background.js]`;
var logalot = true;
const ibgibUrl = "/index.html";


function initializeActionClick() {
    let lc = `${lc}[${initializeActionClick.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 4c5508a7e0c70168714e0c111c9b6b22)`); }
        // initialize the action button (and not a context menu click)
        if (logalot) { console.log(`${lc} adding listener to chrome.action (I: ae93c4d6b016306dc7abf56296213622)`); }
        chrome.action.onClicked.addListener(() => {
            if (logalot) { console.log(`${lc} action clicked (I: 636291cefb06f4cf6f216147ad0cb622)`); }

            if (logalot) { console.log(`${lc} creating tab... (I: 30c1dd8ba45b483c8c95aa66e4b2eff0)`); }
            // https://developer.chrome.com/docs/extensions/reference/tabs/#method-create
            chrome.tabs.create({ url: ibgibUrl }, (tab) => {
                if (logalot) { console.log(`${lc} tab created. (I: 1967c7b8b6fa496b929018bd13eeaadf)`); }
            });
        });
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

function initializeContextMenuClick() {
    let lc = `${lc}[${initializeActionClick.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 7b185c4afd53dd75dbd5314461ee3c22)`); }

        if (logalot) { console.log(`${lc} preparing extension menu links (I: 6a5ea16f0f0bca708a4787621da39622)`); }
        const idLink = 'ibgib link';
        const menuItem_link = {
            title: 'ibgib link',
            id: idLink,
            type: 'normal',
            documentUrlPatterns: ['https://*/*', 'https://*/*'],
            contexts: [
                // right-click on page background
                'page',
                // right-click with selection
                'selection'
            ],
        };
        chrome.contextMenus.create(menuItem_link);

        if (logalot) { console.log(`${lc} preparing launch params (pageUrl, selectionText, ...) (I: d1135e0662b640335748719a57d53722)`); }
        /**
         * custom event info to pass in to the app
         * https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events
         */
        const eventInfo = {
            ib: true,
            lc,
            menuItemId: itemData.menuItemId,
            pageUrl: itemData.pageUrl,
            selectionText: itemData.selectionText || undefined,
        }
        /**
         * instead of breaking out our event info into multiple params, we create
         * a wrapper object for params, and put the entire stringified object
         * into a single param that we will parse back into a JS object.
         */
        const msgObj = { extensionLaunchInfo: JSON.stringify(eventInfo) }
        const launchParams = new URLSearchParams(msgObj).toString();

        if (logalot) { console.log(`${lc} initializing contextMenus.onClicked (I: 62818c091ed5bf612fd564140cc1d222)`); }
        // https://developer.chrome.com/docs/extensions/reference/contextMenus/#type-OnClickData
        // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus/OnClickData
        chrome.contextMenus.onClicked.addListener(function (itemData) {
            console.log(`${lc} contextMenu link clicked. itemData.id: ${itemData.id}`);

            if (itemData.id === idLink) {
                if (logalot) { console.log(`${lc} creating ${idLink} tab... (I: 8cffc16cf3ccdfa52ebe565873360122)`); }

                // https://developer.chrome.com/docs/extensions/reference/tabs/#method-create
                chrome.tabs.create({ url: ibgibUrl + '?' + launchParams }, (tab) => {
                    if (logalot) { console.log(`${lc} tab created. (I: 7aebd5f816d79c044c11e6e569031c22)`); }
                });
            }
        });
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

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
