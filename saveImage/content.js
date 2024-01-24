window.addEventListener("contextmenu", e => {


    const imgs = e.target.parentElement.querySelectorAll("img");

    if(!imgs.length){
        chrome.runtime.sendMessage({url:null})
        return;
    }

    chrome.runtime.sendMessage({url:imgs[0].src})

})
