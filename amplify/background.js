let url = "";

chrome.contextMenus.create(
    {
        id:"save_media_menu",
        title:"Save Media",
    },
)

chrome.contextMenus.create(
    {
        id:"open_media_menu",
        title:"Open Media In New Tab",
    },
)

chrome.contextMenus.onClicked.addListener( async (info, tab) => {
    console.log(url)
    if(info.menuItemId == "save_media_menu"){
        await downloadImage();
    }

    if(info.menuItemId == "open_media_menu"){
        if(!tab) return;
        await openImage(tab.id);
    }
})

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        url = request.url
    }
);

const downloadImage = async () => {

    if(!url) return true;

    try {
        await chrome.downloads.download(
            {
                url,
                saveAs:true,
                conflictAction:"uniquify"
            }
        )
        return true;
    }catch(ex){
        return false;
    }
}

const openImage = async (tabId) => {

    if(!url) return true;

    await chrome.tabs.create({
        active:false,
        openerTabId:tabId,
        url:url
    })
}