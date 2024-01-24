const ACTION_NAME = {
    MoveForward:"MoveForward",
    MoveBackward:"MoveBackward",
    Download:"Download",
    CloseTab:"CloseTab",
}

let enabled = true;

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {

        switch(request.action){
            case ACTION_NAME.CloseTab:
                closeTab().then(sendResponse)
                return true;
            case ACTION_NAME.Download:
                downloadImage(request.url).then(sendResponse)
                return true;
        }
    }
);

const downloadImage = async (url) => {

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

const closeTab = async () => {

    const tabs = await chrome.tabs.query({active:true})

    if(!tabs[0]) return true;

    try{
        await chrome.tabs.remove(tabs[0].id);
        return true
    }catch(ex){
        return false;
    }
}

chrome.action.onClicked.addListener(
    async (tab) => {
        enabled = !enabled;
        toggleTitle();
        try{
            await chrome.tabs.sendMessage(tab.id, {enabled});
        }catch(ex){

        }
    }
)

chrome.tabs.onActivated.addListener(
    async (info) => {
        try{
            await chrome.tabs.sendMessage(info.tabId, {enabled});
        }catch(ex){

        }
    }
)

const toggleTitle = () => {
    if(enabled){
        chrome.action.setTitle({title:"Gesture - Enabled"})
    }else{
        chrome.action.setTitle({title:"Gesture - Disabled"})
    }
}