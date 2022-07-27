chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        alert("from a content script:" + sender.tab.url);
        if (request.persona == "pippo") {
            sendResponse({ risp: "ricevuto" });
        }
    }
);
