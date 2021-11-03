console.log('yoooo');

const ibgibUrl = "/index.html";

chrome.browserAction.onClicked.addListener(() => {
    chrome.tabs.create({url: ibgibUrl});
});

const idLink = 'ibgib link';
const menuItem_link = {
    title: 'ibgib link',
    id: idLink,
    type: 'normal',
    documentUrlPatterns: ['https://*/*', 'https://*/*'],
    contexts: ['page'],
};

chrome.contextMenus.create(menuItem_link);

chrome.contextMenus.onClicked.addListener(function(itemData){
    if (itemData.id === idLink) {
        chrome.tabs.create({url: ibgibUrl});
    } else {
        console.log(`some other context menu item clicked.`);
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