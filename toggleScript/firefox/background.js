let domains = [];

const disabledIcons = {
    "16": "./icons/disable/16.png",
    "32": "./icons/disable/32.png",
    "48": "./icons/disable/48.png",
    "128": "./icons/disable/128.png"
}

const enabledIcons = {
    "16": "./icons/enable/16.png",
    "32": "./icons/enable/32.png",
    "48": "./icons/enable/48.png",
    "128": "./icons/enable/128.png"
}

const toggleTitle = async (url) => {

    const host = new URL(url).host;

    const disable = domains.includes(host);

    if(disable){
        await browser.browserAction.setTitle({title:"Disabled"})
        await browser.browserAction.setIcon({path:disabledIcons})
    }else{
        await browser.browserAction.setTitle({title:"Enabled"})
        await browser.browserAction.setIcon({path:enabledIcons})
    }
}


( async () => {

    const result = await browser.storage.local.get(["domains"])

    if(!Object.keys(result).length) return;

    domains = result.domains;

})()


const changeRule = async (tab) => {

    const host = new URL(tab.url).host;

    if(domains.includes(host)){
        const index = domains.indexOf(host);
        domains.splice(index, 1)
    }else{
        domains.push(host)
    }

    await browser.storage.local.set({ domains })

    await browser.tabs.reload(tab.id)

    toggleTitle(tab.url);
}

const handle = async (details) => {

    const host = new URL(details.url).host
console.log(host)
console.log(domains)
    if(domains.includes(host)){
        details.responseHeaders["Content-Security-Policy"] = "script-src 'none'"
    }

    return {
        responseHeaders : details.responseHeaders
    }

}

browser.webRequest.onHeadersReceived.addListener(
    handle,
    {
        urls: ["<all_urls>"],
        types: ["main_frame", "sub_frame"],
    },
    ["blocking","responseHeaders"]
)

browser.browserAction.onClicked.addListener(

    async (tab) => {

        try{
            await changeRule(tab);
        }catch(ex){
            console.log(ex)
        }
    }
)

browser.tabs.onActivated.addListener(
    async (info) => {
        try{
            const tab = await browser.tabs.get(info.tabId);
            toggleTitle(tab.url);
        }catch(ex){
            console.log(ex)
        }
    }
)
