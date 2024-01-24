chrome.runtime.onMessage.addListener(
    async function(request, sender, sendResponse) {

        const tab = await chrome.tabs.query({active: true, currentWindow:true})
        await chrome.tabs.create({
            active:false,
            openerTabId:tab.id,
            url:request.url
        })

    }
);
