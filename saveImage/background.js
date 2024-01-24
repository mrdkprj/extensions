let src;

chrome.contextMenus.create(
    {
        id:"saveimage",
        title:"Open",
    }

)

const onclick = async () => {

    if(src){
        const tabs = await chrome.tabs.query({active: true, currentWindow:true})
        await chrome.tabs.create({
            active:false,
            index:tabs[0].index + 1,
            openerTabId:tabs[0].id,
            url:src
        })
    }
}

chrome.contextMenus.onClicked.addListener(onclick)

chrome.runtime.onMessage.addListener(
    async function(request, sender, sendResponse) {
        src = request.url;
    }
);
