chrome.runtime.onMessage.addListener(
    function(message, _sender, sendResponse){
        const text = message.join("\n")
        const data = new Blob([text], {type: 'text/plain'});
        const url = URL.createObjectURL(data);
        sendResponse(url)
    }
);