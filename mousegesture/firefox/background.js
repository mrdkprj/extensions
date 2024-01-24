const ACTION_NAME = {
    MoveForward:"MoveForward",
    MoveBackward:"MoveBackward",
    Download:"Download",
    CloseTab:"CloseTab",
}

let enabled = true;

browser.runtime.onMessage.addListener(
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
        await browser.downloads.download(
            {
                url,
                saveAs:true,
                conflictAction:"overwrite"
            }
        )
        return true;
    }catch(ex){
        return false;
    }
}

const closeTab = async () => {

    const tabs = await browser.tabs.query({active:true})

    if(!tabs[0]) return true;

    try{
        await browser.tabs.remove(tabs[0].id);
        return true
    }catch(ex){
        return false;
    }
}

browser.action.onClicked.addListener(
    async (tab) => {
        enabled = !enabled;
        toggleTitle();
        try{
            await browser.tabs.sendMessage(tab.id, {enabled});
        }catch(ex){

        }
    }
)

browser.tabs.onActivated.addListener(
    async (info) => {
        try{
            await browser.tabs.sendMessage(info.tabId, {enabled});
        }catch(ex){

        }
    }
)

const toggleTitle = () => {
    if(enabled){
        browser.action.setTitle({title:"Gesture - Enabled"})
    }else{
        browser.action.setTitle({title:"Gesture - Disabled"})
    }
}