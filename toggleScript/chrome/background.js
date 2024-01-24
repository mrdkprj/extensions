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

const ruleBase = {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        { "header": "Content-Security-Policy", "operation": "set", "value": "script-src 'none'" }
      ]
    },
    "condition": {"requestDomains": ["nothing"],"resourceTypes": ["main_frame", "sub_frame"] }
}

const toggleTitle = async (url) => {

    const host = new URL(url).host;

    const disable = domains.includes(host);

    if(disable){
        await chrome.action.setTitle({title:"Disabled"})
        await chrome.action.setIcon({path:disabledIcons})
    }else{
        await chrome.action.setTitle({title:"Enabled"})
        await chrome.action.setIcon({path:enabledIcons})
    }
}


const replaceRule = async () => {

    ruleBase.condition.requestDomains = domains.length ? domains : ["nothing"];

    const rules = await chrome.declarativeNetRequest.getDynamicRules();

    if(rules.length){
        await chrome.declarativeNetRequest.updateDynamicRules({addRules:[ruleBase], removeRuleIds:[1]})
    }else{
        await chrome.declarativeNetRequest.updateDynamicRules({addRules:[ruleBase]})
    }

}

( async () => {

    const result = await chrome.storage.local.get(["domains"])

    if(!Object.keys(result).length) return;

    domains = result.domains;

    await replaceRule();

})()


const changeRule = async (tab) => {

    const host = new URL(tab.url).host;

    if(domains.includes(host)){
        const index = domains.indexOf(host);
        domains.splice(index, 1)
    }else{
        domains.push(host)
    }

    await chrome.storage.local.set({ domains })

    await replaceRule();

    await chrome.tabs.reload(tab.id)

    toggleTitle(tab.url);
}

chrome.action.onClicked.addListener(

    async (tab) => {

        try{
            await changeRule(tab);
        }catch(ex){
            console.log(ex)
        }
    }
)

chrome.tabs.onActivated.addListener(
    async (info) => {
        try{
            const tab = await chrome.tabs.get(info.tabId);
            toggleTitle(tab.url);
        }catch(ex){
            console.log(ex)
        }
    }
)
