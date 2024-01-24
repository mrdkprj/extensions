const DISTANCE = 20;

const DIRECTION = {
    up:0,
    right:1,
    down:2,
    left:3
}

const ACTION_NAME = {
    MoveForward:"MoveForward",
    MoveBackward:"MoveBackward",
    Download:"Download",
    CloseTab:"CloseTab",
}

const actions = {
    [`${DIRECTION.right}`]:ACTION_NAME.MoveForward,
    [`${DIRECTION.right}${DIRECTION.down}`]:ACTION_NAME.Download,
    [`${DIRECTION.left}`]:ACTION_NAME.MoveBackward,
    [`${DIRECTION.down}${DIRECTION.right}`]:ACTION_NAME.CloseTab,
}

const gesture = {
    initiated:false,
    target:null,
    attached:false,
    start:{x:0, y:0},
    current:{x:0,y:0},
    currentDirection:-1,
    prevDirection:-1,
    href:null,
    history:[],
    actionResolved:true,
}

let enabled = true;
let timer = null;

const scrollTop = () => (document.documentElement && document.documentElement.scrollTop) || (document.body && document.body.scrollTop);

const scrollLeft = () => (document.documentElement && document.documentElement.scrollLeft) || (document.body && document.body.scrollLeft);

chrome.runtime.onMessage.addListener(
    async function(request, sender, sendResponse) {

        if(enabled != request.enabled){
            enabled = request.enabled;
            onEnableChanged();
        }
    }
);

const onEnableChanged = () => {
    if(!enabled){
        clearTimer();
        clearGuesture();
    }
}

const clearGuesture = () => {
    gesture.initiated = false;
    gesture.attached = false;
    gesture.currentDirection = -1;
    gesture.prevDirection = -1;
    gesture.history = []
    gesture.actionResolved = true;
}

const clearTimer = () => {
    if(timer){
        clearTimeout(timer)
        timer = null
    }
}

window.addEventListener("mousedown", e => {

    if(!enabled) return;

    if(e.button == 0) return;

    if(!gesture.actionResolved) return;

    e.preventDefault();
    e.stopPropagation();

    gesture.initiated = true;
    gesture.target = e.target;
    gesture.href = e.target.src;
    gesture.history = []

    gesture.start.x = e.pageX - scrollLeft()
    gesture.start.y = e.pageY - scrollTop()

})

const getDirection = (xDiff,yDiff) => {

    if( Math.abs( xDiff ) > Math.abs( yDiff ) ){

        if( xDiff > 0 ){
            return DIRECTION.left;
        }

        return DIRECTION.right;
    }

    if( yDiff > 0 ){
        return DIRECTION.up
    }

    return DIRECTION.down;

}

window.addEventListener("mousemove", e => {

    if(!enabled) return;

    if(!gesture.initiated) return;

    e.preventDefault();

    gesture.current.x = e.pageX - scrollLeft()
    gesture.current.y = e.pageY - scrollTop()

    const xDiff = gesture.start.x - gesture.current.x
    const yDiff = gesture.start.y - gesture.current.y

    if(Math.abs(xDiff) < DISTANCE && Math.abs(yDiff) < DISTANCE){
        return;
    }

    gesture.attached = true;

    gesture.prevDirection = gesture.currentDirection;

    gesture.currentDirection = getDirection(xDiff, yDiff);

    gesture.start.x = gesture.current.x
    gesture.start.y = gesture.current.y

    if(gesture.prevDirection != gesture.currentDirection){
        gesture.history.push(gesture.currentDirection)
    }

})

window.addEventListener("mouseup", async (e) => {

    if(!enabled) return;

    gesture.initiated = false;

    if(e.button == 0 || !gesture.attached) return;

    e.preventDefault();

    const orb = gesture.history.join("")

    const action = actions[orb]

    switch(action){
        case ACTION_NAME.Download:
            gesture.actionResolved = await chrome.runtime.sendMessage({action, url: gesture.href});
            break;
        case ACTION_NAME.CloseTab:
            gesture.actionResolved = await chrome.runtime.sendMessage({action});
            break;
        case ACTION_NAME.MoveBackward:
            history.back();
            break;
        case ACTION_NAME.MoveForward:
            history.forward();
            break;
    }

    clearGuesture();

})

const onContextMenuForLinux = (e) => {

    if(!enabled) return;

    const isLink = (e) => {

        const path = e.composedPath();
        return path && path.some(node => node instanceof HTMLAnchorElement && node.href && !node.href.includes("javascript"))
    }

    const isTextSelected = (e) => {

        const selection = window.getSelection();
        return selection.type === "Range" && (selection.containsNode(e.target) || selection.focusNode.parentNode === e.target)
    }

    if(isTextSelected(e) || isLink(e)){
        clearTimer()
        return;
    }

    if(timer){
        clearTimer()
    }else{
        e.preventDefault();
        timer = setTimeout(() => {
            timer = null;
        }, 500);
    }

}

const onContextMenuForWin = (e) => {

    if(!enabled) return;

    if(gesture.attached){
        e.preventDefault();
    }

}

const platform = navigator.userAgentData ? navigator.userAgentData.platform : navigator.platform

if(platform.includes("Linux")){
    window.addEventListener("contextmenu", onContextMenuForLinux);
}else{
    window.addEventListener("contextmenu", onContextMenuForWin);
}

