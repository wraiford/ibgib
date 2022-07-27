var lcBackground = `[extension background.js]`;
var logalot = true;
const ibgibUrl = "/index.html";


function initializeActionClick() {
    let lc = `${lcBackground}[${initializeActionClick.name}]`;
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
        if (logalot) { console.log(`${lc} success (I: 5eebbe46914b16c2ab3d0b4dc7197f22)`); }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

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
        chrome.contextMenus.create(menuItem_link);


        if (logalot) { console.log(`${lc} initializing contextMenus.onClicked (I: 62818c091ed5bf612fd564140cc1d222)`); }
        // https://developer.chrome.com/docs/extensions/reference/contextMenus/#type-OnClickData
        // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus/OnClickData
        chrome.contextMenus.onClicked.addListener(function (itemData) {
            console.log(`${lc} contextMenu link clicked. itemData.menuItemId: ${itemData.menuItemId}`);
            console.log(`${lc} itemData: `)
            console.dir(itemData);

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
