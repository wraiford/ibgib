var lc = `[extension background.js]`;
var logalot = true;

try {
    if (logalot) { console.log(`${lc} starting... (I: bf749fd2190b3c8cfbc9608b6e23ef22)`); }

    const ibgibUrl = "/index.html";

    if (logalot) { console.log(`${lc} adding listener to chrome.browserAction (I: ae93c4d6b016306dc7abf56296213622)`); }
    chrome.browserAction.onClicked.addListener(() => {
        chrome.tabs.create({ url: ibgibUrl });
    });

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

    /** set up listening part of app message bridge */
    const lcBridge = `${lc}[bridge]`;
    console.log(`${lcBridge} init window event listener message bridge`)

    window.addEventListener("message", (e) => {
        // debugger;
        console.log(`${lcBridge} window event listener message received`)
        console.dir(e);
        if (e.ib) {
            // console.log(`${lc} e: ${JSON.stringify()}`);
            console.dir(e);
        } else {
            debugger;
        }
    });

    if (logalot) { console.log(`${lc} initializing contextMenus.onClicked (I: 62818c091ed5bf612fd564140cc1d222)`); }
    // https://developer.chrome.com/docs/extensions/reference/contextMenus/#type-OnClickData
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus/OnClickData
    chrome.contextMenus.onClicked.addListener(function (itemData) {
        if (itemData.id === idLink) {
            chrome.tabs.create({ url: ibgibUrl });
        } else {
            // debugger;

            // my custom info that i want to pass to the angular application via a
            // custom event bridge.
            // https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events
            let eventInfo = {
                ib: true,
                lc,
                menuItemId: itemData.menuItemId,
                pageUrl: itemData.pageUrl,
                selectionText: itemData.selectionText || undefined,
            }

            const handle = chrome.tabs.create({ url: ibgibUrl, }, (tab) => {
                try {
                    if (logalot) { console.log(`${lc} starting... (I: 508e9bf3638af0c6081123834594ff22)`); }
                    debugger;
                    // console.log(`${lc} trying with window.postMessage`);
                    // window.postMessage({
                    //   type: 'ib',
                    //   ib: true,
                    //   text: 'hello'
                    // });
                    const ibExtEvent = new CustomEvent('ibExtEvent', { detail: eventInfo });
                    debugger;
                    // window.postMessage(eventInfo)
                    // window.dispatchEvent(ibExtEvent);
                    debugger;
                    // if (tab.dispatchEvent) {
                    //     tab.dispatchEvent(ibExtEvent);
                    // } else {
                    //     debugger;
                    //     tab
                    // }
                } catch (error) {
                    debugger;
                    console.error(`${lc} ${error.message}`);
                    throw error;
                } finally {
                    if (logalot) { console.log(`${lc} complete.`); }
                }
            });

            // https://developer.chrome.com/docs/extensions/reference/tabs/#method-create
            console.log(`${lc} hoogleberries context menu item clicked 9:20 am.`);

        }
    });

    /*
        "browser_action": {
            "default_area": "personaltoolbar",
            "default_popup": "index.html",
            "default_title": "ibgib",
            "default_icon": {
                "32": "/assets/icon/favicon.png",
                "64": "/assets/icon/favicon.png"
            }
        },
    */
} catch (error) {
    console.error(`${lc} ${error.message}`);
    throw error;
} finally {
    if (logalot) { console.log(`${lc} complete.`); }
}
