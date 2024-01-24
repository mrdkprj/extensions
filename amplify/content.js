window.addEventListener("contextmenu", async (e) => {
    console.log(e.target)
        const target = e.target;

        if(target.tagName.toLowerCase() == "img"){
            return await chrome.runtime.sendMessage({url: target.src});
        }

        const img = target.parentElement.querySelector("img")

        await chrome.runtime.sendMessage({url: img ? img.src : ""});
})