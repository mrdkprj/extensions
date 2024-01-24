const storageKeys = {
    version: "version",
    specificRule: "specific_rule"
}
let rules = {};

( async () => {

    const versionMatched = async () => {
        const storageData = await chrome.storage.local.get([storageKeys.version])
        const ruleVersionUrl = await chrome.runtime.getURL("version.txt")
        const ruleVersion = await (await fetch(ruleVersionUrl)).text()

        return {
            matched: storageData[storageKeys.version] === ruleVersion,
            version: ruleVersion
        }
    }

    const versionCheckResult = await versionMatched();

    if(!versionCheckResult.matched){
        console.log("Updating rules")
        await chrome.storage.local.set({ [storageKeys.version]: versionCheckResult.version })
        const specificRuleUrl = await chrome.runtime.getURL("css.json")
        const specificRule = await (await fetch(specificRuleUrl)).json();
        await chrome.storage.local.set({ [storageKeys.specificRule]: specificRule })
    }

    const data = await chrome.storage.local.get([storageKeys.specificRule])
    rules = data[storageKeys.specificRule]

})()

const getDomain = (url) => {
    return new URL(url).host.replace("www.","")
}

const onCreated = async (tab) => {

    const url = tab.url ?? tab.pendingUrl

    if(!url) return

    const domain = getDomain(url)

    if(rules[domain]){
        await injectCss(tabId, rules[domain].css)
    }

}
const onUpdated = async (tabId,  changeInfo, tab) => {

    if(!changeInfo.status && !changeInfo.title && !changeInfo.url) return;

    const url = changeInfo.url ?? (tab.url ?? tab.pendingUrl)

    if(!url) return

    const domain = getDomain(url)

    if(rules[domain]){
        await injectCss(tabId, rules[domain].css)
    }

}

const injectCss = async (tabId, css) => {

    await chrome.scripting.insertCSS({
        css,
        target:{
            allFrames:true,
            tabId,
        }
    })
}

chrome.tabs.onCreated.addListener(onCreated)
chrome.tabs.onUpdated.addListener(onUpdated)
