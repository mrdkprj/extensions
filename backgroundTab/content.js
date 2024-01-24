window.addEventListener("click", (e) => {

    if(e.ctrlKey || e.button != 0) return;

    const path = e.composedPath();

    if(!path) return;

    const anchors = path.filter(node => node instanceof HTMLAnchorElement)

    if(anchors.length <= 0 || anchors.length > 1) return;

    const anchor = anchors[0];

    if(anchor.target == "_blank"){
        e.preventDefault();
        chrome.runtime.sendMessage({url:anchor.href})
    }
})
