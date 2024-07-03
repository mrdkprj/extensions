chrome.action.onClicked.addListener(

    async (tab) => {
        const tabs = await chrome.tabs.query({windowId:chrome.windows.WINDOW_ID_CURRENT})
        let urls = []
        tabs.forEach(tab => {
            urls.push(tab.url);
        });
        if(urls.length > 0 ){
            const url = await chrome.tabs.sendMessage(tab.id, urls);
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

    }
)